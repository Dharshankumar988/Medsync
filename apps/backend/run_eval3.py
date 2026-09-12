import asyncio
from app.database.session import AsyncSessionLocal
from sqlalchemy import select
from app.models.security import PatientSecurityCredential, PatientBiometricProfile

async def main():
    async with AsyncSessionLocal() as db:
        pin_res = await db.execute(select(PatientSecurityCredential))
        pins = pin_res.scalars().all()
        for p in pins:
            print(f"PIN is_active: {p.is_active}")
            
        face_res = await db.execute(select(PatientBiometricProfile))
        faces = face_res.scalars().all()
        for f in faces:
            print(f"FACE enrollment_status: {f.enrollment_status}")

asyncio.run(main())
