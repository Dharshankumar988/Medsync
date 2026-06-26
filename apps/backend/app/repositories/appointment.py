from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import uuid
from datetime import date
from app.repositories.base import BaseRepository
from app.models.appointment import Appointment, DoctorAvailability

class AppointmentRepository(BaseRepository[Appointment, dict, dict]):
    async def check_conflict(self, db: AsyncSession, doctor_id: uuid.UUID, appt_date: date, start_time, end_time) -> bool:
        # Simplistic conflict check
        result = await db.execute(
            select(Appointment)
            .filter(Appointment.doctor_id == doctor_id)
            .filter(Appointment.appointment_date == appt_date)
            .filter(Appointment.status.in_(["PENDING", "CONFIRMED"]))
            .filter(Appointment.start_time < end_time)
            .filter(Appointment.end_time > start_time)
        )
        return result.scalars().first() is not None

appointment_repo = AppointmentRepository(Appointment)

class AvailabilityRepository(BaseRepository[DoctorAvailability, dict, dict]):
    pass

availability_repo = AvailabilityRepository(DoctorAvailability)
