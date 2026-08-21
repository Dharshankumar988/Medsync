from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies.db import get_db
from app.schemas.response import APIResponse
from app.schemas.user import UserSyncRequest
from app.models.user import User, UserRole, UserStatus
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.pharmacy import Pharmacy
from app.models.doctor_location import DoctorLocation
from app.models.verification import VerificationRequest, VerificationStatus, RoleType

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

    # Determine status (Patients are active and verified, others pending verification)
    is_patient = payload.role == UserRole.PATIENT
    new_status = UserStatus.ACTIVE if is_patient else UserStatus.PENDING

    # Create base user
    new_user = User(
        id=payload.id,
        email=payload.email,
        password_hash="supabase_managed",
        role=payload.role,
        status=new_status,
        is_verified=is_patient,
        profile_completion_percentage=80 if is_patient else 40
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
            full_name=payload.full_name,
            hospital_name=payload.hospital_name,
            hospital_address=payload.hospital_address,
            hospital_id=payload.hospital_id,
            clinic_name=payload.clinic_name,
            clinic_address=payload.clinic_address,
            license_number=payload.license_number or f"LIC-{str(new_user.id)[:8]}",
            experience_years=1,
            consultation_fee=500,
            doctor_status="PENDING"
        )
        db.add(profile)
        await db.flush() # flush to get doctor profile id

        # Add location if private clinic
        if payload.clinic_name and payload.latitude and payload.longitude:
            location = DoctorLocation(
                doctor_id=profile.id,
                location_type="CLINIC",
                location_name=payload.clinic_name,
                address=payload.clinic_address,
                latitude=payload.latitude,
                longitude=payload.longitude,
                is_primary=True,
                is_active=True
            )
            db.add(location)
        elif payload.hospital_id:
            # Add hospital location link
            location = DoctorLocation(
                doctor_id=profile.id,
                location_type="HOSPITAL",
                hospital_id=payload.hospital_id,
                is_primary=True,
                is_active=True
            )
            db.add(location)
        # Create verification request
        vreq = VerificationRequest(
            user_id=new_user.id,
            role_type=RoleType.DOCTOR,
            status=VerificationStatus.PENDING
        )
        db.add(vreq)
    elif payload.role == UserRole.PHARMACY:
        profile = Pharmacy(
            user_id=new_user.id,
            business_name=payload.business_name or payload.full_name,
            license_number=payload.license_number or f"LIC-PHM-{str(new_user.id)[:8]}",
            contact_number=payload.contact_number
        )
        db.add(profile)
        # Create verification request
        vreq = VerificationRequest(
            user_id=new_user.id,
            role_type=RoleType.PHARMACY,
            status=VerificationStatus.PENDING
        )
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
