import asyncio
from app.database.session import AsyncSessionLocal
from sqlalchemy import select
from app.models.security import PatientSecurityCredential, PatientBiometricProfile

async def test():
    async with AsyncSessionLocal() as db:
        pin_result = await db.execute(select(PatientSecurityCredential))
        pins = pin_result.scalars().all()
        print(f'PINs: {len(pins)}')

        face_result = await db.execute(select(PatientBiometricProfile))
        faces = face_result.scalars().all()
        print(f'Faces: {len(faces)}')

asyncio.run(test())
