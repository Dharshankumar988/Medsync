from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional
from app.models.user import UserRole

class Token(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    status: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UserRegistration(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    email: str
    password: str
    role: UserRole
    full_name: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ForgotPasswordResponseData(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    action: str  # "EMAIL_SENT" or "REDIRECT"
    role: str
    redirect_url: Optional[str] = None
    email: str
    message: str
    preview_url: Optional[str] = None

class VerifyResetTokenResponseData(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    valid: bool
    email: Optional[str] = None
    role: Optional[str] = None
    remaining_seconds: Optional[int] = None

class PatientResetPasswordRequest(BaseModel):
    token: str
    email: EmailStr
    password: str
    confirm_password: str

class ProviderResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str
    confirm_password: Optional[str] = None

class ResetPasswordSuccessResponseData(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    email: str
    role: str
    message: str

class AdminRegisterResponseData(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    id: str

class ForceResetResponseData(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    email: str

class SyncUserResponseData(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    id: str
