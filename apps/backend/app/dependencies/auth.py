import uuid
import logging
import httpx

from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, jwk
from jose.utils import base64url_decode
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies.db import get_db
from app.models.user import User
from app.core.config import settings
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.schemas.session import AuthenticatedPrincipal

logger = logging.getLogger("medsync.auth")

security = HTTPBearer()

# ── JWKS Cache ──
# Cache the JWKS keys in-memory so we don't hit the endpoint on every request.
_jwks_cache: dict | None = None


def _get_jwks() -> dict:
    """Fetch and cache the JWKS from Supabase."""
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache

    supabase_url = settings.SUPABASE_URL
    if not supabase_url:
        raise UnauthorizedException("SUPABASE_URL is not configured")

    jwks_url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    try:
        response = httpx.get(jwks_url, timeout=10.0)
        response.raise_for_status()
        _jwks_cache = response.json()
        logger.info(f"JWKS fetched successfully from {jwks_url}")
        return _jwks_cache
    except Exception as e:
        logger.error(f"Failed to fetch JWKS from {jwks_url}: {e}")
        raise UnauthorizedException("Unable to fetch authentication keys")


def _get_signing_key(token: str) -> tuple[dict, str]:
    """
    Extract the signing key from JWKS that matches the token's kid header.
    Returns (jwk_key_dict, algorithm).
    """
    import json, base64

    # Decode the token header
    header_b64 = token.split(".")[0]
    header_b64 += "=" * (-len(header_b64) % 4)
    header = json.loads(base64.urlsafe_b64decode(header_b64))

    token_kid = header.get("kid")
    token_alg = header.get("alg", "RS256")

    jwks = _get_jwks()

    for key in jwks.get("keys", []):
        if key.get("kid") == token_kid:
            return key, token_alg

    raise UnauthorizedException(f"No matching signing key found for kid={token_kid}")


async def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> AuthenticatedPrincipal:
    try:
        signing_key, algorithm = _get_signing_key(token.credentials)

        payload = jwt.decode(
            token.credentials,
            signing_key,
            algorithms=[algorithm],
            audience="authenticated",
            options={"verify_aud": False}
        )
        subject: str | None = payload.get("sub")
        if not subject:
            logger.warning("JWT valid but missing 'sub' claim")
            raise UnauthorizedException("Invalid credentials")
    except UnauthorizedException:
        raise
    except Exception as e:
        logger.warning(f"JWT decode failed: {repr(e)}")
        raise UnauthorizedException("Invalid credentials")

    try:
        user_uuid = uuid.UUID(subject)
    except ValueError:
        raise UnauthorizedException("Invalid user ID format in token")

    db_user = await db.execute(select(User).where(User.id == user_uuid))
    db_user = db_user.scalar_one_or_none()

    if not db_user:
        from app.database.session import db_url
        if "sqlite" in str(db_url):
            from app.models.user import UserRole, UserStatus
            # Mock the user based on the role in the JWT token or default to patient
            user_metadata = payload.get("user_metadata") or {}
            role_str = payload.get("role", user_metadata.get("role", "patient")).upper()
            try:
                role = UserRole[role_str]
            except KeyError:
                role = UserRole.PATIENT

            db_user = User(
                id=user_uuid,
                email=payload.get("email") or f"mock_{user_uuid}@example.com",
                password_hash="mock",
                role=role,
                status=UserStatus.ACTIVE,
                is_verified=True
            )
            db.add(db_user)
            await db.commit()
            logger.info(f"Auto-created mock user {user_uuid} for SQLite local dev")
        else:
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

