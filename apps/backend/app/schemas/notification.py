import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class NotificationResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True, from_attributes=True)

    id: uuid.UUID
    title: str
    message: str
    type: str = "INFO"
    is_read: bool = False
    created_at: datetime

class NotificationActionResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    count: int = 0
    message: str = "Success"

class NotificationPreferenceUpdate(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    email_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
