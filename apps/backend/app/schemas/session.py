import uuid
from typing import Any

from pydantic import BaseModel, EmailStr, Field


class AuthenticatedPrincipal(BaseModel):
    id: uuid.UUID
    email: EmailStr | None = None
    role: str = "patient"
    status: str = "ACTIVE"
    full_name: str | None = None
    app_metadata: dict[str, Any] = Field(default_factory=dict)
    user_metadata: dict[str, Any] = Field(default_factory=dict)