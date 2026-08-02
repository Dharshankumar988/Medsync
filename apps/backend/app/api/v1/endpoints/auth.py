from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies.db import get_db
from app.schemas.response import APIResponse
from app.schemas.user import UserSyncRequest
from app.models.user import User, UserRole, UserStatus
from app.models.doctor import Doctor
from app.models.pharmacy import Pharmacy
from app.models.patient import Patient
from app.models.verification import VerificationRequest, VerificationStatus

router = APIRouter()

@router.post("/register", status_code=status.HTTP_410_GONE)
async def register():
    raise HTTPException(status_code=status.HTTP_410_GONE, detail="Use Supabase Auth directly from the client.")

@router.post("/login", status_code=status.HTTP_410_GONE)
async def login():
    raise HTTPException(status_code=status.HTTP_410_GONE, detail="Use Supabase Auth directly from the client.")

@router.post("/sync", response_model=APIResponse[dict])
async def sync_user(payload: UserSyncRequest, db: AsyncSession = Depends(get_db)):
    """
    Called by the frontend immediately after Supabase signup to create the corresponding
    backend records and profiles, along with VerificationRequests if needed.
    """
    # Check if user already exists
    existing = await db.execute(select(User).where(User.id == payload.id))
    if existing.scalar_one_or_none():
        return APIResponse(message="User already synced", data={"id": str(payload.id)})

    if payload.role == UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin creation is not allowed publicly.")

    # Determine status (Patients are active, others pending verification)
    new_status = UserStatus.ACTIVE if payload.role == UserRole.PATIENT else UserStatus.PENDING

    # Create base user
    new_user = User(
        id=payload.id,
        email=payload.email,
        password_hash="supabase_managed",
        role=payload.role,
        status=new_status
    )
    db.add(new_user)
    await db.flush()

    # Create profile
    if payload.role == UserRole.PATIENT:
        profile = Patient(user_id=new_user.id, full_name=payload.full_name)
        db.add(profile)
    elif payload.role == UserRole.DOCTOR:
        profile = Doctor(
            user_id=new_user.id,
            full_name=payload.full_name
        )
        db.add(profile)
        # Create verification request
        vreq = VerificationRequest(user_id=new_user.id, status=VerificationStatus.PENDING)
        db.add(vreq)
    elif payload.role == UserRole.PHARMACY:
        profile = Pharmacy(
            user_id=new_user.id,
            business_name=payload.full_name
        )
        db.add(profile)
        # Create verification request
        vreq = VerificationRequest(user_id=new_user.id, status=VerificationStatus.PENDING)
        db.add(vreq)

    await db.commit()
    
    # Enqueue Blockchain Sync for Patient
    if payload.role == UserRole.PATIENT:
        try:
            from app.services.blockchain_sync import BlockchainSyncService
            from app.models.blockchain import SyncEntityType, SyncActionType
            await BlockchainSyncService.enqueue_sync_task(
                db=db,
                entity_type=SyncEntityType.PATIENT,
                entity_id=new_user.id,
                action_type=SyncActionType.CREATE
            )
            await db.commit()
        except Exception as e:
            print(f"Error enqueueing blockchain task for patient: {e}")

    return APIResponse(message="User synced successfully", data={"id": str(new_user.id)})
