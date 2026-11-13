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

        consultation.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)

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

        # Automatically generate & share consultation notes PDF into patient's Medical Records
        try:
            await ConsultationService.share_consultation_pdf_to_patient(
                db, consultation.id, doctor_id, notify_patient=False
            )
        except Exception as pdf_err:
            import logging
            logging.getLogger("medsync.consultations").warning(
                f"Auto-share consultation PDF warning for {consultation.id}: {pdf_err}"
            )

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

        # Batch lookup all doctors to eliminate N+1 latency
        doc_user_ids = {c.doctor_id for c in consultations if c.doctor_id}
        doc_map = {}
        if doc_user_ids:
            doc_stmt = select(Doctor).where(Doctor.user_id.in_(doc_user_ids))
            doc_res = await db.execute(doc_stmt)
            for d in doc_res.scalars().all():
                doc_map[d.user_id] = d

        enriched = []
        for c in consultations:
            doc = doc_map.get(c.doctor_id)
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
                    doctor_name=f"Dr. {doc.full_name}" if doc and doc.full_name else "Attending Doctor",
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

    @staticmethod
    async def get_or_create_for_appointment(
        db: AsyncSession, appointment_id: uuid.UUID, doctor_id: uuid.UUID
    ) -> Consultation:
        """Fetch existing consultation for appointment, or build one from completed appointment notes."""
        existing = await ConsultationService.get_by_appointment(db, appointment_id)
        if existing:
            return existing

        stmt = select(Appointment).where(Appointment.id == appointment_id)
        res = await db.execute(stmt)
        appointment = res.scalar_one_or_none()
        if not appointment:
            raise NotFoundException("Appointment not found")
        if appointment.doctor_id != doctor_id:
            raise ForbiddenException("You are not the assigned doctor for this appointment")

        consultation = Consultation(
            id=uuid.uuid4(),
            appointment_id=appointment.id,
            patient_id=appointment.patient_id,
            doctor_id=doctor_id,
            clinical_notes=appointment.notes,
            diagnosis=appointment.notes,
            completed_at=datetime.now(timezone.utc).replace(tzinfo=None)
            if appointment.status == AppointmentStatus.COMPLETED
            else None,
        )
        db.add(consultation)
        await db.commit()
        await db.refresh(consultation)
        return consultation

    @staticmethod
    async def build_consultation_pdf_bytes(
        db: AsyncSession,
        consultation_id: uuid.UUID,
        requester_id: uuid.UUID,
        requester_role: str = "DOCTOR",
    ) -> tuple[bytes, str, Consultation]:
        """Generate formatted PDF bytes for a consultation after authorization check."""
        from app.models.doctor import Doctor
        from app.models.patient import Patient
        from app.services.qr_pdf_service import QRPdfService

        consultation = await ConsultationService.get_consultation(db, consultation_id)
        role_upper = str(requester_role or "").upper()
        if (
            role_upper != "ADMIN"
            and consultation.doctor_id != requester_id
            and consultation.patient_id != requester_id
        ):
            raise ForbiddenException("You do not have access to this consultation PDF")

        doc_res = await db.execute(select(Doctor).where(Doctor.user_id == consultation.doctor_id))
        doc = doc_res.scalar_one_or_none()
        pat_res = await db.execute(select(Patient).where(Patient.user_id == consultation.patient_id))
        pat = pat_res.scalar_one_or_none()
        appt_res = await db.execute(select(Appointment).where(Appointment.id == consultation.appointment_id))
        appt = appt_res.scalar_one_or_none()

        visit_date = (
            str(appt.appointment_date)
            if appt and appt.appointment_date
            else (consultation.created_at.strftime("%Y-%m-%d") if consultation.created_at else "")
        )
        doctor_data = {
            "name": doc.full_name if doc else "Attending Physician",
            "specialization": doc.specialization if doc else "Clinical Care",
            "clinic_name": (doc.clinic_name or doc.hospital_name) if doc else "MedSync Clinic",
        }
        patient_data = {
            "name": pat.full_name if pat else "Patient",
            "id": str(consultation.patient_id),
        }
        consultation_data = {
            "visit_date": visit_date,
            "symptoms": consultation.symptoms,
            "observations": consultation.observations,
            "diagnosis": consultation.diagnosis,
            "treatment_plan": consultation.treatment_plan,
            "clinical_notes": consultation.clinical_notes or (appt.notes if appt else None),
            "follow_up_date": str(consultation.follow_up_date) if consultation.follow_up_date else None,
            "follow_up_notes": consultation.follow_up_notes,
        }

        pdf_stream = QRPdfService.generate_consultation_pdf(
            consultation_data, patient_data, doctor_data
        )
        pdf_bytes = pdf_stream.getvalue() if hasattr(pdf_stream, "getvalue") else pdf_stream.read()
        filename = f"consultation_notes_{consultation.id}.pdf"
        return pdf_bytes, filename, consultation

    @staticmethod
    async def share_consultation_pdf_to_patient(
        db: AsyncSession,
        consultation_id: uuid.UUID,
        doctor_id: uuid.UUID,
        notify_patient: bool = True,
    ) -> dict:
        """Render consultation notes as a PDF and attach it as a Medical Record for the patient."""
        from app.models.doctor import Doctor
        from app.models.record import (
            MedicalRecord,
            MedicalRecordVersion,
            FileMetadata,
            RecordPermission,
            FileType,
        )
        from app.services.storage import StorageService
        from app.services.notification import NotificationService

        pdf_bytes, filename, consultation = await ConsultationService.build_consultation_pdf_bytes(
            db, consultation_id, doctor_id, requester_role="DOCTOR"
        )
        if consultation.doctor_id != doctor_id:
            raise ForbiddenException("Only the attending doctor can share consultation notes")

        doc_res = await db.execute(select(Doctor).where(Doctor.user_id == doctor_id))
        doc = doc_res.scalar_one_or_none()
        doc_name = f"Dr. {doc.full_name}" if doc and doc.full_name else "Attending Doctor"
        visit_label = (
            consultation.created_at.strftime("%d %b %Y")
            if consultation.created_at
            else datetime.utcnow().strftime("%d %b %Y")
        )
        marker = f"[CONSULTATION:{consultation.id}]"

        # Reuse existing consultation MedicalRecord if previously shared
        rec_stmt = select(MedicalRecord).where(
            MedicalRecord.patient_id == consultation.patient_id,
            MedicalRecord.description.ilike(f"%{marker}%"),
            MedicalRecord.is_archived.is_(False),
        )
        rec_res = await db.execute(rec_stmt)
        record = rec_res.scalars().first()

        summary_line = (
            consultation.diagnosis
            or consultation.treatment_plan
            or consultation.clinical_notes
            or "Clinical consultation summary & physician notes."
        )
        summary_line = str(summary_line).strip()[:180]
        full_description = f"{summary_line} {marker} [PUBLIC]".strip()

        next_version = 1
        if not record:
            record = MedicalRecord(
                id=uuid.uuid4(),
                patient_id=consultation.patient_id,
                uploaded_by=doctor_id,
                title=f"Consultation Notes — {doc_name} ({visit_label})",
                description=full_description,
                is_public=True,
                is_archived=False,
            )
            db.add(record)
            await db.flush()
            db.add(
                RecordPermission(
                    record_id=record.id,
                    granted_to=consultation.patient_id,
                    granted_by=consultation.patient_id,
                    access_level="PUBLIC",
                    is_revoked=False,
                )
            )
        else:
            record.title = f"Consultation Notes — {doc_name} ({visit_label})"
            record.description = (
                full_description
                if "[PUBLIC]" in (record.description or "") or record.is_public
                else f"{summary_line} {marker}".strip()
            )
            ver_stmt = (
                select(MedicalRecordVersion)
                .where(MedicalRecordVersion.record_id == record.id)
                .order_by(MedicalRecordVersion.version_number.desc())
            )
            ver_res = await db.execute(ver_stmt)
            prev_versions = ver_res.scalars().all()
            for v in prev_versions:
                v.is_current = False
            if prev_versions:
                next_version = (prev_versions[0].version_number or 1) + 1

        object_path, content_type, byte_len, sha_hash = await StorageService.upload_bytes(
            file_bytes=pdf_bytes,
            filename=filename,
            content_type="application/pdf",
            patient_id=str(consultation.patient_id),
            record_id=str(record.id),
            version_number=next_version,
        )

        version_row = MedicalRecordVersion(
            id=uuid.uuid4(),
            record_id=record.id,
            version_number=next_version,
            ipfs_cid=object_path,
            file_type=FileType.PDF.value,
            file_size_bytes=byte_len,
            change_description=f"Shared consultation notes PDF by {doc_name}",
            is_current=True,
        )
        db.add(version_row)
        await db.flush()

        db.add(
            FileMetadata(
                id=uuid.uuid4(),
                version_id=version_row.id,
                supabase_storage_path=object_path,
                mime_type=content_type,
                encrypted_filename=filename,
                sha256_hash=sha_hash,
                uploaded_by=doctor_id,
                version=next_version,
            )
        )

        if notify_patient:
            try:
                await NotificationService.send_notification(
                    db,
                    user_id=consultation.patient_id,
                    title="Consultation Notes PDF Shared",
                    message=f"{doc_name} shared your clinical consultation summary PDF to your Medical Records.",
                    type="RECORD",
                    link="/patient/records",
                )
            except Exception:
                pass

        await db.commit()
        return {
            "record_id": str(record.id),
            "consultation_id": str(consultation.id),
            "version_number": next_version,
            "title": record.title,
        }
