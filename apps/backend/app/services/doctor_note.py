from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.repositories.record import doctor_note_repo
from app.schemas.record import DoctorNoteCreate

class DoctorNoteService:
    @staticmethod
    async def add_note(db: AsyncSession, version_id: uuid.UUID, doctor_id: uuid.UUID, req: DoctorNoteCreate):
        note_in = {
            "version_id": version_id,
            "doctor_id": doctor_id,
            "note_text": req.note_text
        }
        return await doctor_note_repo.create(db, obj_in=note_in)
