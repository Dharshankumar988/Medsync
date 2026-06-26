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

class AppointmentResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    appointment_date: date
    start_time: time
    end_time: time
    status: AppointmentStatus
    notes: Optional[str] = None
    created_at: datetime
    
    model_config = {"from_attributes": True}
