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
    patient_id: Optional[uuid.UUID] = None

class ChatResponse(BaseModel):
    session_id: uuid.UUID
    reply: str

class SessionPinRequest(BaseModel):
    is_pinned: bool

class SessionRenameRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)

class AIHealthComponentResponse(BaseModel):
    groq: str
    hf_spaces: Any
    rag: str

class AIHealthResponse(BaseModel):
    status: str
    components: AIHealthComponentResponse

class ImageAnalysisRequest(BaseModel):
    scan_type: str = Field(default="bone", description="Type of scan: bone, brain, kidney, skin")

class ImageAnalysisResponse(BaseModel):
    session_id: Optional[uuid.UUID] = None
    scan_type: str
    prediction: Dict[str, Any]
    clinical_summary: Optional[Dict[str, Any]] = None
    patient_explanation: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

class GroqClinicalSummary(BaseModel):
    summary: str = "Analysis completed"
    model_interpretation: str = "Pending"
    confidence_context: str = "Unavailable"
    key_findings: List[str] = []
    possible_considerations: List[str] = []
    recommended_next_steps: List[str] = []
    questions_for_clinician: List[str] = []
    urgency: str = "routine"
    disclaimer: str = "For educational purposes only."

class GroqPatientExplanation(BaseModel):
    summary: str = "Your scan has been analyzed."
    model_interpretation: str = "Pending"
    confidence_context: str = "Unavailable"
    key_findings: List[str] = []
    possible_considerations: List[str] = []
    recommended_next_steps: List[str] = []
    questions_for_clinician: List[str] = []
    urgency: str = "routine"
    disclaimer: str = "This information is for educational purposes only and does not constitute medical advice."

class HFInferenceOutput(BaseModel):
    success: bool = True
    confidence: float = Field(ge=0.0, le=1.0, default=0.0)
    diagnosis: Optional[str] = None
    predicted_class: Optional[str] = None
    top_predictions: Optional[List[Dict[str, Any]]] = None
    boxes: Optional[List[Any]] = None
