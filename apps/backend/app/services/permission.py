from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
import uuid
from datetime import datetime
from app.repositories.record import permission_repo
from app.services.consent import ConsentService
from app.services.blockchain_sync import BlockchainSyncService
from app.models.blockchain import SyncEntityType, SyncActionType
from app.models.record import MedicalRecord, RecordPermission

class PermissionService:
    @staticmethod
    async def can_access_patient(db: AsyncSession, doctor_id: uuid.UUID, patient_id: uuid.UUID) -> bool:
        """Verify a doctor's active record grant before exposing PULSE context."""
        stmt = (
            select(RecordPermission.id)
            .join(MedicalRecord, MedicalRecord.id == RecordPermission.record_id)
            .where(
                MedicalRecord.patient_id == patient_id,
                RecordPermission.granted_to == doctor_id,
                RecordPermission.is_revoked.is_(False),
                or_(RecordPermission.expires_at.is_(None), RecordPermission.expires_at >= datetime.utcnow()),
            )
            .limit(1)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none() is not None

    @staticmethod
    async def grant_permission(db: AsyncSession, record_id: uuid.UUID, patient_id: uuid.UUID, doctor_id: uuid.UUID, expires_at: datetime = None):
        perm_in = {
            "record_id": record_id,
            "granted_to": doctor_id,
            "granted_by": patient_id,
            "access_level": "READ",
            "expires_at": expires_at,
            "is_revoked": False
        }
        await permission_repo.create(db, obj_in=perm_in)
        await ConsentService.log_consent_change(db, patient_id, doctor_id, "GRANTED")
        
        await BlockchainSyncService.enqueue_sync_task(
            db,
            entity_type=SyncEntityType.MEDICAL_RECORD,
            entity_id=record_id,
            action_type=SyncActionType.GRANT_ACCESS,
            payload={
                "patient_id": str(patient_id),
                "doctor_id": str(doctor_id)
            }
        )
        await db.commit()
        return {"status": "Permission granted"}
        
    @staticmethod
    async def revoke_permission(db: AsyncSession, record_id: uuid.UUID, patient_id: uuid.UUID, doctor_id: uuid.UUID):
        perm = await permission_repo.get_by_record_and_user(db, record_id, doctor_id)
        if perm:
            await permission_repo.update(db, db_obj=perm, obj_in={"is_revoked": True})
            await ConsentService.log_consent_change(db, patient_id, doctor_id, "REVOKED")
            
            await BlockchainSyncService.enqueue_sync_task(
                db,
                entity_type=SyncEntityType.MEDICAL_RECORD,
                entity_id=record_id,
                action_type=SyncActionType.REVOKE_ACCESS,
                payload={
                    "patient_id": str(patient_id),
                    "doctor_id": str(doctor_id)
                }
            )
            await db.commit()
        return {"status": "Permission revoked"}
        
    @staticmethod
    async def check_permission(db: AsyncSession, record_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        perm = await permission_repo.get_by_record_and_user(db, record_id, user_id)
        if not perm or perm.is_revoked:
            return False
        if perm.expires_at and perm.expires_at.replace(tzinfo=None) < datetime.utcnow():
            return False
        return True
