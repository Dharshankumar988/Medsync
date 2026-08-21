import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.models.user import UserRole, UserStatus

class UserBase(BaseModel):
    email: EmailStr
    role: UserRole
    status: UserStatus

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: uuid.UUID
    email: EmailStr
    role: UserRole
    status: UserStatus
    created_at: datetime
    updated_at: datetime
    profile_completion_percentage: int
    is_verified: bool
    
    model_config = {"from_attributes": True}

class UserSyncRequest(BaseModel):
    id: uuid.UUID
    email: EmailStr
    role: UserRole
    full_name: str
    hospital_id: Optional[uuid.UUID] = None
    hospital_name: Optional[str] = None
    hospital_address: Optional[str] = None
    clinic_name: Optional[str] = None
    clinic_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    license_number: Optional[str] = None
    business_name: Optional[str] = None
    contact_number: Optional[str] = None
