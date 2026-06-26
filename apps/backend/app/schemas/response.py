from typing import Generic, TypeVar, Optional
from pydantic import BaseModel, Field
from datetime import datetime, UTC

T = TypeVar("T")

class APIResponse(BaseModel, Generic[T]):
    status: str = "success"
    message: str
    data: Optional[T] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
