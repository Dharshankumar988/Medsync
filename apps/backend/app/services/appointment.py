from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.repositories.appointment import appointment_repo
from app.schemas.appointment import AppointmentCreate
from app.core.exceptions import DomainException
from app.models.appointment import AppointmentStatus

class AppointmentService:
    @staticmethod
    async def book_appointment(db: AsyncSession, patient_id: uuid.UUID, req: AppointmentCreate):
        # 1. Check double-booking
        conflict = await appointment_repo.check_conflict(db, req.doctor_id, req.appointment_date, req.start_time, req.end_time)
        if conflict:
            raise DomainException("Doctor is not available at this time slot")
            
        # 2. Create appointment
        appt_in = {
            "patient_id": patient_id,
            "doctor_id": req.doctor_id,
            "appointment_date": req.appointment_date,
            "start_time": req.start_time,
            "end_time": req.end_time,
            "notes": req.notes,
            "status": AppointmentStatus.PENDING
        }
        return await appointment_repo.create(db, obj_in=appt_in)
