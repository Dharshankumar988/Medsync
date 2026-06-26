import uuid
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.models.ai_chat import AIChatRole

class AIChatMessageBase(BaseModel):
    role: AIChatRole
    content: str

class AIChatMessageResponse(AIChatMessageBase):
    id: uuid.UUID
    created_at: datetime
    model_used: Optional[str] = None
    
    model_config = {"from_attributes": True}

class AIChatSessionCreate(BaseModel):
    title: Optional[str] = "New Conversation"

class AIChatSessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    is_doctor_mode: bool
    created_at: datetime
    
    model_config = {"from_attributes": True}

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[uuid.UUID] = None

class ChatResponse(BaseModel):
    session_id: uuid.UUID
    reply: str
