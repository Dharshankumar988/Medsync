from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid
from datetime import datetime, timezone
from app.repositories.appointment import appointment_repo
from app.schemas.appointment import AppointmentCreate, AppointmentResponse, AppointmentListResponse
from app.core.exceptions import DomainException, NotFoundException, ForbiddenException, BadRequestException
from app.models.appointment import Appointment, AppointmentStatus, AppointmentStatusHistory
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.doctor_location import DoctorLocation
from app.models.hospital import Hospital


class AppointmentService:
    @staticmethod
    async def book_appointment(db: AsyncSession, patient_id: uuid.UUID, req: AppointmentCreate):
        # 1. Enforce Profile Completeness
        from app.models.user import User
        user_stmt = select(User).where(User.id == patient_id)
        user_res = await db.execute(user_stmt)
        user = user_res.scalar_one_or_none()
        if not user or user.profile_completion_percentage < 100:
            raise BadRequestException("Please complete your health profile before booking an appointment.")

        # 2. Check double-booking
        conflict = await appointment_repo.check_conflict(
            db, req.doctor_id, req.appointment_date, req.start_time, req.end_time
        )
        if conflict:
            raise DomainException("Doctor is not available at this time slot")

        # 3. Create appointment
        appt_in = {
            "patient_id": patient_id,
            "doctor_id": req.doctor_id,
            "appointment_date": req.appointment_date,
            "start_time": req.start_time,
            "end_time": req.end_time,
            "notes": req.notes,
            "status": AppointmentStatus.PENDING,
            "location_id": req.location_id,
        }
        return await appointment_repo.create(db, obj_in=appt_in)

    @staticmethod
    async def list_appointments(
        db: AsyncSession,
        user_id: uuid.UUID,
        role: str,
        status_filter: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> dict:
        """List appointments with enriched doctor/patient information."""
        stmt = select(Appointment)

        # Role-aware filtering
        if role.upper() == "PATIENT":
            stmt = stmt.where(Appointment.patient_id == user_id)
        elif role.upper() == "DOCTOR":
            stmt = stmt.where(Appointment.doctor_id == user_id)
        # Admin sees all

        if status_filter:
            stmt = stmt.where(Appointment.status == status_filter)
        if date_from:
            stmt = stmt.where(Appointment.appointment_date >= date_from)
        if date_to:
            stmt = stmt.where(Appointment.appointment_date <= date_to)

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        count_result = await db.execute(count_stmt)
        total = count_result.scalar() or 0

        # Fetch paginated
        stmt = stmt.order_by(
            Appointment.appointment_date.desc(), Appointment.start_time.desc()
        ).offset(skip).limit(limit)

        result = await db.execute(stmt)
        appointments = result.scalars().all()

        # Enrich with doctor/patient names
        enriched = []
        for appt in appointments:
            appt_dict = {
                "id": appt.id,
                "patient_id": appt.patient_id,
                "doctor_id": appt.doctor_id,
                "appointment_date": appt.appointment_date,
                "start_time": appt.start_time,
                "end_time": appt.end_time,
                "status": appt.status,
                "notes": appt.notes,
                "location_id": appt.location_id,
                "cancelled_at": appt.cancelled_at,
                "cancellation_reason": appt.cancellation_reason,
                "created_at": appt.created_at,
                "updated_at": appt.updated_at,
            }

            # Fetch doctor info
            doc_stmt = select(Doctor).where(Doctor.user_id == appt.doctor_id)
            doc_result = await db.execute(doc_stmt)
            doc = doc_result.scalar_one_or_none()
            if doc:
                appt_dict["doctor_name"] = doc.full_name
                appt_dict["doctor_specialization"] = doc.specialization
                appt_dict["doctor_picture"] = doc.profile_picture_url
                appt_dict["hospital_name"] = doc.hospital_name

            # Fetch patient info
            pat_stmt = select(Patient).where(Patient.user_id == appt.patient_id)
            pat_result = await db.execute(pat_stmt)
            pat = pat_result.scalar_one_or_none()
            if pat:
                appt_dict["patient_name"] = pat.full_name
                appt_dict["patient_picture"] = pat.profile_picture_url

            # Fetch location info
            if appt.location_id:
                loc_stmt = select(DoctorLocation).where(DoctorLocation.id == appt.location_id)
                loc_result = await db.execute(loc_stmt)
                loc = loc_result.scalar_one_or_none()
                if loc:
                    appt_dict["location_name"] = loc.location_name or loc.address

            enriched.append(appt_dict)

        return {"appointments": enriched, "total": total}

    @staticmethod
    async def get_appointment(
        db: AsyncSession, appointment_id: uuid.UUID, user_id: uuid.UUID, role: str
    ) -> dict:
        """Get a single appointment with enriched data."""
        stmt = select(Appointment).where(Appointment.id == appointment_id)
        result = await db.execute(stmt)
        appt = result.scalar_one_or_none()

        if not appt:
            raise NotFoundException("Appointment not found")

        # Authorization check
        if role.upper() not in ("ADMIN",):
            if appt.patient_id != user_id and appt.doctor_id != user_id:
                raise ForbiddenException("You are not authorized to view this appointment")

        appt_dict = {
            "id": appt.id,
            "patient_id": appt.patient_id,
            "doctor_id": appt.doctor_id,
            "appointment_date": appt.appointment_date,
            "start_time": appt.start_time,
            "end_time": appt.end_time,
            "status": appt.status,
            "notes": appt.notes,
            "location_id": appt.location_id,
            "cancelled_at": appt.cancelled_at,
            "cancellation_reason": appt.cancellation_reason,
            "created_at": appt.created_at,
            "updated_at": appt.updated_at,
        }

        # Enrich
        doc_stmt = select(Doctor).where(Doctor.user_id == appt.doctor_id)
        doc_result = await db.execute(doc_stmt)
        doc = doc_result.scalar_one_or_none()
        if doc:
            appt_dict["doctor_name"] = doc.full_name
            appt_dict["doctor_specialization"] = doc.specialization
            appt_dict["doctor_picture"] = doc.profile_picture_url
            appt_dict["hospital_name"] = doc.hospital_name

        pat_stmt = select(Patient).where(Patient.user_id == appt.patient_id)
        pat_result = await db.execute(pat_stmt)
        pat = pat_result.scalar_one_or_none()
        if pat:
            appt_dict["patient_name"] = pat.full_name
            appt_dict["patient_picture"] = pat.profile_picture_url

        if appt.location_id:
            loc_stmt = select(DoctorLocation).where(DoctorLocation.id == appt.location_id)
            loc_result = await db.execute(loc_stmt)
            loc = loc_result.scalar_one_or_none()
            if loc:
                appt_dict["location_name"] = loc.location_name or loc.address

        return appt_dict

    @staticmethod
    async def update_status(
        db: AsyncSession,
        appointment_id: uuid.UUID,
        user_id: uuid.UUID,
        role: str,
        new_status: str,
        reason: str | None = None,
    ) -> Appointment:
        """Update appointment status with authorization and cancellation tracking."""
        stmt = select(Appointment).where(Appointment.id == appointment_id)
        result = await db.execute(stmt)
        appt = result.scalar_one_or_none()

        if not appt:
            raise NotFoundException("Appointment not found")

        # Authorization
        role_upper = role.upper()
        if role_upper == "DOCTOR":
            if appt.doctor_id != user_id:
                raise ForbiddenException("Not your appointment")
            allowed_transitions = {
                AppointmentStatus.PENDING: [AppointmentStatus.CONFIRMED, AppointmentStatus.REJECTED],
                AppointmentStatus.CONFIRMED: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED],
            }
        elif role_upper == "PATIENT":
            if appt.patient_id != user_id:
                raise ForbiddenException("Not your appointment")
            allowed_transitions = {
                AppointmentStatus.PENDING: [AppointmentStatus.CANCELLED],
                AppointmentStatus.CONFIRMED: [AppointmentStatus.CANCELLED],
            }
        elif role_upper == "ADMIN":
            allowed_transitions = None  # Admin can do anything
        else:
            raise ForbiddenException("Insufficient permissions")

        try:
            target_status = AppointmentStatus(new_status)
        except ValueError:
            raise BadRequestException(f"Invalid status: {new_status}")

        if allowed_transitions is not None:
            current_allowed = allowed_transitions.get(appt.status, [])
            if target_status not in current_allowed:
                raise BadRequestException(
                    f"Cannot transition from {appt.status} to {target_status}"
                )

        # Track cancellation
        if target_status in (AppointmentStatus.CANCELLED, AppointmentStatus.REJECTED):
            appt.cancelled_at = datetime.now(timezone.utc)
            appt.cancellation_reason = reason

        appt.status = target_status

        # Record status history
        history = AppointmentStatusHistory(
            id=uuid.uuid4(),
            appointment_id=appt.id,
            status=target_status,
            changed_by=user_id,
            reason=reason,
        )
        db.add(history)

        await db.commit()
        await db.refresh(appt)
        return appt

    @staticmethod
    async def reschedule(
        db: AsyncSession,
        appointment_id: uuid.UUID,
        user_id: uuid.UUID,
        new_date,
        new_start_time,
        new_end_time,
        reason: str | None = None,
    ) -> Appointment:
        """Reschedule an appointment to a new date/time."""
        stmt = select(Appointment).where(Appointment.id == appointment_id)
        result = await db.execute(stmt)
        appt = result.scalar_one_or_none()

        if not appt:
            raise NotFoundException("Appointment not found")
        if appt.patient_id != user_id and appt.doctor_id != user_id:
            raise ForbiddenException("Not your appointment")
        if appt.status in (AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED):
            raise BadRequestException("Cannot reschedule a completed or cancelled appointment")

        # Check conflicts for new slot
        conflict = await appointment_repo.check_conflict(
            db, appt.doctor_id, new_date, new_start_time, new_end_time
        )
        if conflict:
            raise DomainException("Doctor is not available at the new time slot")

        appt.appointment_date = new_date
        appt.start_time = new_start_time
        appt.end_time = new_end_time
        appt.status = AppointmentStatus.RESCHEDULED

        # Record history
        history = AppointmentStatusHistory(
            id=uuid.uuid4(),
            appointment_id=appt.id,
            status=AppointmentStatus.RESCHEDULED,
            changed_by=user_id,
            reason=reason or "Rescheduled",
        )
        db.add(history)

        await db.commit()
        await db.refresh(appt)
        return appt
