from pydantic import BaseModel, ConfigDict
from typing import Optional

class SecurityStatusData(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    status: str

class SecurityStatusResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    status: str
    message: str = "Security status retrieved"
    data: Optional[SecurityStatusData] = None

class SecurityActionResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    status: str = "success"
    message: str
