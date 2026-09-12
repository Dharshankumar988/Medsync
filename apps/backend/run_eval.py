import asyncio
from app.database.session import AsyncSessionLocal
from sqlalchemy import select
from app.models.security import PatientSecurityCredential, PatientBiometricProfile

async def main():
    async with AsyncSessionLocal() as db:
        pin_res = await db.execute(select(PatientSecurityCredential))
        pins = pin_res.scalars().all()
        print(f"PINS: {len(pins)}")
        face_res = await db.execute(select(PatientBiometricProfile))
        faces = face_res.scalars().all()
        print(f"FACES: {len(faces)}")

asyncio.run(main())
