import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.medical_history_share import MedicalHistoryShare
from app.schemas.consultation import MedicalHistoryShareCreate, MedicalHistoryShareResponse
from app.core.exceptions import NotFoundException, ForbiddenException
from app.services.blockchain_sync import BlockchainSyncService
from app.models.blockchain import SyncEntityType, SyncActionType


class MedicalHistoryShareService:
    """Service for managing controlled medical history sharing between doctors and patients."""

    @staticmethod
    async def share_history(
        db: AsyncSession, doctor_id: uuid.UUID, data: MedicalHistoryShareCreate
    ) -> MedicalHistoryShare:
        expires_at = None
        if data.expires_in_days:
            expires_at = datetime.now(timezone.utc) + timedelta(days=data.expires_in_days)

        share = MedicalHistoryShare(
            id=uuid.uuid4(),
            patient_id=data.patient_id,
            doctor_id=doctor_id,
            appointment_id=data.appointment_id,
            consultation_id=data.consultation_id,
            shared_records=data.shared_records,
            access_scope=data.access_scope,
            expires_at=expires_at,
        )
        db.add(share)
        await db.flush()

        await BlockchainSyncService.enqueue_sync_task(
            db,
            entity_type=SyncEntityType.MEDICAL_RECORD,
            entity_id=share.id,
            action_type=SyncActionType.GRANT_ACCESS,
            payload={
                "patient_id": str(data.patient_id),
                "doctor_id": str(doctor_id),
                "shared_records": data.shared_records
            }
        )

        await db.commit()
        await db.refresh(share)
        return share

    @staticmethod
    async def revoke_share(
        db: AsyncSession, share_id: uuid.UUID, user_id: uuid.UUID
    ) -> MedicalHistoryShare:
        stmt = select(MedicalHistoryShare).where(MedicalHistoryShare.id == share_id)
        result = await db.execute(stmt)
        share = result.scalar_one_or_none()

        if not share:
            raise NotFoundException("Medical history share not found")
        if share.doctor_id != user_id and share.patient_id != user_id:
            raise ForbiddenException("Not authorized to revoke this share")
        if share.revoked_at is not None:
            return share  # Already revoked

        share.revoked_at = datetime.now(timezone.utc)
        
        await BlockchainSyncService.enqueue_sync_task(
            db,
            entity_type=SyncEntityType.MEDICAL_RECORD,
            entity_id=share.id,
            action_type=SyncActionType.REVOKE_ACCESS,
            payload={
                "patient_id": str(share.patient_id),
                "doctor_id": str(share.doctor_id),
                "shared_records": share.shared_records
            }
        )

        await db.commit()
        await db.refresh(share)
        return share

    @staticmethod
    async def get_shares_for_patient(
        db: AsyncSession, patient_id: uuid.UUID
    ) -> list[MedicalHistoryShare]:
        stmt = (
            select(MedicalHistoryShare)
            .where(MedicalHistoryShare.patient_id == patient_id)
            .where(MedicalHistoryShare.revoked_at.is_(None))
            .order_by(MedicalHistoryShare.created_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_shares_for_doctor(
        db: AsyncSession, doctor_id: uuid.UUID
    ) -> list[MedicalHistoryShare]:
        stmt = (
            select(MedicalHistoryShare)
            .where(MedicalHistoryShare.doctor_id == doctor_id)
            .where(MedicalHistoryShare.revoked_at.is_(None))
            .order_by(MedicalHistoryShare.created_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_share(
        db: AsyncSession, share_id: uuid.UUID, user_id: uuid.UUID
    ) -> MedicalHistoryShare:
        stmt = select(MedicalHistoryShare).where(MedicalHistoryShare.id == share_id)
        result = await db.execute(stmt)
        share = result.scalar_one_or_none()

        if not share:
            raise NotFoundException("Medical history share not found")
        if share.doctor_id != user_id and share.patient_id != user_id:
            raise ForbiddenException("Not authorized to view this share")
        return share
