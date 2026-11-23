from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from submissions_routes import router as submissions_router
from auth_dependencies import current_user, require_teacher
from auth_routes import router as auth_router
from database import engine, get_db
from invitations_routes import router as invitations_router
from models import Assignment, Course, CourseEnrollment, TestCase, User, UserRole
from schemas import (
    AssignmentCreate, AssignmentResponse, CourseCreate, CourseResponse,
    TestCaseCreate, TestCaseResponse, UserCreate, UserResponse,
)

app = FastAPI(title="Bakalarka API")
app.include_router(auth_router)
app.include_router(invitations_router)
app.include_router(submissions_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174",
                   "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def allowed_course(course_id: int, user: User, db: Session) -> Course:
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(404, "Course not found")
    if user.role == UserRole.TEACHER and course.teacher_id == user.id:
        return course
    if user.role == UserRole.STUDENT:
        enrolled = db.scalar(select(CourseEnrollment.id).where(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.student_id == user.id,
        ))
        if enrolled is not None:
            return course
    raise HTTPException(403, "No access to this course")


def owned_course(course_id: int, teacher: User, db: Session) -> Course:
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(404, "Course not found")
    if course.teacher_id != teacher.id:
        raise HTTPException(403, "Not your course")
    return course


@app.get("/")
def home():
    return {"message": "Bakalarka backend works!"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/db-check")
def check_database():
    with engine.connect() as connection:
        database_name = connection.execute(text("SELECT current_database()")).scalar()
    return {"status": "connected", "database": database_name}


@app.post("/api/users", response_model=UserResponse, status_code=201)
def create_user(data: UserCreate, teacher: User = Depends(require_teacher), db: Session = Depends(get_db)):
    # Legacy endpoint: never allow role assignment or account creation without verification.
    raise HTTPException(403, "Use /api/auth/register for account creation")


@app.get("/api/users", response_model=list[UserResponse])
def get_users(teacher: User = Depends(require_teacher), db: Session = Depends(get_db)):
    # Only students enrolled in the teacher's courses are visible.
    return db.scalars(
        select(User).join(CourseEnrollment, CourseEnrollment.student_id == User.id)
        .join(Course, Course.id == CourseEnrollment.course_id)
        .where(Course.teacher_id == teacher.id).distinct().order_by(User.id)
    ).all()


@app.post("/api/courses", response_model=CourseResponse, status_code=201)
def create_course(data: CourseCreate, teacher: User = Depends(require_teacher), db: Session = Depends(get_db)):
    # teacher_id in legacy schema is ignored: identity comes from the JWT.
    course = Course(name=data.name, description=data.description, teacher_id=teacher.id)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@app.get("/api/courses", response_model=list[CourseResponse])
def get_courses(user: User = Depends(current_user), db: Session = Depends(get_db)):
    query = select(Course)
    if user.role == UserRole.TEACHER:
        query = query.where(Course.teacher_id == user.id)
    else:
        query = query.join(CourseEnrollment).where(CourseEnrollment.student_id == user.id)
    return db.scalars(query.order_by(Course.id)).all()


@app.get("/api/courses/{course_id}", response_model=CourseResponse)
def get_course(course_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return allowed_course(course_id, user, db)


@app.get("/api/courses/{course_id}/assignments", response_model=list[AssignmentResponse])
def get_course_assignments(course_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    allowed_course(course_id, user, db)
    return db.scalars(select(Assignment).where(Assignment.course_id == course_id).order_by(Assignment.id)).all()


@app.post("/api/assignments", response_model=AssignmentResponse, status_code=201)
def create_assignment(data: AssignmentCreate, teacher: User = Depends(require_teacher), db: Session = Depends(get_db)):
    owned_course(data.course_id, teacher, db)
    assignment = Assignment(title=data.title, description=data.description, course_id=data.course_id)
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@app.get("/api/assignments", response_model=list[AssignmentResponse])
def get_all_assignments(user: User = Depends(current_user), db: Session = Depends(get_db)):
    query = select(Assignment).join(Course, Course.id == Assignment.course_id)
    if user.role == UserRole.TEACHER:
        query = query.where(Course.teacher_id == user.id)
    else:
        query = query.join(CourseEnrollment, CourseEnrollment.course_id == Course.id).where(
            CourseEnrollment.student_id == user.id)
    return db.scalars(query.order_by(Assignment.id.desc())).all()


@app.post("/api/assignments/{assignment_id}/tests", response_model=TestCaseResponse, status_code=201)
def create_test_case(assignment_id: int, data: TestCaseCreate, teacher: User = Depends(require_teacher), db: Session = Depends(get_db)):
    assignment = db.get(Assignment, assignment_id)
    if assignment is None:
        raise HTTPException(404, "Assignment not found")
    owned_course(assignment.course_id, teacher, db)
    test_case = TestCase(assignment_id=assignment_id, input_data=data.input_data,
                         expected_output=data.expected_output, points=data.points, is_hidden=data.is_hidden)
    db.add(test_case)
    db.commit()
    db.refresh(test_case)
    return test_case


@app.get("/api/assignments/{assignment_id}/tests", response_model=list[TestCaseResponse])
def get_test_cases(assignment_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    assignment = db.get(Assignment, assignment_id)
    if assignment is None:
        raise HTTPException(404, "Assignment not found")
    allowed_course(assignment.course_id, user, db)
    query = select(TestCase).where(TestCase.assignment_id == assignment_id)
    if user.role == UserRole.STUDENT:
        # Do not expose hidden test inputs/expected outputs to students.
        query = query.where(TestCase.is_hidden.is_(False))
    return db.scalars(query.order_by(TestCase.id)).all()


@app.get("/api/assignments/{assignment_id}", response_model=AssignmentResponse)
def get_assignment(assignment_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    assignment = db.get(Assignment, assignment_id)
    if assignment is None:
        raise HTTPException(404, "Assignment not found")
    allowed_course(assignment.course_id, user, db)
    return assignment
