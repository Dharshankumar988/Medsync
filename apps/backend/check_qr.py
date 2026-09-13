import asyncio
from app.database.session import SessionLocal
from app.models.user import User, UserRole
from app.models.pharmacy import Pharmacy
from sqlalchemy import select
from app.api.v1.endpoints.pharmacy import _generate_qr_identifier

async def check():
    async with SessionLocal() as db:
        # Get first pharmacy
        result = await db.execute(select(Pharmacy).limit(1))
        pharmacy = result.scalar_one_or_none()
        if not pharmacy:
            print("No pharmacy found")
            return
            
        print("Pharmacy ID:", pharmacy.id)
        print("Pharmacy User ID:", pharmacy.user_id)
        print("QR ID:", pharmacy.qr_identifier)
        
        try:
            qr = _generate_qr_identifier(pharmacy.user_id)
            print("Generated:", qr)
        except Exception as e:
            print("Error generating:", e)

if __name__ == "__main__":
    asyncio.run(check())
