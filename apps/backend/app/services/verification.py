import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.verification import VerificationRequest, VerificationStatus
from app.models.user import User, UserStatus
from app.core.exceptions import NotFoundException, BadRequestException

class VerificationService:
    @staticmethod
    async def approve_request(db: AsyncSession, request_id: uuid.UUID, admin_id: uuid.UUID) -> VerificationRequest:
        stmt = select(VerificationRequest).where(VerificationRequest.id == request_id)
        result = await db.execute(stmt)
        req = result.scalar_one_or_none()
        
        if not req:
            raise NotFoundException("Verification request not found")
        
        if req.status == VerificationStatus.APPROVED:
            raise BadRequestException("Request is already approved")
            
        # Update verification request
        req.status = VerificationStatus.APPROVED
        req.reviewer_id = admin_id
        req.approval_date = datetime.now(timezone.utc)
        
        # Update user status to active
        user_stmt = select(User).where(User.id == req.user_id)
        user_result = await db.execute(user_stmt)
        user = user_result.scalar_one_or_none()
        
        if user:
            user.status = UserStatus.ACTIVE
            user.is_verified = True
            
            if user.role.value == "DOCTOR":
                from app.models.doctor import Doctor
                from app.models.hospital import Hospital
                from app.models.doctor_location import DoctorLocation, LocationVerificationStatus
                from app.api.v1.endpoints.hospitals import _hospitals_cache
                
                doc_stmt = select(Doctor).where(Doctor.user_id == user.id)
                doc_result = await db.execute(doc_stmt)
                doctor = doc_result.scalar_one_or_none()
                if doctor:
                    doctor.doctor_status = "ACTIVE"
                    doctor.approval_date = datetime.now(timezone.utc)
                    doctor.approved_by = admin_id

                    # Automatically verify all private clinics registered by this doctor
                    clinic_stmt = select(Hospital).where(
                        (Hospital.user_id == user.id) & (Hospital.type == "clinic")
                    )
                    clinic_res = await db.execute(clinic_stmt)
                    for clinic in clinic_res.scalars().all():
                        clinic.is_verified = True
                        clinic.is_active = True

                    if doctor.hospital_id:
                        linked_hosp_stmt = select(Hospital).where(
                            (Hospital.id == doctor.hospital_id) & (Hospital.type == "clinic")
                        )
                        linked_hosp_res = await db.execute(linked_hosp_stmt)
                        linked_clinic = linked_hosp_res.scalar_one_or_none()
                        if linked_clinic:
                            linked_clinic.is_verified = True
                            linked_clinic.is_active = True

                    if doctor.clinic_name:
                        c_name_stmt = select(Hospital).where(
                            (func.lower(Hospital.name) == doctor.clinic_name.strip().lower()) & (Hospital.type == "clinic")
                        )
                        c_name_res = await db.execute(c_name_stmt)
                        for c in c_name_res.scalars().all():
                            c.is_verified = True
                            c.is_active = True

                    # Automatically verify all doctor practice locations
                    locs_stmt = select(DoctorLocation).where(DoctorLocation.doctor_id == doctor.id)
                    locs_res = await db.execute(locs_stmt)
                    for loc in locs_res.scalars().all():
                        loc.verification_status = LocationVerificationStatus.APPROVED
                        loc.verified_by = admin_id
                        loc.verified_at = datetime.now(timezone.utc)

                    _hospitals_cache.clear()
            elif user.role.value == "PHARMACY":
                from app.models.pharmacy import Pharmacy
                from app.api.v1.endpoints.pharmacy import _generate_qr_identifier
                phm_stmt = select(Pharmacy).where(Pharmacy.user_id == user.id)
                phm_res = await db.execute(phm_stmt)
                pharmacy = phm_res.scalar_one_or_none()
                if pharmacy:
                    if not pharmacy.qr_identifier:
                        pharmacy.qr_identifier = _generate_qr_identifier(user.id)
                    pharmacy.qr_status = "ACTIVE"
            
        await db.commit()
        await db.refresh(req)
        
        # Enqueue Blockchain Sync
        if user:
            role = user.role
            try:
                from app.services.blockchain_sync import BlockchainSyncService, trigger_background_sync
                from app.models.blockchain import SyncEntityType, SyncActionType
                
                entity_type = None
                payload = {}
                if role == "DOCTOR" or role.value == "DOCTOR":
                    entity_type = SyncEntityType.DOCTOR
                    doc_lic = getattr(doctor, "license_number", None) if "doctor" in locals() and doctor else str(user.id)
                    payload = {"doctor_id": str(user.id), "license_hash": doc_lic, "license_number": doc_lic}
                elif role == "PHARMACY" or role.value == "PHARMACY":
                    entity_type = SyncEntityType.PHARMACY
                    phm_lic = getattr(pharmacy, "license_number", None) if "pharmacy" in locals() and pharmacy else str(user.id)
                    payload = {"pharmacy_id": str(user.id), "license_hash": phm_lic, "license_number": phm_lic}
                
                if entity_type:
                    task = await BlockchainSyncService.enqueue_sync_task(
                        db=db,
                        entity_type=entity_type,
                        entity_id=user.id,
                        action_type=SyncActionType.VERIFY,
                        payload=payload
                    )
                    await db.commit()
                    trigger_background_sync(task.id)
            except Exception as e:
                print(f"Error enqueueing blockchain task for verification: {e}")
        
        return req

    @staticmethod
    async def reject_request(db: AsyncSession, request_id: uuid.UUID, admin_id: uuid.UUID, reason: str) -> VerificationRequest:
        stmt = select(VerificationRequest).where(VerificationRequest.id == request_id)
        result = await db.execute(stmt)
        req = result.scalar_one_or_none()
        
        if not req:
            raise NotFoundException("Verification request not found")
            
        if req.status == VerificationStatus.REJECTED:
            raise BadRequestException("Request is already rejected")
            
        req.status = VerificationStatus.REJECTED
        req.reviewer_id = admin_id
        req.review_date = datetime.now(timezone.utc)
        req.rejection_reason = reason
        
        user_stmt = select(User).where(User.id == req.user_id)
        user_result = await db.execute(user_stmt)
        user = user_result.scalar_one_or_none()
        if user and user.role.value == "DOCTOR":
            from app.models.doctor import Doctor
            doc_stmt = select(Doctor).where(Doctor.user_id == user.id)
            doc_result = await db.execute(doc_stmt)
            doctor = doc_result.scalar_one_or_none()
            if doctor:
                doctor.doctor_status = "REJECTED"
                doctor.approval_notes = reason
                doctor.approval_date = datetime.now(timezone.utc)
                doctor.approved_by = admin_id
        
        await db.commit()
        await db.refresh(req)
        
        return req
