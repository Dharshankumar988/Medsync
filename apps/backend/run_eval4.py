import asyncio
import uuid
from app.database.session import AsyncSessionLocal
from sqlalchemy import select
from app.models.security import PatientSecurityCredential, PatientBiometricProfile

async def get_security_status(db, patient_id: uuid.UUID) -> str:
    pin_result = await db.execute(select(PatientSecurityCredential).where(PatientSecurityCredential.patient_id == patient_id))
    has_pin = pin_result.scalar_one_or_none() is not None
    
    face_result = await db.execute(select(PatientBiometricProfile).where(PatientBiometricProfile.patient_id == patient_id))
    has_face = face_result.scalar_one_or_none() is not None
    
    if has_pin and has_face:
        return "COMPLETED"
    elif has_pin:
        return "PIN_CREATED"
    else:
        return "NOT_STARTED"

async def main():
    async with AsyncSessionLocal() as db:
        pin_res = await db.execute(select(PatientSecurityCredential))
        pins = pin_res.scalars().all()
        if not pins:
            print("NO PINS")
            return
        
        patient_id = pins[0].patient_id
        status = await get_security_status(db, patient_id)
        print(f"Status for {patient_id}: {status}")

asyncio.run(main())
