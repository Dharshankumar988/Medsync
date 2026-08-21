import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.consultation import Consultation
from app.models.appointment import Appointment, AppointmentStatus
from app.schemas.consultation import ConsultationCreate, ConsultationResponse
from app.core.exceptions import NotFoundException, ForbiddenException, BadRequestException


class ConsultationService:
    """Service for managing doctor consultations linked to appointments."""

    @staticmethod
    async def create_consultation(
        db: AsyncSession, doctor_id: uuid.UUID, data: ConsultationCreate
    ) -> Consultation:
        # Verify appointment exists and belongs to this doctor
        stmt = select(Appointment).where(Appointment.id == data.appointment_id)
        result = await db.execute(stmt)
        appointment = result.scalar_one_or_none()

        if not appointment:
            raise NotFoundException("Appointment not found")
        if appointment.doctor_id != doctor_id:
            raise ForbiddenException("You are not the assigned doctor for this appointment")
        if appointment.status not in (
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.PENDING,
        ):
            raise BadRequestException(
                f"Cannot create consultation for appointment with status {appointment.status}"
            )

        # Check if consultation already exists
        existing_stmt = select(Consultation).where(
            Consultation.appointment_id == data.appointment_id
        )
        existing_result = await db.execute(existing_stmt)
        existing = existing_result.scalar_one_or_none()
        if existing:
            raise BadRequestException("Consultation already exists for this appointment")

        consultation = Consultation(
            id=uuid.uuid4(),
            appointment_id=data.appointment_id,
            patient_id=appointment.patient_id,
            doctor_id=doctor_id,
            symptoms=data.symptoms,
            observations=data.observations,
            diagnosis=data.diagnosis,
            treatment_plan=data.treatment_plan,
            clinical_notes=data.clinical_notes,
            follow_up_date=data.follow_up_date,
            follow_up_notes=data.follow_up_notes,
        )
        db.add(consultation)
        await db.commit()
        await db.refresh(consultation)
        return consultation

    @staticmethod
    async def get_consultation(
        db: AsyncSession, consultation_id: uuid.UUID
    ) -> Consultation:
        stmt = select(Consultation).where(Consultation.id == consultation_id)
        result = await db.execute(stmt)
        consultation = result.scalar_one_or_none()
        if not consultation:
            raise NotFoundException("Consultation not found")
        return consultation

    @staticmethod
    async def get_by_appointment(
        db: AsyncSession, appointment_id: uuid.UUID
    ) -> Consultation | None:
        stmt = select(Consultation).where(
            Consultation.appointment_id == appointment_id
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def complete_consultation(
        db: AsyncSession,
        consultation_id: uuid.UUID,
        doctor_id: uuid.UUID,
        diagnosis: str | None = None,
        treatment_plan: str | None = None,
        clinical_notes: str | None = None,
        follow_up_date=None,
        follow_up_notes: str | None = None,
    ) -> Consultation:
        consultation = await ConsultationService.get_consultation(db, consultation_id)

        if consultation.doctor_id != doctor_id:
            raise ForbiddenException("You are not the assigned doctor")
        if consultation.completed_at is not None:
            raise BadRequestException("Consultation is already completed")

        # Update fields if provided
        if diagnosis is not None:
            consultation.diagnosis = diagnosis
        if treatment_plan is not None:
            consultation.treatment_plan = treatment_plan
        if clinical_notes is not None:
            consultation.clinical_notes = clinical_notes
        if follow_up_date is not None:
            consultation.follow_up_date = follow_up_date
        if follow_up_notes is not None:
            consultation.follow_up_notes = follow_up_notes

        consultation.completed_at = datetime.now(timezone.utc)

        # Also mark the appointment as COMPLETED
        appt_stmt = select(Appointment).where(
            Appointment.id == consultation.appointment_id
        )
        appt_result = await db.execute(appt_stmt)
        appointment = appt_result.scalar_one_or_none()
        if appointment:
            appointment.status = AppointmentStatus.COMPLETED

        await db.commit()
        await db.refresh(consultation)
        return consultation

    @staticmethod
    async def update_consultation(
        db: AsyncSession,
        consultation_id: uuid.UUID,
        doctor_id: uuid.UUID,
        update_data: dict,
    ) -> Consultation:
        consultation = await ConsultationService.get_consultation(db, consultation_id)

        if consultation.doctor_id != doctor_id:
            raise ForbiddenException("You are not the assigned doctor")

        allowed_fields = {
            "symptoms", "observations", "diagnosis", "treatment_plan",
            "clinical_notes", "follow_up_date", "follow_up_notes",
        }
        for key, value in update_data.items():
            if key in allowed_fields:
                setattr(consultation, key, value)

        await db.commit()
        await db.refresh(consultation)
        return consultation
