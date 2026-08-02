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
