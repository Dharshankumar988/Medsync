import uuid
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import User, UserRole
from app.models.doctor import Doctor
from app.models.pharmacy import Pharmacy
from app.models.patient import Patient
from app.models.verification import VerificationRequest, VerificationStatus
from app.models.appointment import Appointment
from app.models.prescription import Prescription
from app.models.pharmacy_system import MedicineOrder
from app.models.api_log import ApiRequestLog
from app.models.ai_chat import AIChatMessage
from app.models.blockchain import BlockchainTransaction, BlockchainSyncTask, SyncStatus
import asyncio
from app.blockchain.provider import blockchain_gateway
from app.blockchain.client import blockchain_client
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
                "full_name": doctor.full_name,
                "specialization": doctor.specialization,
                "experience_years": doctor.experience_years,
                "qualifications": doctor.qualifications,
                "verification_documents_url": doctor.verification_documents_url,
                "certificates_url": doctor.certificates_url,
                "medical_council_reg_number": doctor.medical_council_reg_number
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

@router.post("/users/{user_id}/reset-security", response_model=APIResponse[dict])
async def reset_user_security(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedPrincipal = Depends(require_admin)
):
    # Fetch User
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Clear PIN
    user.pin_hash = None
    
    # Delete PatientBiometricProfile
    from app.models.security import PatientBiometricProfile
    bio_stmt = select(PatientBiometricProfile).where(PatientBiometricProfile.patient_id == user_id)
    bio_result = await db.execute(bio_stmt)
    bio_profile = bio_result.scalar_one_or_none()
    
    if bio_profile:
        await db.delete(bio_profile)
        
    await db.commit()
    return APIResponse(message="User security credentials reset successfully", data={})

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

from pydantic import BaseModel
from typing import Optional

class AdminPharmacyCreate(BaseModel):
    business_name: str
    license_number: str
    address: str
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    contact_number: Optional[str] = None
    email: str
    latitude: float
    longitude: float

@router.get("/pharmacies", response_model=APIResponse[list[dict]])
async def get_all_pharmacies(
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedPrincipal = Depends(require_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200)
):
    stmt = select(Pharmacy, User).join(User, Pharmacy.user_id == User.id).offset(skip).limit(limit)
    result = await db.execute(stmt)
    rows = result.all()
    
    data = []
    for pharmacy, user in rows:
        location_data = pharmacy.location if hasattr(pharmacy, 'location') and pharmacy.location else {}
        data.append({
            "id": str(pharmacy.id),
            "user_id": str(pharmacy.user_id),
            "business_name": pharmacy.business_name,
            "license_number": pharmacy.license_number,
            "address": pharmacy.address,
            "city": pharmacy.city,
            "state": pharmacy.state,
            "contact_number": pharmacy.contact_number,
            "email": user.email,
            "location": location_data
        })
    return APIResponse(message="Pharmacies retrieved", data=data)

@router.post("/pharmacies", response_model=APIResponse)
async def create_pharmacy_admin(
    req: AdminPharmacyCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedPrincipal = Depends(require_admin)
):
    import uuid
    from fastapi import HTTPException
    
    user_stmt = select(User).where(User.email == req.email)
    existing_user = await db.scalar(user_stmt)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    user_id = uuid.uuid4()
    new_user = User(
        id=user_id,
        email=req.email,
        role=UserRole.PHARMACY,
        status="ACTIVE",
        is_verified=True,
        profile_completion_percentage=100
    )
    db.add(new_user)
    
    new_pharmacy = Pharmacy(
        id=uuid.uuid4(),
        user_id=user_id,
        business_name=req.business_name,
        license_number=req.license_number,
        address=req.address,
        city=req.city,
        state=req.state,
        country=req.country,
        pincode=req.pincode,
        contact_number=req.contact_number,
        location={"latitude": req.latitude, "longitude": req.longitude},
        blockchain_status="PENDING"
    )
    db.add(new_pharmacy)
    await db.commit()
    
    try:
        from app.services.blockchain_sync import BlockchainSyncService
        from app.models.blockchain import SyncEntityType, SyncActionType
        await BlockchainSyncService.enqueue_sync_task(
            db=db,
            entity_type=SyncEntityType.PHARMACY,
            entity_id=new_user.id,
            action_type=SyncActionType.CREATE
        )
        await db.commit()
    except Exception:
        pass
        
    return APIResponse(message="Pharmacy created successfully", data={"pharmacy_id": str(new_pharmacy.id)})

@router.get("/dashboard", response_model=APIResponse[dict])
async def get_admin_dashboard(
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedPrincipal = Depends(require_admin)
):
    total_users = await db.scalar(select(func.count(User.id)))
    total_patients = await db.scalar(select(func.count(User.id)).where(User.role == UserRole.PATIENT))
    total_doctors = await db.scalar(select(func.count(User.id)).where(User.role == UserRole.DOCTOR))
    total_pharmacies = await db.scalar(select(func.count(User.id)).where(User.role == UserRole.PHARMACY))
    
    pending_verification = await db.scalar(select(func.count(User.id)).where(User.is_verified == False, User.role.in_([UserRole.DOCTOR, UserRole.PHARMACY])))
    
    total_appointments = await db.scalar(select(func.count(Appointment.id)))
    total_prescriptions = await db.scalar(select(func.count(Prescription.id)))
    total_orders = await db.scalar(select(func.count(MedicineOrder.id)))
    
    stmt = select(VerificationRequest, User).join(
        User, VerificationRequest.user_id == User.id
    ).where(
        VerificationRequest.status == VerificationStatus.PENDING
    ).limit(5)
    result = await db.execute(stmt)
    rows = result.all()
    recent_pending = []
    for req, user in rows:
        recent_pending.append({
            "request_id": str(req.id),
            "email": user.email,
            "role": user.role.value,
            "created_at": req.created_at.isoformat()
        })
        
    data = {
        "users": {
            "total": total_users or 0,
            "patients": total_patients or 0,
            "doctors": total_doctors or 0,
            "pharmacies": total_pharmacies or 0,
            "pending_verification": pending_verification or 0
        },
        "operations": {
            "appointments": total_appointments or 0,
            "prescriptions": total_prescriptions or 0,
            "orders": total_orders or 0
        },
        "recent_pending_verifications": recent_pending
    }
    return APIResponse(message="Admin dashboard stats retrieved", data=data)

@router.get("/operations", response_model=APIResponse[dict])
async def get_admin_operations(
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedPrincipal = Depends(require_admin)
):
    appts_res = await db.execute(select(Appointment).order_by(Appointment.created_at.desc()).limit(50))
    appointments = [{
        "id": str(a.id),
        "date": a.appointment_date.isoformat() if a.appointment_date else None,
        "status": a.status.value if hasattr(a.status, "value") else str(a.status),
        "created_at": a.created_at.isoformat()
    } for a in appts_res.scalars().all()]
    
    prescs_res = await db.execute(select(Prescription).order_by(Prescription.created_at.desc()).limit(50))
    prescriptions = [{
        "id": str(p.id),
        "is_dispensed": p.is_dispensed,
        "created_at": p.created_at.isoformat()
    } for p in prescs_res.scalars().all()]
    
    orders_res = await db.execute(select(MedicineOrder).order_by(MedicineOrder.created_at.desc()).limit(50))
    orders = [{
        "id": str(o.id),
        "status": o.status.value if hasattr(o.status, "value") else str(o.status),
        "total": float(o.total_amount) if o.total_amount else 0.0,
        "created_at": o.created_at.isoformat()
    } for o in orders_res.scalars().all()]
    
    return APIResponse(message="Healthcare operations retrieved", data={
        "appointments": appointments,
        "prescriptions": prescriptions,
        "orders": orders
    })

@router.get("/security", response_model=APIResponse[dict])
async def get_admin_security(
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedPrincipal = Depends(require_admin)
):
    logs_res = await db.execute(select(ApiRequestLog).order_by(ApiRequestLog.created_at.desc()).limit(50))
    api_logs = [{
        "id": str(l.id),
        "endpoint": l.endpoint,
        "method": l.method,
        "status_code": l.status_code,
        "created_at": l.created_at.isoformat()
    } for l in logs_res.scalars().all()]
    
    # Generate some alerts based on 401/403 logs if available
    alerts = []
    unauth_logs = [l for l in api_logs if l["status_code"] in (401, 403)]
    if unauth_logs:
        alerts.append({"message": f"{len(unauth_logs)} unauthorized access attempts detected recently."})
        
    return APIResponse(message="Security logs retrieved", data={"logs": api_logs, "alerts": alerts})

@router.get("/ai", response_model=APIResponse[dict])
async def get_admin_ai(
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedPrincipal = Depends(require_admin)
):
    # Fetch recent AI inferences
    stmt = select(AIChatMessage).where(AIChatMessage.model_used.is_not(None)).order_by(AIChatMessage.created_at.desc()).limit(50)
    messages_res = await db.execute(stmt)
    messages = messages_res.scalars().all()
    
    analyses = [{
        "id": str(m.id),
        "model": m.model_used,
        "confidence": 0.95, # placeholder since confidence isn't in db
        "time": m.inference_time_ms or 0,
        "status": "COMPLETED"
    } for m in messages]
    
    # Extract unique models used
    unique_models = set([m.model_used for m in messages if m.model_used])
    
    # Ensure standard MedSync models are always displayed
    standard_models = ["medsync_bone", "medsync_kidney", "medsync_brain", "medsync_skin"]
    for sm in standard_models:
        unique_models.add(sm)
        
    models = [{
        "name": model,
        "type": "LLM",
        "status": "ACTIVE"
    } for model in unique_models]
    
    return APIResponse(message="AI management data retrieved", data={"analyses": analyses, "models": models})

@router.get("/blockchain", response_model=APIResponse[dict])
async def get_admin_blockchain(
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedPrincipal = Depends(require_admin)
):
    # Fetch recent transactions
    stmt = select(BlockchainTransaction).order_by(BlockchainTransaction.created_at.desc()).limit(50)
    tx_res = await db.execute(stmt)
    transactions = [{
        "hash": tx.transaction_hash,
        "from": tx.from_address or "System",
        "status": tx.status,
        "network": tx.network
    } for tx in tx_res.scalars().all()]
    
    # Try to fetch actual blockchain health
    try:
        health = await asyncio.to_thread(blockchain_gateway.get_health)
        latest_block = await asyncio.to_thread(lambda: blockchain_client.w3.eth.block_number)
        status_text = "Healthy" if health.get("status") == "healthy" else "Degraded"
        nodes = 1 if health.get("status") == "healthy" else 0
    except Exception as e:
        status_text = "Unavailable"
        latest_block = 0
        nodes = 0

    # Count mismatches / failures
    mismatches_stmt = select(func.count(BlockchainSyncTask.id)).where(BlockchainSyncTask.status == SyncStatus.FAILED)
    mismatches_res = await db.execute(mismatches_stmt)
    mismatches = mismatches_res.scalar_one()

    data = {
        "status": status_text,
        "nodes": nodes,
        "latest_block": latest_block,
        "transactions": transactions,
        "mismatches": mismatches
    }
    return APIResponse(message="Blockchain overview retrieved", data=data)
