import uuid
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.doctor_collaboration import RecordRequestStatus, ReferralStatus


class RecordRequestCreate(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    patient_id: uuid.UUID
    target_doctor_id: Optional[uuid.UUID] = None
    record_id: Optional[uuid.UUID] = None
    reason: str


class RecordRequestResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True, from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    requesting_doctor_id: uuid.UUID
    target_doctor_id: Optional[uuid.UUID] = None
    record_id: Optional[uuid.UUID] = None
    reason: str
    status: RecordRequestStatus
    created_at: datetime
    patient_name: Optional[str] = None
    requesting_doctor_name: Optional[str] = None
    target_doctor_name: Optional[str] = None
    record_title: Optional[str] = None


class RecordRequestActionResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    id: uuid.UUID
    status: RecordRequestStatus
    message: str


class DoctorReferralCreate(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    patient_id: uuid.UUID
    referred_to_doctor_id: uuid.UUID
    specialization: Optional[str] = None
    reason: str
    notes: Optional[str] = None


class DoctorReferralResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True, from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    referring_doctor_id: uuid.UUID
    referred_to_doctor_id: uuid.UUID
    specialization: Optional[str] = None
    reason: str
    notes: Optional[str] = None
    status: ReferralStatus
    created_at: datetime
    patient_name: Optional[str] = None
    referring_doctor_name: Optional[str] = None
    referred_to_doctor_name: Optional[str] = None


class DoctorReferralActionResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    id: uuid.UUID
    status: ReferralStatus
    message: str


class DoctorDirectoryItem(BaseModel):
    model_config = ConfigDict(use_enum_values=True, from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    specialization: Optional[str] = None
    hospital_name: Optional[str] = None
    clinic_name: Optional[str] = None
