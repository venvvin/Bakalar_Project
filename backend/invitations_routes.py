import hashlib
import os
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth_dependencies import current_user, require_teacher
from database import get_db
from models import Course, CourseEnrollment, CourseInvitation, InvitationStatus, User, UserRole
from schemas import InvitationAccept, InvitationCreate, InvitationResponse

router = APIRouter(prefix="/api/invitations", tags=["Invitations"])


def utcnow():
    return datetime.now(timezone.utc)


def as_utc(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def invitation_result(invitation):
    return InvitationResponse(
        id=invitation.id,
        course_id=invitation.course_id,
        email=invitation.email,
        status=invitation.status.value,
        expires_at=invitation.expires_at,
    )


def send_invite(email: str, course_name: str, token: str):
    frontend = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    link = f"{frontend}/invitations/accept?token={quote(token, safe='')}"
    message = EmailMessage()
    message["Subject"] = f"CodeAssess: invitation to {course_name}"
    message["From"] = os.getenv("MAIL_FROM", "no-reply@codeassess.local")
    message["To"] = email
    message.set_content(
        f"You have been invited to course: {course_name}\n\n"
        f"Sign in with {email} and accept your invitation:\n{link}\n\n"
        "This invitation expires in 7 days.\n"
    )
    host = os.getenv("SMTP_HOST", "localhost")
    port = int(os.getenv("SMTP_PORT", "1025"))
    with smtplib.SMTP(host, port, timeout=10) as smtp:
        smtp.send_message(message)


def check_teacher_course(course_id: int, teacher: User, db: Session) -> Course:
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(404, "Course not found")
    if course.teacher_id != teacher.id:
        raise HTTPException(403, "Not your course")
    return course


def create_invitation(course: Course, email: str, teacher: User, db: Session) -> CourseInvitation:
    email = email.strip().lower()
    existing_user = db.scalar(select(User).where(User.email == email))
    if existing_user is not None and existing_user.role != UserRole.STUDENT:
        raise HTTPException(400, "Only students can be invited")
    if existing_user is not None:
        enrollment = db.scalar(select(CourseEnrollment.id).where(
            CourseEnrollment.course_id == course.id,
            CourseEnrollment.student_id == existing_user.id,
        ))
        if enrollment is not None:
            raise HTTPException(409, "Student is already enrolled")

    pending = db.scalars(select(CourseInvitation).where(
        CourseInvitation.course_id == course.id,
        CourseInvitation.email == email,
        CourseInvitation.status == InvitationStatus.PENDING,
    )).all()
    if any(as_utc(item.expires_at) > utcnow() for item in pending):
        raise HTTPException(409, "Active invitation already exists")

    token = secrets.token_urlsafe(32)
    invitation = CourseInvitation(
        course_id=course.id,
        email=email,
        invited_by_id=teacher.id,
        token_hash=hashlib.sha256(token.encode()).hexdigest(),
        status=InvitationStatus.PENDING,
        expires_at=utcnow() + timedelta(days=7),
    )
    db.add(invitation)
    try:
        db.flush()
        send_invite(email, course.name, token)
        db.commit()
        db.refresh(invitation)
    except (OSError, smtplib.SMTPException) as exc:
        db.rollback()
        raise HTTPException(503, "Could not send invitation email; check Mailpit SMTP") from exc
    except Exception:
        db.rollback()
        raise
    return invitation


@router.post("/courses/{course_id}", response_model=InvitationResponse, status_code=201)
def invite_student(
    course_id: int,
    data: InvitationCreate,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    course = check_teacher_course(course_id, teacher, db)
    invitation = create_invitation(course, str(data.email), teacher, db)
    return invitation_result(invitation)


@router.get("/courses/{course_id}", response_model=list[InvitationResponse])
def list_invitations(
    course_id: int,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    check_teacher_course(course_id, teacher, db)
    invitations = db.scalars(select(CourseInvitation).where(
        CourseInvitation.course_id == course_id
    ).order_by(CourseInvitation.id.desc())).all()
    return [invitation_result(item) for item in invitations]


@router.post("/accept")
def accept_invitation(
    data: InvitationAccept,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if user.role != UserRole.STUDENT:
        raise HTTPException(403, "Only students can accept invitations")
    token_hash = hashlib.sha256(data.token.encode()).hexdigest()
    invitation = db.scalar(select(CourseInvitation).where(
        CourseInvitation.token_hash == token_hash
    ).with_for_update())
    if invitation is None:
        raise HTTPException(404, "Invitation not found")
    if invitation.email.lower() != user.email.lower():
        raise HTTPException(403, "Invitation belongs to another email")
    if invitation.status != InvitationStatus.PENDING:
        raise HTTPException(409, "Invitation is no longer pending")
    if as_utc(invitation.expires_at) <= utcnow():
        raise HTTPException(410, "Invitation expired")

    existing = db.scalar(select(CourseEnrollment.id).where(
        CourseEnrollment.course_id == invitation.course_id,
        CourseEnrollment.student_id == user.id,
    ))
    if existing is None:
        db.add(CourseEnrollment(course_id=invitation.course_id, student_id=user.id))
    invitation.status = InvitationStatus.ACCEPTED
    invitation.accepted_at = utcnow()
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Enrollment conflict; refresh and retry") from exc
    return {"status": "ACCEPTED", "course_id": invitation.course_id}


class BulkInviteRequest(BaseModel):
    emails: list[EmailStr] = Field(min_length=1, max_length=50)


@router.post("/courses/{course_id}/bulk")
def invite_students_bulk(
    course_id: int,
    data: BulkInviteRequest,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    course = check_teacher_course(course_id, teacher, db)
    unique_emails = list(dict.fromkeys(str(email).strip().lower() for email in data.emails))
    results = []
    for email in unique_emails:
        try:
            invitation = create_invitation(course, email, teacher, db)
            results.append({
                "email": email,
                "status": "sent",
                "invitation_id": invitation.id,
            })
        except HTTPException as exc:
            db.rollback()
            results.append({
                "email": email,
                "status": "failed",
                "reason": str(exc.detail),
            })
    return {
        "total": len(unique_emails),
        "sent": sum(item["status"] == "sent" for item in results),
        "failed": sum(item["status"] == "failed" for item in results),
        "results": results,
    }
