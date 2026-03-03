from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
import os
import time

import jwt
from jwt import ExpiredSignatureError, InvalidTokenError

from app.database import get_db
from app.models import User
from app.utils.logger import get_logger

logger = get_logger(__name__)

# -------------------------------------------------
# JWT CONFIG (MUST MATCH FLASK AUTH)
# -------------------------------------------------
SECRET_KEY ="5e70f5d49c19a955b86951300631917ecfe40c4da7b02e9f1ad53287eb4fc7f7e20414562b37b862f24fe5244a75b3dc46b9ee70326ab8c703e54e2f8ec35b56"
JWT_ALGORITHM = "HS256"

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is not set")

# Security scheme
security = HTTPBearer(auto_error=False)

# -------------------------------------------------
# AUTH DEPENDENCIES
# -------------------------------------------------
def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user using JWT issued by Flask auth service.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        token = credentials.credentials

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )

        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )

        user = db.query(User).filter(User.user_id == user_id).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is disabled",
            )

        return user

    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    except Exception as e:
        logger.error(f"Authentication error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Return user if authenticated, else None.
    """
    if credentials is None:
        return None
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )
    return current_user


def get_current_superuser(
    current_user: User = Depends(get_current_user)
) -> User:
    # Extend later for RBAC / admin roles
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )
    return current_user

# -------------------------------------------------
# LOGGING MIDDLEWARE
# -------------------------------------------------
async def log_request_middleware(request: Request, call_next):
    start_time = time.time()

    ip_address = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000

        logger.info(
            f"{request.method} {request.url.path} - {response.status_code}",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": process_time,
                "ip_address": ip_address,
                "user_agent": user_agent,
            }
        )
        return response

    except Exception as e:
        process_time = (time.time() - start_time) * 1000
        logger.error(
            f"{request.method} {request.url.path} - ERROR",
            exc_info=True,
            extra={
                "method": request.method,
                "path": request.url.path,
                "duration_ms": process_time,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "error": str(e),
            }
        )
        raise

# -------------------------------------------------
# RATE LIMITING
# -------------------------------------------------
class RateLimiter:
    """
    Simple in-memory rate limiter.
    (Use Redis in production)
    """
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests = {}

    async def __call__(self, request: Request):
        client_ip = request.client.host if request.client else "unknown"
        current_time = time.time()

        minute_ago = current_time - 60
        self.requests[client_ip] = [
            t for t in self.requests.get(client_ip, []) if t > minute_ago
        ]

        if len(self.requests[client_ip]) >= self.requests_per_minute:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
                headers={"Retry-After": "60"},
            )

        self.requests.setdefault(client_ip, []).append(current_time)
        return True


rate_limit_public = RateLimiter(30)
rate_limit_auth = RateLimiter(60)
rate_limit_strict = RateLimiter(10)

# -------------------------------------------------
# OWNERSHIP VALIDATION
# -------------------------------------------------
def verify_user_owns_competitor(
    competitor_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.models import Competitor
    from uuid import UUID

    try:
        competitor_uuid = UUID(competitor_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid competitor ID format"
        )

    competitor = db.query(Competitor).filter(
        Competitor.id == competitor_uuid,
        Competitor.user_id == current_user.user_id,
        Competitor.is_active == True
    ).first()

    if not competitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitor not found or access denied"
        )

    return competitor

# -------------------------------------------------
# PAGINATION
# -------------------------------------------------
class PaginationParams:
    def __init__(self, page: int = 1, per_page: int = 20, max_per_page: int = 100):
        self.page = max(1, page)
        self.per_page = min(max(1, per_page), max_per_page)
        self.skip = (self.page - 1) * self.per_page
        self.limit = self.per_page

    def dict(self):
        return {
            "page": self.page,
            "per_page": self.per_page,
            "skip": self.skip,
            "limit": self.limit
        }


standard_pagination = PaginationParams()
large_pagination = PaginationParams(per_page=100)

# -------------------------------------------------
# DATABASE HEALTH
# -------------------------------------------------
def check_db_health(db: Session = Depends(get_db)):
    try:
        db.execute("SELECT 1")
        return {"database": "healthy"}
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed"
        )

# -------------------------------------------------
# API KEY AUTH (SERVICE-TO-SERVICE)
# -------------------------------------------------
def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    from app.config import settings

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required"
        )

    if credentials.credentials != settings.SCRAPECREATORS_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )

    return {"authenticated": True}

# -------------------------------------------------
# REQUEST ID
# -------------------------------------------------
async def add_request_id(request: Request, call_next):
    import uuid
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


def get_request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")
