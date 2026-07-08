import uuid

from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.schemas.session import AuthenticatedPrincipal

security = HTTPBearer()

async def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(security)
) -> AuthenticatedPrincipal:
    secret = settings.SUPABASE_JWT_SECRET
    if not secret:
        raise UnauthorizedException("Supabase JWT secret is not configured")

    try:
        payload = jwt.decode(token.credentials, secret, algorithms=["HS256"])
        subject: str | None = payload.get("sub")
        if not subject:
            raise UnauthorizedException("Invalid credentials")
    except JWTError:
        raise UnauthorizedException("Invalid credentials")

    app_metadata = payload.get("app_metadata") or {}
    user_metadata = payload.get("user_metadata") or {}
    email = payload.get("email")
    role = str(user_metadata.get("role") or app_metadata.get("role") or payload.get("role") or "patient").lower()
    status = str(user_metadata.get("status") or app_metadata.get("status") or "ACTIVE").upper()

    return AuthenticatedPrincipal(
        id=uuid.UUID(subject),
        email=email,
        role=role,
        status=status,
        full_name=user_metadata.get("full_name") or user_metadata.get("name"),
        app_metadata=app_metadata,
        user_metadata=user_metadata,
    )

class RoleChecker:
    def __init__(self, allowed_roles: list):
        self.allowed_roles = allowed_roles
        
    def __call__(self, user: AuthenticatedPrincipal = Depends(get_current_user)):
        allowed = {getattr(role, "value", role) for role in self.allowed_roles}
        if user.role.upper() not in {str(role).upper() for role in allowed}:
            raise ForbiddenException("Insufficient permissions")
        
        if user.status.upper() == "PENDING":
            raise ForbiddenException("Account pending admin approval")
            
        return user
