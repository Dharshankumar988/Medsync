import uuid
from pydantic import BaseModel
from datetime import datetime
from app.models.payment import PaymentMethod, PaymentStatus

class PaymentCreate(BaseModel):
    order_id: uuid.UUID
    amount: float
    method: PaymentMethod

class PaymentResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    amount: float
    status: PaymentStatus
    method: PaymentMethod
    transaction_id: str | None
    created_at: datetime
    
    model_config = {"from_attributes": True}
