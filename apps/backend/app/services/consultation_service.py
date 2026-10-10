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

        # Send notification to the patient with clinical notes link
        try:
            from app.services.notification import NotificationService
            from app.models.doctor import Doctor
            doc_stmt = select(Doctor).where(Doctor.user_id == doctor_id)
            doc_res = await db.execute(doc_stmt)
            doc = doc_res.scalar_one_or_none()
            doc_name = f"Dr. {doc.full_name}" if doc else "Your attending doctor"

            await NotificationService.send_notification(
                db,
                user_id=consultation.patient_id,
                title="Consultation Completed",
                message=f"{doc_name} completed your consultation and added clinical notes. View in Medical Records -> Consultation History.",
                type="RECORD",
                link="/patient/records"
            )
        except Exception:
            pass

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

    @staticmethod
    async def get_patient_consultations(
        db: AsyncSession, patient_id: uuid.UUID
    ) -> list[ConsultationResponse]:
        from app.models.doctor import Doctor
        stmt = (
            select(Consultation)
            .where(Consultation.patient_id == patient_id)
            .order_by(Consultation.created_at.desc())
        )
        res = await db.execute(stmt)
        consultations = res.scalars().all()

        enriched = []
        for c in consultations:
            doc_stmt = select(Doctor).where(Doctor.user_id == c.doctor_id)
            doc_res = await db.execute(doc_stmt)
            doc = doc_res.scalar_one_or_none()

            enriched.append(
                ConsultationResponse(
                    id=c.id,
                    appointment_id=c.appointment_id,
                    patient_id=c.patient_id,
                    doctor_id=c.doctor_id,
                    symptoms=c.symptoms,
                    observations=c.observations,
                    diagnosis=c.diagnosis,
                    treatment_plan=c.treatment_plan,
                    clinical_notes=c.clinical_notes,
                    follow_up_date=c.follow_up_date,
                    follow_up_notes=c.follow_up_notes,
                    is_public=getattr(c, "is_public", False),
                    prescription_id=c.prescription_id,
                    completed_at=c.completed_at,
                    created_at=c.created_at,
                    doctor_name=f"Dr. {doc.full_name}" if doc else "Attending Doctor",
                    doctor_specialization=doc.specialization if doc else None,
                    clinic_or_hospital=doc.clinic_name or doc.hospital_name if doc else None,
                )
            )
        return enriched

    @staticmethod
    async def update_consultation_consent(
        db: AsyncSession, consultation_id: uuid.UUID, patient_id: uuid.UUID, is_public: bool
    ) -> ConsultationResponse:
        consultation = await ConsultationService.get_consultation(db, consultation_id)
        if consultation.patient_id != patient_id:
            raise ForbiddenException("You can only manage consent for your own consultations")

        consultation.is_public = is_public
        await db.commit()
        await db.refresh(consultation)

        from app.models.doctor import Doctor
        doc_stmt = select(Doctor).where(Doctor.user_id == consultation.doctor_id)
        doc_res = await db.execute(doc_stmt)
        doc = doc_res.scalar_one_or_none()

        return ConsultationResponse(
            id=consultation.id,
            appointment_id=consultation.appointment_id,
            patient_id=consultation.patient_id,
            doctor_id=consultation.doctor_id,
            symptoms=consultation.symptoms,
            observations=consultation.observations,
            diagnosis=consultation.diagnosis,
            treatment_plan=consultation.treatment_plan,
            clinical_notes=consultation.clinical_notes,
            follow_up_date=consultation.follow_up_date,
            follow_up_notes=consultation.follow_up_notes,
            is_public=consultation.is_public,
            prescription_id=consultation.prescription_id,
            completed_at=consultation.completed_at,
            created_at=consultation.created_at,
            doctor_name=f"Dr. {doc.full_name}" if doc else "Attending Doctor",
            doctor_specialization=doc.specialization if doc else None,
            clinic_or_hospital=doc.clinic_name or doc.hospital_name if doc else None,
        )
