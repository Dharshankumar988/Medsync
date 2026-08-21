import uuid
from typing import Optional
from pydantic import BaseModel
from datetime import date, time, datetime
from app.models.appointment import AppointmentStatus

class DoctorAvailabilityCreate(BaseModel):
    day_of_week: int
    start_time: time
    end_time: time
    is_available: bool = True

class AppointmentCreate(BaseModel):
    doctor_id: uuid.UUID
    appointment_date: date
    start_time: time
    end_time: time
    notes: Optional[str] = None
    location_id: Optional[uuid.UUID] = None

class AppointmentStatusUpdate(BaseModel):
    status: str  # CONFIRMED, REJECTED, CANCELLED, COMPLETED
    reason: Optional[str] = None

class AppointmentReschedule(BaseModel):
    appointment_date: date
    start_time: time
    end_time: time
    reason: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    appointment_date: date
    start_time: time
    end_time: time
    status: str
    notes: Optional[str] = None
    location_id: Optional[uuid.UUID] = None
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    # Enriched fields (populated by service layer, not from ORM directly)
    patient_name: Optional[str] = None
    patient_picture: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_specialization: Optional[str] = None
    doctor_picture: Optional[str] = None
    hospital_name: Optional[str] = None
    location_name: Optional[str] = None
    
    model_config = {"from_attributes": True}

class AppointmentListResponse(BaseModel):
    appointments: list[AppointmentResponse]
    total: int
