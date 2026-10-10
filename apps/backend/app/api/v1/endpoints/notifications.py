import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user
from app.schemas.response import APIResponse
from app.schemas.session import AuthenticatedPrincipal
from app.schemas.notification import NotificationResponse, NotificationActionResponse
from app.services.notification import NotificationService

router = APIRouter()


@router.get("", response_model=APIResponse[List[NotificationResponse]])
@router.get("/", response_model=APIResponse[List[NotificationResponse]], include_in_schema=False)
async def list_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
):
    notifs = await NotificationService.get_user_notifications(
        db, current_user.id, unread_only=unread_only, limit=limit
    )
    validated = [NotificationResponse.model_validate(n) for n in notifs]
    return APIResponse(message="Notifications fetched", data=validated)


@router.get("/unread", response_model=APIResponse[List[NotificationResponse]])
async def get_unread(
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
):
    notifs = await NotificationService.get_user_notifications(
        db, current_user.id, unread_only=True, limit=limit
    )
    validated = [NotificationResponse.model_validate(n) for n in notifs]
    return APIResponse(message="Unread notifications", data=validated)


@router.post("/{notification_id}/read", response_model=APIResponse[NotificationResponse])
async def mark_as_read(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
):
    notif = await NotificationService.mark_as_read(db, notification_id, current_user.id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    return APIResponse(message="Notification marked as read", data=NotificationResponse.model_validate(notif))


@router.post("/read-all", response_model=APIResponse[NotificationActionResponse])
async def mark_all_as_read(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
):
    count = await NotificationService.mark_all_read(db, current_user.id)
    return APIResponse(
        message="All notifications marked as read",
        data=NotificationActionResponse(count=count, message=f"{count} notifications marked as read")
    )


@router.delete("/{notification_id}", response_model=APIResponse[NotificationActionResponse])
async def delete_notification(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
):
    success = await NotificationService.delete_notification(db, notification_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return APIResponse(
        message="Notification deleted",
        data=NotificationActionResponse(count=1, message="Notification deleted successfully")
    )


@router.delete("", response_model=APIResponse[NotificationActionResponse])
@router.delete("/", response_model=APIResponse[NotificationActionResponse], include_in_schema=False)
async def clear_read_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
):
    count = await NotificationService.clear_read_notifications(db, current_user.id)
    return APIResponse(
        message="Read notifications cleared",
        data=NotificationActionResponse(count=count, message=f"{count} read notifications cleared")
    )
