from pydantic import BaseModel, EmailStr
from app.models.user import UserRole

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    status: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserRegistration(BaseModel):
    email: EmailStr
    password: str
    role: UserRole
    full_name: str
