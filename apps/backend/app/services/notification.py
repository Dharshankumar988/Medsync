import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, update, delete
from app.models.notification import Notification
from app.repositories.notification import notification_repo


class NotificationService:
    @staticmethod
    async def send_notification(
        db: AsyncSession,
        user_id: uuid.UUID,
        title: str,
        message: str,
        type: str = "INFO"
    ) -> Notification:
        """
        Sends an in-app notification with deduplication to prevent buggy duplicate alerts.
        """
        # Deduplication check: if an identical notification was sent in the last 60 seconds, do not re-send
        cutoff = datetime.utcnow() - timedelta(seconds=60)
        stmt = (
            select(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.title == title,
                Notification.message == message,
                Notification.created_at >= cutoff
            )
            .limit(1)
        )
        res = await db.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            return existing

        notif = Notification(
            id=uuid.uuid4(),
            user_id=user_id,
            title=title,
            message=message,
            type=str(type),
            is_read=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(notif)
        await db.commit()
        await db.refresh(notif)

        print(f"NOTIFICATION [{type}]: To User {user_id} - {title}: {message}")
        return notif

    @staticmethod
    async def get_user_notifications(
        db: AsyncSession,
        user_id: uuid.UUID,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Notification]:
        stmt = select(Notification).where(Notification.user_id == user_id)
        if unread_only:
            stmt = stmt.where(Notification.is_read == False)
        stmt = stmt.order_by(Notification.created_at.desc()).limit(limit)
        res = await db.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def mark_as_read(
        db: AsyncSession,
        notification_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> Optional[Notification]:
        stmt = select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id
        )
        res = await db.execute(stmt)
        notif = res.scalar_one_or_none()
        if notif:
            notif.is_read = True
            await db.commit()
            await db.refresh(notif)
        return notif

    @staticmethod
    async def mark_all_read(db: AsyncSession, user_id: uuid.UUID) -> int:
        stmt = (
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)
            .values(is_read=True)
        )
        res = await db.execute(stmt)
        await db.commit()
        return res.rowcount

    @staticmethod
    async def delete_notification(
        db: AsyncSession,
        notification_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> bool:
        stmt = delete(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id
        )
        res = await db.execute(stmt)
        await db.commit()
        return res.rowcount > 0

    @staticmethod
    async def clear_read_notifications(db: AsyncSession, user_id: uuid.UUID) -> int:
        stmt = delete(Notification).where(
            Notification.user_id == user_id,
            Notification.is_read == True
        )
        res = await db.execute(stmt)
        await db.commit()
        return res.rowcount
