import os
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")
password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(
    password: str,
    password_hash: str
) -> bool:
    return password_hasher.verify(
        password,
        password_hash
    )

JWT_SECRET = os.getenv("JWT_SECRET")

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 30


def create_access_token(user_id: int) -> str:
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET is not configured")

    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_MINUTES),
        "type": "access",
    }

    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )


def decode_access_token(token: str) -> int | None:
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET is not configured")

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )

        if payload.get("type") != "access":
            return None

        return int(payload["sub"])

    except (jwt.PyJWTError, ValueError, KeyError, TypeError):
        return None
