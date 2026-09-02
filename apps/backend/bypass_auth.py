
import asyncio
from app.database.session import SessionLocal
from app.models.user import User, UserRole, UserStatus
import uuid

async def create_mock_user():
    async with SessionLocal() as db:
        user_id = uuid.UUID('12345678-1234-5678-1234-567812345678')
        user = User(
            id=user_id,
            email='testagent@medsync.com',
            password_hash='mock',
            role=UserRole.PATIENT,
            status=UserStatus.ACTIVE,
            is_verified=True
        )
        db.add(user)
        try:
            await db.commit()
            print('Mock user created.')
        except Exception as e:
            print('User might already exist:', e)

asyncio.run(create_mock_user())

