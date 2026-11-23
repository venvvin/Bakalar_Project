from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserCreate(BaseModel):
    email: str
    full_name: str
    role: str = "STUDENT"


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class CourseCreate(BaseModel):
    name: str = Field(min_length=1)
    description: str | None = None
    teacher_id: int


class CourseResponse(BaseModel):
    id: int
    name: str
    description: str | None
    teacher_id: int

    model_config = ConfigDict(from_attributes=True)



class AssignmentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)
    course_id: int


class AssignmentResponse(BaseModel):
    id: int
    title: str
    description: str
    course_id: int

    model_config = ConfigDict(from_attributes=True)



from pydantic import Field

class TestCaseCreate(BaseModel):
    input_data: str = ""
    expected_output: str
    points: int = Field(default=1, ge=0)
    is_hidden: bool = False


class TestCaseResponse(BaseModel):
    id: int
    assignment_id: int
    input_data: str
    expected_output: str
    points: int
    is_hidden: bool

    model_config = ConfigDict(from_attributes=True)

from pydantic import BaseModel, EmailStr, Field, ConfigDict


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=100)
    password: str = Field(min_length=12, max_length=128)


class RegisterResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    email_verified: bool

    model_config = ConfigDict(from_attributes=True)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    requires_2fa: bool = False


class CurrentUserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    email_verified: bool


class InvitationCreate(BaseModel):
    email: EmailStr


class InvitationResponse(BaseModel):
    id: int
    course_id: int
    email: EmailStr
    status: str
    expires_at: datetime


class InvitationAccept(BaseModel):
    token: str = Field(min_length=1)


MAX_SUBMISSION_BYTES = 1_000_000


class SubmissionCreate(BaseModel):
    code: str = Field(min_length=1)


class SubmissionResponse(BaseModel):
    id: int
    assignment_id: int
    code: str
    status: str
    submitted_at: datetime

    model_config = ConfigDict(from_attributes=True)