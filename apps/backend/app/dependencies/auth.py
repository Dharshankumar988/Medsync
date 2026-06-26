from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.database.session import get_db
from app.models.user import User
from app.repositories.user import user_repo

security = HTTPBearer()

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    try:
        payload = jwt.decode(token.credentials, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise UnauthorizedException("Invalid credentials")
    except JWTError:
        raise UnauthorizedException("Invalid credentials")
        
    user = await user_repo.get(db, user_id)
    if not user:
        raise UnauthorizedException("User not found")
        
    return user

class RoleChecker:
    def __init__(self, allowed_roles: list):
        self.allowed_roles = allowed_roles
        
    def __call__(self, user: User = Depends(get_current_user)):
        if user.role.value not in self.allowed_roles:
            raise ForbiddenException("Insufficient permissions")
        
        if user.status.value == "PENDING":
            raise ForbiddenException("Account pending admin approval")
            
        return user
