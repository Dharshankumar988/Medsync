from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.models.record import ConsentHistory

class ConsentService:
    @staticmethod
    async def log_consent_change(db: AsyncSession, patient_id: uuid.UUID, doctor_id: uuid.UUID, action: str):
        log = ConsentHistory(patient_id=patient_id, doctor_id=doctor_id, action=action)
        db.add(log)
        await db.commit()
        print(f"BLOCKCHAIN: Logging consent {action} for Patient {patient_id} and Doctor {doctor_id}")
        print(f"NOTIFICATION: Patient {patient_id} {action} consent for Doctor {doctor_id}")
