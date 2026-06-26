from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid
from app.repositories.base import BaseRepository
from app.models.ai_chat import AIChatSession, AIChatMessage

class AIChatSessionRepository(BaseRepository[AIChatSession, dict, dict]):
    async def get_by_user(self, db: AsyncSession, user_id: uuid.UUID) -> List[AIChatSession]:
        result = await db.execute(select(AIChatSession).filter(AIChatSession.user_id == user_id).order_by(AIChatSession.created_at.desc()))
        return list(result.scalars().all())

chat_session_repo = AIChatSessionRepository(AIChatSession)

class AIChatMessageRepository(BaseRepository[AIChatMessage, dict, dict]):
    async def get_by_session(self, db: AsyncSession, session_id: uuid.UUID) -> List[AIChatMessage]:
        result = await db.execute(select(AIChatMessage).filter(AIChatMessage.session_id == session_id).order_by(AIChatMessage.created_at.asc()))
        return list(result.scalars().all())

chat_message_repo = AIChatMessageRepository(AIChatMessage)
