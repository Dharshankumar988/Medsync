import uuid
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.models.record import FileType

class MedicalRecordBase(BaseModel):
    title: str
    description: Optional[str] = None
    category_id: Optional[uuid.UUID] = None

class MedicalRecordCreate(MedicalRecordBase):
    pass

class MedicalRecordVersionResponse(BaseModel):
    id: uuid.UUID
    version_number: int
    ipfs_cid: str
    file_type: FileType
    file_size_bytes: int
    change_description: Optional[str]
    is_current: bool
    created_at: datetime
    
    model_config = {"from_attributes": True}

class MedicalRecordResponse(MedicalRecordBase):
    id: uuid.UUID
    patient_id: uuid.UUID
    uploaded_by: uuid.UUID
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    qr_token: Optional[str] = None
    
    model_config = {"from_attributes": True}

class RecordPermissionCreate(BaseModel):
    granted_to: uuid.UUID
    access_level: str = "READ"
    expires_at: Optional[datetime] = None

class DoctorNoteCreate(BaseModel):
    note_text: str

class DoctorNoteResponse(DoctorNoteCreate):
    id: uuid.UUID
    doctor_id: uuid.UUID
    created_at: datetime
    
    model_config = {"from_attributes": True}

class RecordDownloadResponse(BaseModel):
    record_id: str
    url: str
    signed_url: str
    sha256_hash: Optional[str] = None

    model_config = ConfigDict(use_enum_values=True)


class RecordConsentUpdate(BaseModel):
    is_public: bool

    model_config = ConfigDict(use_enum_values=True)


class RecordConsentResponse(BaseModel):
    record_id: uuid.UUID
    is_public: bool
    status: str

    model_config = ConfigDict(use_enum_values=True)


class PermissionActionResponse(BaseModel):
    status: str
    message: str

    model_config = ConfigDict(use_enum_values=True)



class DoctorAccessibleRecordResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    patient_id: uuid.UUID
    patient_name: str
    uploaded_by: uuid.UUID
    created_at: datetime
    is_public: bool
    is_direct_shared: bool
    doctor_notes: List[DoctorNoteResponse] = []

    model_config = ConfigDict(use_enum_values=True, from_attributes=True)


