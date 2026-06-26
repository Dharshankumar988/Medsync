import uuid
from typing import Optional, List
from pydantic import BaseModel
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
