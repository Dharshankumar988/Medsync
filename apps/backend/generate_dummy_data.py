import asyncio
import uuid
import sys
import os

# Add backend dir to python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, date

from app.database.session import AsyncSessionLocal
from app.models.user import User, UserRole, UserStatus
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.pharmacy import Pharmacy
from app.models.blockchain import SyncEntityType, SyncActionType
from app.services.blockchain_sync import BlockchainSyncService

def get_uuid(index: int, prefix: str) -> str:
    # A deterministic UUID based on prefix and index for idempotency
    # UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    h = f"{prefix}{index}".ljust(32, '0').encode('utf-8').hex()[:32]
    return f"{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"

async def seed_users():
    async with AsyncSessionLocal() as db:
        print("Starting dummy data generation...")
        
        # 5 Patients
        for i in range(1, 6):
            email = f"patient{i}@demo.com"
            user_id = uuid.UUID(get_uuid(i, "pat"))
            existing_user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
            if not existing_user:
                print(f"Creating patient user: {email}")
                user = User(
                    id=user_id,
                    email=email,
                    password_hash="supabase-managed-account",
                    role=UserRole.PATIENT,
                    status=UserStatus.ACTIVE,
                )
                db.add(user)
                
                patient = Patient(
                    id=user_id,
                    user_id=user_id,
                    full_name=f"Patient Demo {i}",
                    date_of_birth="1990-01-01",
                    gender="MALE" if i % 2 == 0 else "FEMALE",
                    blood_group="O+"
                )
                db.add(patient)
                await db.flush()
                
                # Enqueue blockchain sync
                await BlockchainSyncService.enqueue_sync_task(
                    db=db,
                    entity_type=SyncEntityType.PATIENT,
                    entity_id=user_id,
                    action_type=SyncActionType.CREATE,
                    payload={"role": "PATIENT", "email": email}
                )
        
        # 3 Doctors
        for i in range(1, 4):
            email = f"doctor{i}@demo.com"
            user_id = uuid.UUID(get_uuid(i, "doc"))
            existing_user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
            if not existing_user:
                print(f"Creating doctor user: {email}")
                user = User(
                    id=user_id,
                    email=email,
                    password_hash="supabase-managed-account",
                    role=UserRole.DOCTOR,
                    status=UserStatus.ACTIVE,
                )
                db.add(user)
                
                doctor = Doctor(
                    id=user_id,
                    user_id=user_id,
                    full_name=f"Doctor Demo {i}",
                    specialization="General Medicine",
                    license_number=f"LIC{i}000{i}"
                )
                db.add(doctor)
                await db.flush()
                
                # Enqueue blockchain sync
                await BlockchainSyncService.enqueue_sync_task(
                    db=db,
                    entity_type=SyncEntityType.DOCTOR,
                    entity_id=user_id,
                    action_type=SyncActionType.CREATE,
                    payload={"role": "DOCTOR", "email": email}
                )
                
        # 2 Pharmacies
        for i in range(1, 3):
            email = f"pharmacy{i}@demo.com"
            user_id = uuid.UUID(get_uuid(i, "pha"))
            existing_user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
            if not existing_user:
                print(f"Creating pharmacy user: {email}")
                user = User(
                    id=user_id,
                    email=email,
                    password_hash="supabase-managed-account",
                    role=UserRole.PHARMACY,
                    status=UserStatus.ACTIVE,
                )
                db.add(user)
                
                pharmacy = Pharmacy(
                    id=user_id,
                    user_id=user_id,
                    business_name=f"Demo Pharmacy {i}",
                    license_number=f"PHARMLIC{i}00{i}"
                )
                db.add(pharmacy)
                await db.flush()
                
                # Enqueue blockchain sync
                await BlockchainSyncService.enqueue_sync_task(
                    db=db,
                    entity_type=SyncEntityType.PHARMACY,
                    entity_id=user_id,
                    action_type=SyncActionType.CREATE,
                    payload={"role": "PHARMACY", "email": email}
                )

        await db.commit()
        print("Dummy data generation completed.")

if __name__ == "__main__":
    asyncio.run(seed_users())
