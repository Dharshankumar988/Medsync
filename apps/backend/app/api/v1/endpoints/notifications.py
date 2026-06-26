from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.response import APIResponse
from app.repositories.notification import notification_repo

router = APIRouter()

@router.get("/unread")
async def get_unread(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    notifs = await notification_repo.get_unread(db, current_user.id)
    return APIResponse(message="Unread notifications", data=notifs)
