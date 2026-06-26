from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import uuid
from app.repositories.base import BaseRepository
from app.models.record import MedicalRecord, MedicalRecordVersion, RecordPermission, DoctorNote
from app.schemas.record import MedicalRecordCreate, MedicalRecordBase

class MedicalRecordRepository(BaseRepository[MedicalRecord, MedicalRecordCreate, MedicalRecordBase]):
    async def get_by_patient(self, db: AsyncSession, patient_id: uuid.UUID, skip: int = 0, limit: int = 100) -> List[MedicalRecord]:
        result = await db.execute(
            select(MedicalRecord)
            .filter(MedicalRecord.patient_id == patient_id, MedicalRecord.deleted_at == None)
            .offset(skip).limit(limit)
        )
        return list(result.scalars().all())

record_repo = MedicalRecordRepository(MedicalRecord)

class RecordVersionRepository(BaseRepository[MedicalRecordVersion, dict, dict]):
    async def get_by_record_id(self, db: AsyncSession, record_id: uuid.UUID) -> List[MedicalRecordVersion]:
        result = await db.execute(select(MedicalRecordVersion).filter(MedicalRecordVersion.record_id == record_id).order_by(MedicalRecordVersion.version_number.desc()))
        return list(result.scalars().all())

record_version_repo = RecordVersionRepository(MedicalRecordVersion)

class RecordPermissionRepository(BaseRepository[RecordPermission, dict, dict]):
    async def get_by_record_and_user(self, db: AsyncSession, record_id: uuid.UUID, user_id: uuid.UUID) -> Optional[RecordPermission]:
        result = await db.execute(select(RecordPermission).filter(RecordPermission.record_id == record_id, RecordPermission.granted_to == user_id, RecordPermission.is_revoked == False))
        return result.scalars().first()

permission_repo = RecordPermissionRepository(RecordPermission)

class DoctorNoteRepository(BaseRepository[DoctorNote, dict, dict]):
    pass

doctor_note_repo = DoctorNoteRepository(DoctorNote)
