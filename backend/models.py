
import enum
from datetime import datetime

from sqlalchemy import (
    String,
    Text,
    ForeignKey,
    DateTime,
    Enum,
    func,
    Integer,
    Boolean,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    TEACHER = "TEACHER"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)

    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False
    )

    full_name: Mapped[str] = mapped_column(String(255))

    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole), default=UserRole.STUDENT
    )

    password_hash: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )

    email_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false"
    )

    courses: Mapped[list["Course"]] = relationship(
        back_populates="teacher"
    )

    submissions: Mapped[list["Submission"]] = relationship(
        back_populates="student"
    )

    enrollments: Mapped[list["CourseEnrollment"]] = relationship(
        back_populates="student"
    )

    sent_invitations: Mapped[list["CourseInvitation"]] = relationship(
        back_populates="invited_by"
    )


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(String(255))

    description: Mapped[str | None] = mapped_column(Text)

    teacher_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )

    teacher: Mapped["User"] = relationship(
        back_populates="courses"
    )

    assignments: Mapped[list["Assignment"]] = relationship(
        back_populates="course"
    )

    enrollments: Mapped[list["CourseEnrollment"]] = relationship(
        back_populates="course"
    )

    invitations: Mapped[list["CourseInvitation"]] = relationship(
        back_populates="course"
    )


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(primary_key=True)

    title: Mapped[str] = mapped_column(String(255))

    description: Mapped[str] = mapped_column(Text)

    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id"), nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    course: Mapped["Course"] = relationship(
        back_populates="assignments"
    )

    submissions: Mapped[list["Submission"]] = relationship(
        back_populates="assignment"
    )


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(primary_key=True)

    student_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )

    assignment_id: Mapped[int] = mapped_column(
        ForeignKey("assignments.id"), nullable=False
    )

    code: Mapped[str] = mapped_column(Text)

    status: Mapped[str] = mapped_column(
        String(30), default="PENDING"
    )

    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    student: Mapped["User"] = relationship(
        back_populates="submissions"
    )

    assignment: Mapped["Assignment"] = relationship(
        back_populates="submissions"
    )


class TestCase(Base):
    __tablename__ = "test_cases"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True
    )

    assignment_id: Mapped[int] = mapped_column(
        ForeignKey("assignments.id"),
        nullable=False,
        index=True
    )

    input_data: Mapped[str] = mapped_column(
        Text, nullable=False, default=""
    )

    expected_output: Mapped[str] = mapped_column(
        Text, nullable=False
    )

    points: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1
    )

    is_hidden: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )


class TeacherAllowlist(Base):
    __tablename__ = "teacher_allowlist"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )

    active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    token_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )


# ============================================
# COURSE ENROLLMENTS
# ============================================

class CourseEnrollment(Base):
    __tablename__ = "course_enrollments"

    __table_args__ = (
        UniqueConstraint(
            "course_id",
            "student_id",
            name="uq_course_student"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    student_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    course: Mapped["Course"] = relationship(
        back_populates="enrollments"
    )

    student: Mapped["User"] = relationship(
        back_populates="enrollments"
    )


# ============================================
# COURSE INVITATIONS
# ============================================

class InvitationStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REVOKED = "REVOKED"


class CourseInvitation(Base):
    __tablename__ = "course_invitations"

    id: Mapped[int] = mapped_column(primary_key=True)

    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True
    )

    invited_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
    )

    token_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False
    )

    status: Mapped[InvitationStatus] = mapped_column(
        Enum(InvitationStatus),
        default=InvitationStatus.PENDING,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

    accepted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    course: Mapped["Course"] = relationship(
        back_populates="invitations"
    )

    invited_by: Mapped["User"] = relationship(
        back_populates="sent_invitations"
    )

class TestResult(Base):
    __tablename__ = "test_results"

    id: Mapped[int] = mapped_column(primary_key=True)

    submission_id: Mapped[int] = mapped_column(
        ForeignKey("submissions.id"),
        nullable=False
    )

    test_case_id: Mapped[int] = mapped_column(
        ForeignKey("test_cases.id"),
        nullable=False
    )

    passed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    actual_output: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )

    earned_points: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
