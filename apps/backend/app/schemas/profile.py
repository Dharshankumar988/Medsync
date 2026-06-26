import uuid
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class PatientProfile(BaseModel):
    id: uuid.UUID
    full_name: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    
    model_config = {"from_attributes": True}

class DoctorProfile(BaseModel):
    id: uuid.UUID
    full_name: str
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    
    model_config = {"from_attributes": True}

class PharmacyProfile(BaseModel):
    id: uuid.UUID
    business_name: str
    license_number: Optional[str] = None
    
    model_config = {"from_attributes": True}

class AdminProfile(BaseModel):
    id: uuid.UUID
    full_name: str
    department: Optional[str] = None
    
    model_config = {"from_attributes": True}
