import uuid
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from datetime import date, datetime


class ConsultationCreate(BaseModel):
    appointment_id: uuid.UUID
    symptoms: Optional[str] = None
    observations: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment_plan: Optional[str] = None
    clinical_notes: Optional[str] = None
    follow_up_date: Optional[date] = None
    follow_up_notes: Optional[str] = None

class ConsultationResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True, from_attributes=True)

    id: uuid.UUID
    appointment_id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    symptoms: Optional[str] = None
    observations: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment_plan: Optional[str] = None
    clinical_notes: Optional[str] = None
    follow_up_date: Optional[date] = None
    follow_up_notes: Optional[str] = None
    is_public: bool = False
    prescription_id: Optional[uuid.UUID] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    doctor_name: Optional[str] = None
    doctor_specialization: Optional[str] = None
    clinic_or_hospital: Optional[str] = None


class MedicalHistoryShareCreate(BaseModel):
    patient_id: uuid.UUID
    appointment_id: Optional[uuid.UUID] = None
    consultation_id: Optional[uuid.UUID] = None
    shared_records: Optional[dict] = None
    access_scope: str = "CONSULTATION"
    expires_in_days: Optional[int] = None


class MedicalHistoryShareResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    appointment_id: Optional[uuid.UUID] = None
    consultation_id: Optional[uuid.UUID] = None
    shared_records: Optional[dict] = None
    access_scope: str
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}
