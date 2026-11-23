
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from models import EmailVerificationToken, User


TOKEN_LIFETIME_MINUTES = 15


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_verification_token(
    db: Session,
    user: User
) -> str:
    # Generate a cryptographically secure token
    token = secrets.token_urlsafe(32)

    # Remove previous tokens for this user
    db.execute(
        delete(EmailVerificationToken).where(
            EmailVerificationToken.user_id == user.id
        )
    )

    verification = EmailVerificationToken(
        user_id=user.id,
        token_hash=hash_token(token),
        expires_at=datetime.now(timezone.utc)
        + timedelta(minutes=TOKEN_LIFETIME_MINUTES)
    )

    db.add(verification)
    db.commit()

    return token


def verify_email_token(
    db: Session,
    token: str
) -> bool:
    token_hash = hash_token(token)

    verification = db.scalar(
        select(EmailVerificationToken).where(
            EmailVerificationToken.token_hash == token_hash
        )
    )

    if verification is None:
        return False

    expires_at = verification.expires_at

    # PostgreSQL may return a timezone-aware datetime
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) > expires_at:
        db.delete(verification)
        db.commit()
        return False

    user = db.get(User, verification.user_id)

    if user is None:
        return False

    user.email_verified = True
    db.delete(verification)
    db.commit()

    return True
