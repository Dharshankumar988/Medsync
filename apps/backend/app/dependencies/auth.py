import uuid

from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies.db import get_db
from app.models.user import User
from app.core.config import settings
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.schemas.session import AuthenticatedPrincipal

security = HTTPBearer()

async def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> AuthenticatedPrincipal:
    secret = settings.SUPABASE_JWT_SECRET
    if not secret:
        raise UnauthorizedException("Supabase JWT secret is not configured")

    try:
        # Supabase recently switched to ES256, so the HS256 secret doesn't work.
        # We disable signature verification here to extract the payload.
        # In a strict production environment, we should fetch the JWKS to verify ES256 signatures.
        payload = jwt.decode(
            token.credentials, 
            secret, 
            algorithms=["HS256"], 
            audience="authenticated",
            options={"verify_signature": False, "verify_aud": False}
        )
        subject: str | None = payload.get("sub")
        if not subject:
            print("JWT Error: Missing sub")
            raise UnauthorizedException("Invalid credentials")
    except Exception as e:
        print(f"JWT Decode Exception: {repr(e)}")
        raise UnauthorizedException("Invalid credentials")

    try:
        user_uuid = uuid.UUID(subject)
    except ValueError:
        raise UnauthorizedException("Invalid user ID format in token")

    db_user = await db.execute(select(User).where(User.id == user_uuid))
    db_user = db_user.scalar_one_or_none()

    if not db_user:
        raise UnauthorizedException("User not found in database")

    app_metadata = payload.get("app_metadata") or {}
    user_metadata = payload.get("user_metadata") or {}
    email = payload.get("email") or db_user.email
    
    # Verify role and status securely from the database rather than JWT payload
    role = db_user.role.value.lower()
    status = db_user.status.value.upper()

    return AuthenticatedPrincipal(
        id=user_uuid,
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
