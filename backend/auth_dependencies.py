from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from database import get_db
from models import User, UserRole
from security import decode_access_token

bearer = HTTPBearer()

def current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)) -> User:
    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise HTTPException(401, 'Invalid or expired token')
    user = db.get(User, user_id)
    if user is None or not user.email_verified:
        raise HTTPException(401, 'User not found or not verified')
    return user

def require_teacher(user: User = Depends(current_user)) -> User:
    if user.role != UserRole.TEACHER:
        raise HTTPException(403, 'Teacher access required')
    return user

def require_student(user: User = Depends(current_user)) -> User:
    if user.role != UserRole.STUDENT:
        raise HTTPException(403, 'Student access required')
    return user
