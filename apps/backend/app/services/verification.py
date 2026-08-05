import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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
            
            if user.role.value == "DOCTOR":
                from app.models.doctor import Doctor
                doc_stmt = select(Doctor).where(Doctor.user_id == user.id)
                doc_result = await db.execute(doc_stmt)
                doctor = doc_result.scalar_one_or_none()
                if doctor:
                    doctor.doctor_status = "ACTIVE"
                    doctor.approval_date = datetime.now(timezone.utc)
                    doctor.approved_by = admin_id
            
        await db.commit()
        await db.refresh(req)
        
        # Enqueue Blockchain Sync
        if user:
            # Need to get role properly
            role = user.role
            try:
                from app.services.blockchain_sync import BlockchainSyncService
                from app.models.blockchain import SyncEntityType, SyncActionType
                
                entity_type = None
                if role == "DOCTOR" or role.value == "DOCTOR":
                    entity_type = SyncEntityType.DOCTOR
                elif role == "PHARMACY" or role.value == "PHARMACY":
                    entity_type = SyncEntityType.PHARMACY
                
                if entity_type:
                    await BlockchainSyncService.enqueue_sync_task(
                        db=db,
                        entity_type=entity_type,
                        entity_id=user.id,
                        action_type=SyncActionType.CREATE
                    )
                    await db.commit()
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
