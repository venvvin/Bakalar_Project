from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from schemas import LoginRequest, LoginResponse, CurrentUserResponse
from security import verify_password, create_access_token, decode_access_token
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from email_service import send_verification_email
from auth_utils import normalize_email, is_school_email
from database import get_db
from models import User, TeacherAllowlist
from schemas import RegisterRequest, RegisterResponse
from security import hash_password
from email_verification import (
    create_verification_token,
    verify_email_token,
)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED
)
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db)
):
    email = normalize_email(str(data.email))

    # Check allowed email domains
    if not is_school_email(email):
        raise HTTPException(
            status_code=400,
            detail="Email domain is not allowed"
        )

    # Check existing account
    existing_user = db.scalar(
        select(User).where(User.email == email)
    )

    if existing_user is not None:
        raise HTTPException(
            status_code=409,
            detail="Account already exists"
        )

    # Determine role from teacher allowlist
    teacher = db.scalar(
        select(TeacherAllowlist).where(
            TeacherAllowlist.email == email,
            TeacherAllowlist.active.is_(True)
        )
    )

    role = "TEACHER" if teacher else "STUDENT"

    user = User(
        email=email,
        full_name=data.full_name.strip(),
        password_hash=hash_password(data.password),
        role=role,
        email_verified=False
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise
    verification_token = create_verification_token(db, user)
    send_verification_email(
        recipient_email=user.email,
        token=verification_token
    )
    return RegisterResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
        email_verified=user.email_verified
    )

@router.get("/verify-email")
def verify_email(
    token: str,
    db: Session = Depends(get_db)
):
    success = verify_email_token(db, token)

    if not success:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired verification token"
        )

    return {
        "message": "Email successfully verified"
    }

bearer_scheme = HTTPBearer()


@router.post("/login", response_model=LoginResponse)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db)
):
    email = normalize_email(str(data.email))

    user = db.scalar(
        select(User).where(User.email == email)
    )

    if (
        user is None
        or not user.password_hash
        or not verify_password(
            data.password,
            user.password_hash
        )
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not user.email_verified:
        raise HTTPException(
            status_code=403,
            detail="Email is not verified"
        )

    token = create_access_token(user.id)

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        requires_2fa=False
    )


@router.get("/me", response_model=CurrentUserResponse)
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db)
):
    user_id = decode_access_token(
        credentials.credentials
    )

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    user = db.get(User, user_id)

    if user is None or not user.email_verified:
        raise HTTPException(
            status_code=401,
            detail="User not found or not verified"
        )

    return CurrentUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=(
            user.role.value
            if hasattr(user.role, "value")
            else str(user.role)
        ),
        email_verified=user.email_verified
    )
