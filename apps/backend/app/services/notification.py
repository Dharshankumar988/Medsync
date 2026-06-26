from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.models.notification import NotificationType
from app.repositories.notification import notification_repo

class NotificationService:
    @staticmethod
    async def send_notification(db: AsyncSession, user_id: uuid.UUID, title: str, message: str, type: NotificationType = NotificationType.IN_APP):
        notif_in = {
            "user_id": user_id,
            "title": title,
            "message": message,
            "type": type
        }
        notif = await notification_repo.create(db, obj_in=notif_in)
        
        # Placeholder for Push/Email
        print(f"NOTIFICATION [{type}]: To User {user_id} - {title}: {message}")
        
        return notif
