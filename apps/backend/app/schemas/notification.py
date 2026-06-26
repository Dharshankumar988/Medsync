import uuid
from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from app.models.notification import NotificationType

class NotificationResponse(BaseModel):
    id: uuid.UUID
    title: str
    message: str
    type: NotificationType
    is_read: bool
    created_at: datetime
    
    model_config = {"from_attributes": True}

class NotificationPreferenceUpdate(BaseModel):
    email_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
