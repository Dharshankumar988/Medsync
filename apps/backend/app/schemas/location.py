import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class DoctorLocationCreate(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    location_type: str = "HOSPITAL"
    location_name: Optional[str] = None
    hospital_id: Optional[uuid.UUID] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    google_maps_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    working_days: Optional[str] = None
    consultation_hours: Optional[str] = None
    is_primary: bool = False


class DoctorLocationResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True, from_attributes=True)
    id: uuid.UUID
    doctor_id: uuid.UUID
    location_type: str
    location_name: Optional[str] = None
    hospital_id: Optional[uuid.UUID] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    google_maps_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    working_days: Optional[str] = None
    consultation_hours: Optional[str] = None
    is_primary: bool
    is_active: bool
    verification_status: str
    created_at: datetime


class DoctorLocationActionResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    id: uuid.UUID
    is_active: bool
    message: str


class PharmacyLocationCreate(BaseModel):
    location_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    google_maps_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    operating_hours: Optional[str] = None
    working_days: Optional[str] = None
    delivery_available: bool = False
    pickup_available: bool = True
    is_primary: bool = False


class PharmacyLocationResponse(BaseModel):
    id: uuid.UUID
    pharmacy_id: uuid.UUID
    location_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    google_maps_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    operating_hours: Optional[str] = None
    working_days: Optional[str] = None
    delivery_available: bool
    pickup_available: bool
    is_primary: bool
    is_active: bool
    verification_status: str
    created_at: datetime

    model_config = {"from_attributes": True}
