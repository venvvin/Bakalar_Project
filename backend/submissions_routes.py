"""Student submissions: save source code, never execute it here."""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth_dependencies import require_student
from database import get_db
from models import Assignment, CourseEnrollment, Submission, User
from schemas import (
    MAX_SUBMISSION_BYTES,
    SubmissionCreate,
    SubmissionResponse,
)

router = APIRouter(prefix="/api/assignments/{assignment_id}/submissions", tags=["submissions"])


def require_enrolled_assignment(assignment_id: int, student: User, db: Session) -> Assignment:
    assignment = db.get(Assignment, assignment_id)
    if assignment is None:
        raise HTTPException(status_code=404, detail="Assignment not found")

    enrolled = db.scalar(
        select(CourseEnrollment.id).where(
            CourseEnrollment.course_id == assignment.course_id,
            CourseEnrollment.student_id == student.id,
        )
    )
    if enrolled is None:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")
    return assignment


def save_submission(assignment_id: int, student: User, db: Session, code: str) -> Submission:
    if not code.strip():
        raise HTTPException(status_code=422, detail="Code cannot be empty")
    if len(code.encode("utf-8")) > MAX_SUBMISSION_BYTES:
        raise HTTPException(status_code=413, detail="Code exceeds the 1 MB limit")

    submission = Submission(
        assignment_id=assignment_id,
        student_id=student.id,
        code=code,
        status="PENDING",
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


@router.post("", response_model=SubmissionResponse, status_code=201)
def submit_code(
    assignment_id: int,
    data: SubmissionCreate,
    student: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    require_enrolled_assignment(assignment_id, student, db)
    return save_submission(assignment_id, student, db, data.code)


@router.post("/file", response_model=SubmissionResponse, status_code=201)
async def submit_file(
    assignment_id: int,
    file: UploadFile = File(...),
    student: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    require_enrolled_assignment(assignment_id, student, db)
    try:
        raw = await file.read(MAX_SUBMISSION_BYTES + 1)
    finally:
        await file.close()

    if len(raw) > MAX_SUBMISSION_BYTES:
        raise HTTPException(status_code=413, detail="Code exceeds the 1 MB limit")
    if b"\x00" in raw:
        raise HTTPException(status_code=422, detail="Only text source files are accepted")
    try:
        code = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=422, detail="File must be UTF-8 text") from exc
    return save_submission(assignment_id, student, db, code)


@router.get("", response_model=list[SubmissionResponse])
def submission_history(
    assignment_id: int,
    student: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    require_enrolled_assignment(assignment_id, student, db)
    return db.scalars(
        select(Submission)
        .where(Submission.assignment_id == assignment_id, Submission.student_id == student.id)
        .order_by(Submission.submitted_at.desc(), Submission.id.desc())
    ).all()
