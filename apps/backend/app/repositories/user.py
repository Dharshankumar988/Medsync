from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.repositories.base import BaseRepository
from app.models.user import User
from app.schemas.user import UserCreate, UserBase

class UserRepository(BaseRepository[User, UserCreate, UserBase]):
    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(select(User).filter(User.email == email))
        return result.scalars().first()

user_repo = UserRepository(User)
