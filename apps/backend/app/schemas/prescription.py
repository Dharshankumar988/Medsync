import uuid
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

class PrescriptionItemBase(BaseModel):
    medicine_name: str
    dosage: str
    frequency: str
    duration_days: int
    instructions: Optional[str] = None

class PrescriptionCreate(BaseModel):
    appointment_id: uuid.UUID
    patient_id: uuid.UUID
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    items: List[PrescriptionItemBase]

class PrescriptionItemResponse(PrescriptionItemBase):
    id: uuid.UUID
    model_config = {"from_attributes": True}

class PrescriptionResponse(BaseModel):
    id: uuid.UUID
    appointment_id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    diagnosis: Optional[str]
    notes: Optional[str]
    is_finalized: bool
    is_dispensed: bool
    created_at: datetime
    
    model_config = {"from_attributes": True}
