import uuid
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class PrescriptionItemBase(BaseModel):
    medicine_name: str
    dosage: str
    frequency: str
    duration_days: int
    instructions: Optional[str] = None

class PrescriptionCreate(BaseModel):
    appointment_id: Optional[uuid.UUID] = None
    patient_id: uuid.UUID
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    items: List[PrescriptionItemBase]
    pin: Optional[str] = None
    routed_pharmacy_id: Optional[uuid.UUID] = None

class PrescriptionItemResponse(PrescriptionItemBase):
    id: uuid.UUID
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

class PrescriptionResponse(BaseModel):
    id: uuid.UUID
    appointment_id: Optional[uuid.UUID] = None
    patient_id: uuid.UUID
    doctor_id: Optional[uuid.UUID] = None
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    is_finalized: bool
    is_dispensed: bool
    created_at: datetime
    pdf_url: Optional[str] = None
    qr_token: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)
