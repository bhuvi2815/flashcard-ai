"""
auth_utils.py - Password hashing + JWT tokens
"""

from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Hash password, truncate at 72 bytes for bcrypt."""
    pwd_safe = plain_password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
    return pwd_context.hash(pwd_safe)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash, truncate at 72 bytes."""
    pwd_safe = plain_password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
    return pwd_context.verify(pwd_safe, hashed_password)


def create_access_token(user_id: str) -> str:
    """Create JWT token."""
    expire_time = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": user_id, "exp": expire_time}
    token = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return token


def decode_access_token(token: str) -> str | None:
    """Decode JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload.get("sub")
    except JWTError:
        return None