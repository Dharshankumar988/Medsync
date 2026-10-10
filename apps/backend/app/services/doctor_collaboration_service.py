import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from fastapi import HTTPException
from app.models.doctor_collaboration import (
    RecordRequest,
    RecordRequestStatus,
    DoctorReferral,
    ReferralStatus,
)
from app.models.record import RecordPermission, MedicalRecord
from app.models.user import User
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.schemas.collaboration import (
    RecordRequestCreate,
    RecordRequestResponse,
    DoctorReferralCreate,
    DoctorReferralResponse,
    DoctorDirectoryItem,
)
from app.services.notification import NotificationService


class DoctorCollaborationService:
    @staticmethod
    async def _get_names(db: AsyncSession, patient_id: uuid.UUID, doctor_a_id: uuid.UUID, doctor_b_id: Optional[uuid.UUID] = None):
        pat_res = await db.execute(select(Patient).where(Patient.user_id == patient_id))
        pat = pat_res.scalar_one_or_none()
        patient_name = pat.full_name if pat else "Patient"

        doc_a_res = await db.execute(select(Doctor).where(Doctor.user_id == doctor_a_id))
        doc_a = doc_a_res.scalar_one_or_none()
        doc_a_name = doc_a.full_name if doc_a else "Doctor"

        doc_b_name = None
        if doctor_b_id:
            doc_b_res = await db.execute(select(Doctor).where(Doctor.user_id == doctor_b_id))
            doc_b = doc_b_res.scalar_one_or_none()
            doc_b_name = doc_b.full_name if doc_b else "Doctor"

        return patient_name, doc_a_name, doc_b_name

    @staticmethod
    async def create_record_request(
        db: AsyncSession, requesting_doctor_id: uuid.UUID, data: RecordRequestCreate
    ) -> RecordRequestResponse:
        record_req = RecordRequest(
            id=uuid.uuid4(),
            patient_id=data.patient_id,
            requesting_doctor_id=requesting_doctor_id,
            target_doctor_id=data.target_doctor_id,
            record_id=data.record_id,
            reason=data.reason,
            status=RecordRequestStatus.PENDING,
        )
        db.add(record_req)
        await db.commit()
        await db.refresh(record_req)

        patient_name, req_doc_name, target_doc_name = await DoctorCollaborationService._get_names(
            db, data.patient_id, requesting_doctor_id, data.target_doctor_id
        )

        record_title = None
        if data.record_id:
            rec_res = await db.execute(select(MedicalRecord).where(MedicalRecord.id == data.record_id))
            rec = rec_res.scalar_one_or_none()
            if rec:
                record_title = rec.title

        # Notify Target Doctor if specified
        if data.target_doctor_id:
            await NotificationService.send_notification(
                db,
                user_id=data.target_doctor_id,
                title="Medical Record Request",
                message=f"Dr. {req_doc_name} requested medical records for patient {patient_name}. Reason: {data.reason}",
                type="RECORD",
            )

        # Notify Patient
        await NotificationService.send_notification(
            db,
            user_id=data.patient_id,
            title="Record Access Requested",
            message=f"Dr. {req_doc_name} requested access to your medical records for clinical review.",
            type="RECORD",
        )

        return RecordRequestResponse(
            id=record_req.id,
            patient_id=record_req.patient_id,
            requesting_doctor_id=record_req.requesting_doctor_id,
            target_doctor_id=record_req.target_doctor_id,
            record_id=record_req.record_id,
            reason=record_req.reason,
            status=record_req.status,
            created_at=record_req.created_at,
            patient_name=patient_name,
            requesting_doctor_name=req_doc_name,
            target_doctor_name=target_doc_name,
            record_title=record_title,
        )

    @staticmethod
    async def list_incoming_record_requests(
        db: AsyncSession, doctor_id: uuid.UUID
    ) -> List[RecordRequestResponse]:
        stmt = (
            select(RecordRequest)
            .where(RecordRequest.target_doctor_id == doctor_id)
            .order_by(RecordRequest.created_at.desc())
        )
        res = await db.execute(stmt)
        requests = res.scalars().all()

        enriched = []
        for r in requests:
            pat_name, req_doc, target_doc = await DoctorCollaborationService._get_names(
                db, r.patient_id, r.requesting_doctor_id, r.target_doctor_id
            )
            rec_title = None
            if r.record_id:
                rec_res = await db.execute(select(MedicalRecord).where(MedicalRecord.id == r.record_id))
                rec = rec_res.scalar_one_or_none()
                if rec:
                    rec_title = rec.title

            enriched.append(
                RecordRequestResponse(
                    id=r.id,
                    patient_id=r.patient_id,
                    requesting_doctor_id=r.requesting_doctor_id,
                    target_doctor_id=r.target_doctor_id,
                    record_id=r.record_id,
                    reason=r.reason,
                    status=r.status,
                    created_at=r.created_at,
                    patient_name=pat_name,
                    requesting_doctor_name=req_doc,
                    target_doctor_name=target_doc,
                    record_title=rec_title,
                )
            )
        return enriched

    @staticmethod
    async def list_outgoing_record_requests(
        db: AsyncSession, doctor_id: uuid.UUID
    ) -> List[RecordRequestResponse]:
        stmt = (
            select(RecordRequest)
            .where(RecordRequest.requesting_doctor_id == doctor_id)
            .order_by(RecordRequest.created_at.desc())
        )
        res = await db.execute(stmt)
        requests = res.scalars().all()

        enriched = []
        for r in requests:
            pat_name, req_doc, target_doc = await DoctorCollaborationService._get_names(
                db, r.patient_id, r.requesting_doctor_id, r.target_doctor_id
            )
            rec_title = None
            if r.record_id:
                rec_res = await db.execute(select(MedicalRecord).where(MedicalRecord.id == r.record_id))
                rec = rec_res.scalar_one_or_none()
                if rec:
                    rec_title = rec.title

            enriched.append(
                RecordRequestResponse(
                    id=r.id,
                    patient_id=r.patient_id,
                    requesting_doctor_id=r.requesting_doctor_id,
                    target_doctor_id=r.target_doctor_id,
                    record_id=r.record_id,
                    reason=r.reason,
                    status=r.status,
                    created_at=r.created_at,
                    patient_name=pat_name,
                    requesting_doctor_name=req_doc,
                    target_doctor_name=target_doc,
                    record_title=rec_title,
                )
            )
        return enriched

    @staticmethod
    async def approve_record_request(
        db: AsyncSession, request_id: uuid.UUID, doctor_id: uuid.UUID
    ) -> RecordRequestResponse:
        stmt = select(RecordRequest).where(RecordRequest.id == request_id)
        res = await db.execute(stmt)
        req = res.scalar_one_or_none()
        if not req:
            raise HTTPException(status_code=404, detail="Record request not found")

        if req.target_doctor_id and req.target_doctor_id != doctor_id:
            raise HTTPException(status_code=403, detail="Unauthorized to approve this request")

        req.status = RecordRequestStatus.APPROVED

        # If specific record was requested, grant permission
        if req.record_id:
            perm = RecordPermission(
                id=uuid.uuid4(),
                record_id=req.record_id,
                granted_to=req.requesting_doctor_id,
                granted_by=doctor_id,
                access_level="READ",
            )
            db.add(perm)
        else:
            # Grant access to patient's records
            records_stmt = select(MedicalRecord).where(MedicalRecord.patient_id == req.patient_id)
            rec_res = await db.execute(records_stmt)
            for rec in rec_res.scalars().all():
                perm = RecordPermission(
                    id=uuid.uuid4(),
                    record_id=rec.id,
                    granted_to=req.requesting_doctor_id,
                    granted_by=doctor_id,
                    access_level="READ",
                )
                db.add(perm)

        await db.commit()
        await db.refresh(req)

        pat_name, req_doc, target_doc = await DoctorCollaborationService._get_names(
            db, req.patient_id, req.requesting_doctor_id, doctor_id
        )

        # Notify requesting doctor
        await NotificationService.send_notification(
            db,
            user_id=req.requesting_doctor_id,
            title="Record Request Approved",
            message=f"Dr. {target_doc} approved your request for patient {pat_name}'s medical records. You now have access.",
            type="RECORD",
        )

        return RecordRequestResponse(
            id=req.id,
            patient_id=req.patient_id,
            requesting_doctor_id=req.requesting_doctor_id,
            target_doctor_id=req.target_doctor_id,
            record_id=req.record_id,
            reason=req.reason,
            status=req.status,
            created_at=req.created_at,
            patient_name=pat_name,
            requesting_doctor_name=req_doc,
            target_doctor_name=target_doc,
        )

    @staticmethod
    async def reject_record_request(
        db: AsyncSession, request_id: uuid.UUID, doctor_id: uuid.UUID
    ) -> RecordRequestResponse:
        stmt = select(RecordRequest).where(RecordRequest.id == request_id)
        res = await db.execute(stmt)
        req = res.scalar_one_or_none()
        if not req:
            raise HTTPException(status_code=404, detail="Record request not found")

        if req.target_doctor_id and req.target_doctor_id != doctor_id:
            raise HTTPException(status_code=403, detail="Unauthorized to decline this request")

        req.status = RecordRequestStatus.REJECTED
        await db.commit()
        await db.refresh(req)

        pat_name, req_doc, target_doc = await DoctorCollaborationService._get_names(
            db, req.patient_id, req.requesting_doctor_id, doctor_id
        )

        # Notify requesting doctor
        await NotificationService.send_notification(
            db,
            user_id=req.requesting_doctor_id,
            title="Record Request Declined",
            message=f"Dr. {target_doc} was unable to grant access to patient {pat_name}'s records at this time.",
            type="RECORD",
        )

        return RecordRequestResponse(
            id=req.id,
            patient_id=req.patient_id,
            requesting_doctor_id=req.requesting_doctor_id,
            target_doctor_id=req.target_doctor_id,
            record_id=req.record_id,
            reason=req.reason,
            status=req.status,
            created_at=req.created_at,
            patient_name=pat_name,
            requesting_doctor_name=req_doc,
            target_doctor_name=target_doc,
        )

    # ─── Doctor Referrals ──────────────────────────────────────────

    @staticmethod
    async def create_referral(
        db: AsyncSession, referring_doctor_id: uuid.UUID, data: DoctorReferralCreate
    ) -> DoctorReferralResponse:
        referral = DoctorReferral(
            id=uuid.uuid4(),
            patient_id=data.patient_id,
            referring_doctor_id=referring_doctor_id,
            referred_to_doctor_id=data.referred_to_doctor_id,
            specialization=data.specialization,
            reason=data.reason,
            notes=data.notes,
            status=ReferralStatus.PENDING,
        )
        db.add(referral)
        await db.commit()
        await db.refresh(referral)

        pat_name, ref_doc, target_doc = await DoctorCollaborationService._get_names(
            db, data.patient_id, referring_doctor_id, data.referred_to_doctor_id
        )

        # Notify Receiving Doctor
        spec_text = f" ({data.specialization})" if data.specialization else ""
        await NotificationService.send_notification(
            db,
            user_id=data.referred_to_doctor_id,
            title="New Patient Referral",
            message=f"Dr. {ref_doc} referred patient {pat_name}{spec_text} to you. Reason: {data.reason}",
            type="REFERRAL",
        )

        # Notify Patient
        await NotificationService.send_notification(
            db,
            user_id=data.patient_id,
            title="Doctor Referral",
            message=f"Dr. {ref_doc} referred you to Dr. {target_doc}{spec_text} for further clinical consultation.",
            type="REFERRAL",
        )

        return DoctorReferralResponse(
            id=referral.id,
            patient_id=referral.patient_id,
            referring_doctor_id=referral.referring_doctor_id,
            referred_to_doctor_id=referral.referred_to_doctor_id,
            specialization=referral.specialization,
            reason=referral.reason,
            notes=referral.notes,
            status=referral.status,
            created_at=referral.created_at,
            patient_name=pat_name,
            referring_doctor_name=ref_doc,
            referred_to_doctor_name=target_doc,
        )

    @staticmethod
    async def list_incoming_referrals(
        db: AsyncSession, doctor_id: uuid.UUID
    ) -> List[DoctorReferralResponse]:
        stmt = (
            select(DoctorReferral)
            .where(DoctorReferral.referred_to_doctor_id == doctor_id)
            .order_by(DoctorReferral.created_at.desc())
        )
        res = await db.execute(stmt)
        referrals = res.scalars().all()

        enriched = []
        for ref in referrals:
            pat_name, ref_doc, target_doc = await DoctorCollaborationService._get_names(
                db, ref.patient_id, ref.referring_doctor_id, ref.referred_to_doctor_id
            )
            enriched.append(
                DoctorReferralResponse(
                    id=ref.id,
                    patient_id=ref.patient_id,
                    referring_doctor_id=ref.referring_doctor_id,
                    referred_to_doctor_id=ref.referred_to_doctor_id,
                    specialization=ref.specialization,
                    reason=ref.reason,
                    notes=ref.notes,
                    status=ref.status,
                    created_at=ref.created_at,
                    patient_name=pat_name,
                    referring_doctor_name=ref_doc,
                    referred_to_doctor_name=target_doc,
                )
            )
        return enriched

    @staticmethod
    async def list_outgoing_referrals(
        db: AsyncSession, doctor_id: uuid.UUID
    ) -> List[DoctorReferralResponse]:
        stmt = (
            select(DoctorReferral)
            .where(DoctorReferral.referring_doctor_id == doctor_id)
            .order_by(DoctorReferral.created_at.desc())
        )
        res = await db.execute(stmt)
        referrals = res.scalars().all()

        enriched = []
        for ref in referrals:
            pat_name, ref_doc, target_doc = await DoctorCollaborationService._get_names(
                db, ref.patient_id, ref.referring_doctor_id, ref.referred_to_doctor_id
            )
            enriched.append(
                DoctorReferralResponse(
                    id=ref.id,
                    patient_id=ref.patient_id,
                    referring_doctor_id=ref.referring_doctor_id,
                    referred_to_doctor_id=ref.referred_to_doctor_id,
                    specialization=ref.specialization,
                    reason=ref.reason,
                    notes=ref.notes,
                    status=ref.status,
                    created_at=ref.created_at,
                    patient_name=pat_name,
                    referring_doctor_name=ref_doc,
                    referred_to_doctor_name=target_doc,
                )
            )
        return enriched

    @staticmethod
    async def accept_referral(
        db: AsyncSession, referral_id: uuid.UUID, doctor_id: uuid.UUID
    ) -> DoctorReferralResponse:
        stmt = select(DoctorReferral).where(DoctorReferral.id == referral_id)
        res = await db.execute(stmt)
        ref = res.scalar_one_or_none()
        if not ref:
            raise HTTPException(status_code=404, detail="Referral not found")

        if ref.referred_to_doctor_id != doctor_id:
            raise HTTPException(status_code=403, detail="Unauthorized to accept this referral")

        ref.status = ReferralStatus.ACCEPTED

        # Grant access to patient's records so the referred doctor can review medical history
        records_stmt = select(MedicalRecord).where(MedicalRecord.patient_id == ref.patient_id)
        rec_res = await db.execute(records_stmt)
        for rec in rec_res.scalars().all():
            perm = RecordPermission(
                id=uuid.uuid4(),
                record_id=rec.id,
                granted_to=doctor_id,
                granted_by=ref.referring_doctor_id,
                access_level="READ",
            )
            db.add(perm)

        await db.commit()
        await db.refresh(ref)

        pat_name, ref_doc, target_doc = await DoctorCollaborationService._get_names(
            db, ref.patient_id, ref.referring_doctor_id, doctor_id
        )

        # Notify Referring Doctor
        await NotificationService.send_notification(
            db,
            user_id=ref.referring_doctor_id,
            title="Referral Accepted",
            message=f"Dr. {target_doc} accepted your referral for patient {pat_name}.",
            type="REFERRAL",
        )

        # Notify Patient
        await NotificationService.send_notification(
            db,
            user_id=ref.patient_id,
            title="Referral Accepted",
            message=f"Dr. {target_doc} accepted your referral and is ready for your consultation.",
            type="REFERRAL",
        )

        return DoctorReferralResponse(
            id=ref.id,
            patient_id=ref.patient_id,
            referring_doctor_id=ref.referring_doctor_id,
            referred_to_doctor_id=ref.referred_to_doctor_id,
            specialization=ref.specialization,
            reason=ref.reason,
            notes=ref.notes,
            status=ref.status,
            created_at=ref.created_at,
            patient_name=pat_name,
            referring_doctor_name=ref_doc,
            referred_to_doctor_name=target_doc,
        )

    @staticmethod
    async def decline_referral(
        db: AsyncSession, referral_id: uuid.UUID, doctor_id: uuid.UUID
    ) -> DoctorReferralResponse:
        stmt = select(DoctorReferral).where(DoctorReferral.id == referral_id)
        res = await db.execute(stmt)
        ref = res.scalar_one_or_none()
        if not ref:
            raise HTTPException(status_code=404, detail="Referral not found")

        if ref.referred_to_doctor_id != doctor_id:
            raise HTTPException(status_code=403, detail="Unauthorized to decline this referral")

        ref.status = ReferralStatus.DECLINED
        await db.commit()
        await db.refresh(ref)

        pat_name, ref_doc, target_doc = await DoctorCollaborationService._get_names(
            db, ref.patient_id, ref.referring_doctor_id, doctor_id
        )

        # Notify Referring Doctor
        await NotificationService.send_notification(
            db,
            user_id=ref.referring_doctor_id,
            title="Referral Declined",
            message=f"Dr. {target_doc} was unable to accept the referral for patient {pat_name}.",
            type="REFERRAL",
        )

        return DoctorReferralResponse(
            id=ref.id,
            patient_id=ref.patient_id,
            referring_doctor_id=ref.referring_doctor_id,
            referred_to_doctor_id=ref.referred_to_doctor_id,
            specialization=ref.specialization,
            reason=ref.reason,
            notes=ref.notes,
            status=ref.status,
            created_at=ref.created_at,
            patient_name=pat_name,
            referring_doctor_name=ref_doc,
            referred_to_doctor_name=target_doc,
        )

    @staticmethod
    async def list_doctors_directory(
        db: AsyncSession, exclude_user_id: Optional[uuid.UUID] = None
    ) -> List[DoctorDirectoryItem]:
        stmt = select(Doctor).order_by(Doctor.full_name.asc())
        if exclude_user_id:
            stmt = stmt.where(Doctor.user_id != exclude_user_id)
        res = await db.execute(stmt)
        docs = res.scalars().all()
        return [
            DoctorDirectoryItem(
                id=d.id,
                user_id=d.user_id,
                full_name=d.full_name,
                specialization=d.specialization,
                hospital_name=d.hospital_name,
                clinic_name=d.clinic_name,
            )
            for d in docs
        ]
