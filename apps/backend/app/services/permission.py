from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from datetime import datetime
from app.repositories.record import permission_repo
from app.services.consent import ConsentService

class PermissionService:
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
        return {"status": "Permission granted"}
        
    @staticmethod
    async def revoke_permission(db: AsyncSession, record_id: uuid.UUID, patient_id: uuid.UUID, doctor_id: uuid.UUID):
        perm = await permission_repo.get_by_record_and_user(db, record_id, doctor_id)
        if perm:
            await permission_repo.update(db, db_obj=perm, obj_in={"is_revoked": True})
            await ConsentService.log_consent_change(db, patient_id, doctor_id, "REVOKED")
        return {"status": "Permission revoked"}
