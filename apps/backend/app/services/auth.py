from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.exceptions import UnauthorizedException, DomainException
from app.repositories.user import user_repo
from app.schemas.auth import LoginRequest, UserRegistration, Token
from app.models.user import UserRole, UserStatus

class AuthService:
    @staticmethod
    async def register_user(db: AsyncSession, req: UserRegistration):
        existing = await user_repo.get_by_email(db, req.email)
        if existing:
            raise DomainException("Email already registered")
        
        status = UserStatus.ACTIVE
        if req.role in [UserRole.DOCTOR, UserRole.PHARMACY]:
            status = UserStatus.PENDING

        user_in = {
            "email": req.email,
            "password_hash": get_password_hash(req.password),
            "role": req.role,
            "status": status
        }
        
        user = await user_repo.create(db, obj_in=user_in)
        
        # Additional logic (e.g. creating Profile rows) would go here
        
        return user

    @staticmethod
    async def authenticate_user(db: AsyncSession, req: LoginRequest) -> Token:
        user = await user_repo.get_by_email(db, req.email)
        if not user or not verify_password(req.password, user.password_hash):
            raise UnauthorizedException("Incorrect email or password")
        
        if user.status == UserStatus.SUSPENDED:
            raise UnauthorizedException("Account suspended")
            
        token = create_access_token(subject=str(user.id), role=user.role.value, status=user.status.value)
        return Token(access_token=token, token_type="bearer", role=user.role, status=user.status.value)
