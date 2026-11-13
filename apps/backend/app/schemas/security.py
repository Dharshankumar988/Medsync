from pydantic import BaseModel, ConfigDict
from typing import Optional

class SecurityStatusData(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    status: str
    has_pin: bool = False
    doctor_id: Optional[str] = None
    pharmacy_id: Optional[str] = None
    patient_id: Optional[str] = None

class SecurityStatusResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    status: str
    message: str = "Security status retrieved"
    data: Optional[SecurityStatusData] = None

class SecurityActionResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    status: str = "success"
    message: str

class VerifyPinRequest(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    pin: str

class VerifyPinResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    valid: bool
    message: str
