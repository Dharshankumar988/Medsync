from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
import uuid
from typing import List
from app.repositories.base import BaseRepository
from app.models.notification import Notification

class NotificationRepository(BaseRepository[Notification, dict, dict]):
    async def get_unread(self, db: AsyncSession, user_id: uuid.UUID) -> List[Notification]:
        result = await db.execute(select(Notification).filter(Notification.user_id == user_id, Notification.is_read == False))
        return list(result.scalars().all())

notification_repo = NotificationRepository(Notification)
