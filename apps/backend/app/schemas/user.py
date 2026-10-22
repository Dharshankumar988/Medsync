import uuid
from typing import Optional, Any
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from datetime import datetime
from app.models.user import UserRole, UserStatus

class UserBase(BaseModel):
    email: str
    role: UserRole
    status: UserStatus

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: uuid.UUID
    email: str
    role: UserRole
    status: UserStatus
    created_at: datetime
    updated_at: datetime
    profile_completion_percentage: int
    is_verified: bool
    
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

class UserSyncRequest(BaseModel):
    id: uuid.UUID
    email: str
    role: UserRole
    full_name: str
    is_verified: Optional[bool] = None
    auth_provider: Optional[str] = None
    hospital_id: Optional[uuid.UUID] = None
    hospital_name: Optional[str] = None
    hospital_address: Optional[str] = None
    clinic_name: Optional[str] = None
    clinic_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    license_number: Optional[str] = None
    gst_number: Optional[str] = None
    business_name: Optional[str] = None
    contact_number: Optional[str] = None
    blood_group: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    facility_type: Optional[str] = None
    google_maps_url: Optional[str] = None
    profile_picture_url: Optional[str] = None

    model_config = ConfigDict(use_enum_values=True)

    @field_validator("hospital_id", mode="before")
    @classmethod
    def clean_hospital_id(cls, v: Any) -> Optional[uuid.UUID]:
        if v is None:
            return None
        if isinstance(v, str):
            clean_str = v.strip()
            if not clean_str or clean_str.lower() in ("null", "undefined", "none"):
                return None
            try:
                return uuid.UUID(clean_str)
            except (ValueError, AttributeError):
                return None
        if isinstance(v, uuid.UUID):
            return v
        return None

class ProfileImageResponseData(BaseModel):
    profile_image_url: str
    model_config = ConfigDict(use_enum_values=True)

class AvatarUpdateRequest(BaseModel):
    avatar_url: str
    model_config = ConfigDict(use_enum_values=True)


