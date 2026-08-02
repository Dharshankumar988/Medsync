import uuid
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
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
    is_pinned: bool
    created_at: datetime
    
    model_config = {"from_attributes": True}

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: Optional[uuid.UUID] = None

class ChatResponse(BaseModel):
    session_id: uuid.UUID
    reply: str

class SessionPinRequest(BaseModel):
    is_pinned: bool

class AIHealthComponentResponse(BaseModel):
    groq: str
    hf_spaces: Any
    rag: str

class AIHealthResponse(BaseModel):
    status: str
    components: AIHealthComponentResponse

class ImageAnalysisResponse(BaseModel):
    yolo: Dict[str, Any]
    efficientnet: Dict[str, Any]
    clinical_summary: Optional[str] = None
