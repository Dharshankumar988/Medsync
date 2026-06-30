import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import AsyncSessionLocal
from app.models.user import User, UserRole, UserStatus
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.pharmacy import Pharmacy
from app.core.security import get_password_hash
import uuid

DEMO_USERS = [
    {"email": "patient@demo.com", "password": "Demo@1234", "role": UserRole.PATIENT, "status": UserStatus.ACTIVE},
    {"email": "patient2@demo.com", "password": "Demo@1234", "role": UserRole.PATIENT, "status": UserStatus.ACTIVE},
    {"email": "doctor@demo.com", "password": "Demo@1234", "role": UserRole.DOCTOR, "status": UserStatus.ACTIVE},
    {"email": "doctor2@demo.com", "password": "Demo@1234", "role": UserRole.DOCTOR, "status": UserStatus.PENDING},
    {"email": "pharmacy@demo.com", "password": "Demo@1234", "role": UserRole.PHARMACY, "status": UserStatus.ACTIVE},
    {"email": "admin@demo.com", "password": "Admin@1234", "role": UserRole.ADMIN, "status": UserStatus.ACTIVE},
]

async def seed_database():
    async with AsyncSessionLocal() as db:
        for u in DEMO_USERS:
            from sqlalchemy import select
            existing = await db.execute(select(User).where(User.email == u["email"]))
            if existing.scalar_one_or_none():
                continue
            user = User(
                id=str(uuid.uuid4()),
                email=u["email"],
                password_hash=get_password_hash(u["password"]),
                role=u["role"],
                status=u["status"],
            )
            db.add(user)
        await db.commit()
    print("Database seeded with demo accounts.")

if __name__ == "__main__":
    asyncio.run(seed_database())
