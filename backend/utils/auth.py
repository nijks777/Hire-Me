import jwt
from datetime import datetime, timedelta
from typing import Optional
from app.config import settings

def verify_token(token: str) -> Optional[dict]:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def extract_user_id(authorization: str) -> Optional[str]:
    """Extract user ID from Authorization header"""
    if not authorization:
        return None

    # Remove "Bearer " prefix
    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)

    if payload:
        return payload.get("userId")
    return None
