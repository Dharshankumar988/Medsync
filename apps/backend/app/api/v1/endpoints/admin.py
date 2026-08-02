import uuid
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import User, UserRole
from app.models.doctor import Doctor
from app.models.pharmacy import Pharmacy
from app.models.patient import Patient
from app.models.verification import VerificationRequest, VerificationStatus
from app.schemas.response import APIResponse
from app.schemas.session import AuthenticatedPrincipal
from app.services.verification import VerificationService
from app.core.config import settings

router = APIRouter()
require_admin = RoleChecker([UserRole.ADMIN])

async def get_supabase_client():
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=500, detail="Supabase admin credentials not configured")
    
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    return httpx.AsyncClient(base_url=f"{settings.SUPABASE_URL}/auth/v1", headers=headers)

@router.get("/verifications/pending", response_model=APIResponse[list[dict]])
async def get_pending_verifications(
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedPrincipal = Depends(require_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200)
):
    stmt = select(VerificationRequest, User, Doctor, Pharmacy).join(
        User, VerificationRequest.user_id == User.id
    ).outerjoin(
        Doctor, User.id == Doctor.user_id
    ).outerjoin(
        Pharmacy, User.id == Pharmacy.user_id
    ).where(
        VerificationRequest.status == VerificationStatus.PENDING
    ).offset(skip).limit(limit)
    
    result = await db.execute(stmt)
    rows = result.all()
    
    data = []
    for req, user, doctor, pharmacy in rows:
        profile = None
        if user.role == UserRole.DOCTOR and doctor:
            profile = {
                "hospital_name": doctor.hospital_name,
                "hospital_address": doctor.hospital_address,
                "license_number": doctor.license_number,
                "full_name": doctor.full_name
            }
        elif user.role == UserRole.PHARMACY and pharmacy:
            profile = {
                "business_name": pharmacy.business_name,
                "address": pharmacy.address,
                "license_number": pharmacy.license_number
            }
            
        data.append({
            "request_id": str(req.id),
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "profile": profile,
            "created_at": req.created_at.isoformat()
        })
        
    return APIResponse(message="Pending verifications retrieved", data=data)

@router.post("/verifications/{request_id}/approve", response_model=APIResponse[dict])
async def approve_verification(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedPrincipal = Depends(require_admin)
):
    req = await VerificationService.approve_request(db, request_id, current_admin.id)
    return APIResponse(message="Approved successfully", data={"request_id": str(req.id)})

@router.post("/verifications/{request_id}/reject", response_model=APIResponse[dict])
async def reject_verification(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedPrincipal = Depends(require_admin)
):
    # Dummy reason for now
    req = await VerificationService.reject_request(db, request_id, current_admin.id, "Rejected by admin")
    return APIResponse(message="Rejected successfully", data={"request_id": str(req.id)})

@router.get("/patients", response_model=APIResponse[list[dict]])
async def get_patients(
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedPrincipal = Depends(require_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200)
):
    stmt = select(User, Patient).join(Patient, User.id == Patient.user_id).where(User.role == UserRole.PATIENT).offset(skip).limit(limit)
    result = await db.execute(stmt)
    rows = result.all()
    
    data = [{
        "user_id": str(user.id),
        "email": user.email,
        "full_name": patient.full_name,
        "status": user.status.value,
        "created_at": user.created_at.isoformat()
    } for user, patient in rows]
    
    return APIResponse(message="Patients retrieved", data=data)

@router.delete("/users/{user_id}", response_model=APIResponse[dict])
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedPrincipal = Depends(require_admin)
):
    # Delete from Supabase Auth
    async with await get_supabase_client() as client:
        res = await client.delete(f"/admin/users/{user_id}")
        # Ignore 404 if not found in Supabase
        if res.status_code not in (200, 204, 404):
            raise HTTPException(status_code=500, detail=f"Failed to delete auth user: {res.text}")
    
    # Delete from local DB (Cascade should handle related profiles)
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if user:
        await db.delete(user)
        await db.commit()
        
    return APIResponse(message="User deleted successfully", data={})

@router.get("/admins", response_model=APIResponse[list[dict]])
async def get_admins(
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedPrincipal = Depends(require_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200)
):
    stmt = select(User).where(User.role == UserRole.ADMIN).offset(skip).limit(limit)
    result = await db.execute(stmt)
    users = result.scalars().all()
    
    data = [{
        "user_id": str(user.id),
        "email": user.email,
        "status": user.status.value,
        "created_at": user.created_at.isoformat()
    } for user in users]
    
    return APIResponse(message="Admins retrieved", data=data)
