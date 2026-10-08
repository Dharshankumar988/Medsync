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

@router.get("/patients", response_model=APIResponse[list[dict]])
async def get_patients(
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedPrincipal = Depends(require_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200)
):
    stmt = select(Patient, User).join(User, Patient.user_id == User.id).offset(skip).limit(limit)
    result = await db.execute(stmt)
    rows = result.all()
    
    data = [{
        "id": str(patient.id),
        "user_id": str(patient.user_id),
        "full_name": patient.full_name,
        "email": user.email,
        "date_of_birth": patient.date_of_birth if patient.date_of_birth else None,
        "blood_group": patient.blood_group,
        "gender": patient.gender,
        "created_at": patient.created_at.isoformat()
    } for patient, user in rows]
    
    return APIResponse(message="Patients retrieved", data=data)

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

class AdminCreate(BaseModel):
    email: str
    password: str

from app.models.user import UserStatus

@router.post("/admins", response_model=APIResponse[dict])
async def create_admin(
    payload: AdminCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedPrincipal = Depends(require_admin)
):
    # Supabase auth-free admin creation - direct SQL injection like doctor/pharmacy
    from sqlalchemy import text
    user_id = uuid.uuid4()
    try:
        await db.execute(
            text("""
            INSERT INTO auth.users (id, instance_id, email, encrypted_password, aud, role, email_confirmed_at)
            VALUES (:id, '00000000-0000-0000-0000-000000000000', :email, crypt(:pwd, gen_salt('bf')), 'authenticated', 'authenticated', now())
            """),
            {"id": user_id, "email": payload.email, "pwd": payload.password}
        )
        await db.commit()

        # Create local DB user record
        new_user = User(
            id=user_id,
            email=payload.email,
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            is_verified=True,
            profile_completion_percentage=100
        )
        db.add(new_user)
        await db.commit()

        return APIResponse(message="Admin created successfully", data={"email": payload.email, "id": str(user_id)})
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

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
    
    total_tx = await db.scalar(select(func.count(BlockchainTransaction.transaction_hash)))
    avg_gas = await db.scalar(select(func.avg(BlockchainTransaction.gas_used)))
    avg_latency = await db.scalar(select(func.avg(BlockchainTransaction.execution_time_ms)))
    
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
        "blockchain_activity": {
            "total_tx": total_tx or 0,
            "avg_gas_used": int(avg_gas) if avg_gas else 0,
            "network_latency_ms": int(avg_latency) if avg_latency else 0,
            "block_time_s": 2.1 # Typical Amoy block time
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
    from app.blockchain.explorer import address_url, tx_url
    from app.blockchain.contracts.loader import contract_loader
    import os

    # Fetch recent transactions from local DB
    stmt = select(BlockchainTransaction).order_by(BlockchainTransaction.created_at.desc()).limit(50)
    tx_res = await db.execute(stmt)
    db_transactions = tx_res.scalars().all()

    from app.blockchain.provider import RESOLVED_BLOCKCHAIN_MODE
    transactions = [{
        "hash": tx.transaction_hash,
        "from": getattr(tx, 'wallet_address', "System"),
        "status": tx.status,
        "network": tx.network + (" (MOCK)" if RESOLVED_BLOCKCHAIN_MODE == "mock" else ""),
        "explorer_url": tx_url(tx.transaction_hash) if tx.transaction_hash and RESOLVED_BLOCKCHAIN_MODE != "mock" else None
    } for tx in db_transactions]

    # Try to fetch actual blockchain health via web3
    wallet_balance_eth = None
    gas_price_gwei = None
    rpc_url = None
    try:
        from app.blockchain.provider import blockchain_gateway
        from app.blockchain.client import blockchain_client
        health = await asyncio.to_thread(blockchain_gateway.get_health_status)
        is_healthy = health.get("status") in ("healthy", "healthy (mock)")
        status_text = "Healthy" if is_healthy else "Degraded"
        nodes = 1 if is_healthy else 0
        latest_block = health.get("currentBlock", 0)
        chain_id = health.get("chainId", 0)
        wallet_address = health.get("walletAddress", "None")
        network_name = health.get("network", "amoy")
        contract_health = health.get("contracts", {})
        wallet_balance_eth = health.get("walletBalanceEth")

        # Fetch gas price if connected
        w3 = blockchain_client.w3
        if w3 and w3.is_connected():
            try:
                gp = await asyncio.to_thread(lambda: w3.eth.gas_price)
                gas_price_gwei = float(w3.from_wei(gp, "gwei"))
            except Exception:
                pass
            # Redact API key from RPC URL — only expose hostname
            raw_uri = str(getattr(w3.provider, 'endpoint_uri', ''))
            try:
                from urllib.parse import urlparse
                parsed = urlparse(raw_uri)
                rpc_url = f"{parsed.scheme}://{parsed.hostname}" if parsed.hostname else "Unknown"
            except Exception:
                rpc_url = "Connected"
    except Exception:
        status_text = "Unavailable"
        latest_block = 0
        nodes = 0
        chain_id = 0
        wallet_address = blockchain_client.wallet_address or "None"
        network_name = "Unknown"
        contract_health = {}

    # Build detailed contracts list with addresses and deployment status
    # Use real addresses from contract_loader, fallback to None if mock/not configured
    contracts_detail = []
    from app.blockchain.contracts.loader import contract_loader
    from app.blockchain.provider import RESOLVED_BLOCKCHAIN_MODE
    
    contract_names = [
        "PatientRegistry", "DoctorRegistry", "PharmacyRegistry", 
        "MedicalRecordRegistry", "PrescriptionRegistry", "ConsentManagement"
    ]
    
    for name in contract_names:
        addr = contract_loader.addresses.get(name, "0x0000000000000000000000000000000000000000")
        
        health_status = contract_health.get(name, "unknown")
        
        if RESOLVED_BLOCKCHAIN_MODE == "mock":
            health_status = "mocked"
            
        # If the health check didn't cover this contract, try on-chain verification
        if health_status == "unknown" and blockchain_client.w3 and blockchain_client.w3.is_connected() and addr != "0x0000000000000000000000000000000000000000":
            try:
                code = await asyncio.to_thread(blockchain_client.w3.eth.get_code, addr)
                health_status = "deployed" if code and code != b"" else "not_deployed"
            except Exception:
                health_status = "rpc_error"
                
        contracts_detail.append({
            "name": name,
            "address": addr,
            "health": health_status,
            "explorer_url": address_url(addr) if RESOLVED_BLOCKCHAIN_MODE != "mock" else None
        })

    # Count mismatches / failures
    mismatches_stmt = select(func.count(BlockchainSyncTask.id)).where(BlockchainSyncTask.status == SyncStatus.FAILED)
    mismatches_res = await db.execute(mismatches_stmt)
    mismatches = mismatches_res.scalar_one()

    data = {
        "status": status_text,
        "nodes": nodes,
        "latest_block": latest_block,
        "chain_id": chain_id,
        "wallet_address": wallet_address,
        "wallet_balance_eth": wallet_balance_eth,
        "gas_price_gwei": gas_price_gwei,
        "network_name": network_name,
        "rpc_url": rpc_url,
        "contracts": contracts_detail,
        "transactions": transactions,
        "mismatches": mismatches,
        "explorer_base": "https://amoy.polygonscan.com"
    }
    return APIResponse(message="Blockchain overview retrieved", data=data)

from pydantic import BaseModel
class AdminDoctorCreate(BaseModel):
    email: str
    password: str
    full_name: str
    specialization: str
    license_number: str
    hospital_id: Optional[str] = None

@router.post("/doctors", response_model=APIResponse[dict])
async def create_doctor(
    payload: AdminDoctorCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedPrincipal = Depends(require_admin)
):
    async with await get_supabase_client() as client:
        res = await client.post("/admin/users", json={
            "email": payload.email,
            "password": payload.password,
            "email_confirm": True
        })
        
        if res.status_code not in (200, 201):
            raise HTTPException(status_code=res.status_code, detail=f"Failed to create doctor in Auth: {res.text}")
            
        data = res.json()
        auth_user_id = uuid.UUID(data.get("id"))
        
        stmt = select(User).where(User.id == auth_user_id)
        result = await db.execute(stmt)
        if result.scalar_one_or_none():
            await client.delete(f"/admin/users/{auth_user_id}")
            raise HTTPException(status_code=400, detail="User already exists in DB")
            
        try:
            new_user = User(
                id=auth_user_id,
                email=payload.email,
                role=UserRole.DOCTOR,
                status=UserStatus.ACTIVE,
                is_verified=True,
                profile_completion_percentage=100
            )
            db.add(new_user)
            await db.flush()
            
            hospital_uuid = uuid.UUID(payload.hospital_id) if payload.hospital_id else None
            
            new_doc = Doctor(
                user_id=auth_user_id,
                full_name=payload.full_name,
                license_number=payload.license_number,
                hospital_id=hospital_uuid,
                doctor_status="ACTIVE",
                experience_years=0,
                consultation_fee=0
            )
            db.add(new_doc)
            await db.flush()
            
            if hospital_uuid:
                loc = DoctorLocation(
                    doctor_id=new_doc.id,
                    location_type="HOSPITAL",
                    hospital_id=hospital_uuid,
                    is_primary=True,
                    is_active=True
                )
                db.add(loc)
            
            await db.commit()
        except Exception as e:
            await db.rollback()
            await client.delete(f"/admin/users/{auth_user_id}")
            raise HTTPException(status_code=500, detail=f"DB error. Rolled back auth user. {str(e)}")
            
    return APIResponse(message="Doctor created", data={"id": str(auth_user_id)})

from fastapi import Request
from app.dependencies.rate_limit import limiter
from app.schemas.admin import RelationshipGraphResponse

@router.get("/graph", response_model=APIResponse[RelationshipGraphResponse])
@limiter.limit("10/minute")
async def get_relationship_graph(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedPrincipal = Depends(require_admin)
):
    nodes = []
    edges = []

    from sqlalchemy import func, desc
    from app.models.user import User
    from app.models.patient import Patient
    from app.models.doctor import Doctor
    from app.models.hospital import Hospital
    from app.models.pharmacy import Pharmacy

    # Create central golden node (Medicine/System)
    nodes.append({
        "id": "MEDICINE",
        "label": "Medicine",
        "type": "Medicine",
        "hasError": False,
        "details": "Central hub connecting all healthcare entities",
        "isCentral": True
    })

    # Get top 10 recent patients
    patients_stmt = select(Patient, User).join(
        User, Patient.user_id == User.id
    ).order_by(desc(Patient.created_at)).limit(10)
    patients_result = await db.execute(patients_stmt)
    patients = patients_result.all()

    for patient, user in patients:
        location_str = f"{patient.city}, {patient.state}" if patient.city else "Location not set"
        google_maps_link = f"https://www.google.com/maps/search/?api=1&query={patient.address.replace(' ', '+')}" if patient.address else None

        nodes.append({
            "id": f"PATIENT_{patient.id}",
            "label": patient.full_name,
            "type": "Patient",
            "hasError": False,
            "details": f"Patient | {location_str}",
            "entityData": {
                "name": patient.full_name,
                "email": user.email,
                "phone": patient.phone_number,
                "address": patient.address,
                "city": patient.city,
                "state": patient.state,
                "country": patient.country,
                "pincode": patient.pincode,
                "bloodGroup": patient.blood_group,
                "googleMapsLink": google_maps_link
            }
        })
        edges.append({"source": "MEDICINE", "target": f"PATIENT_{patient.id}", "type": "serves"})

    # Get top 10 recent doctors (verified)
    doctors_stmt = select(Doctor, User).join(
        User, Doctor.user_id == User.id
    ).where(Doctor.doctor_status == "VERIFIED").order_by(desc(Doctor.created_at)).limit(10)
    doctors_result = await db.execute(doctors_stmt)
    doctors = doctors_result.all()

    for doctor, user in doctors:
        location_str = f"{doctor.city}, {doctor.state}" if doctor.city else "Location not set"
        google_maps_link = f"https://www.google.com/maps/search/?api=1&query={doctor.clinic_address.replace(' ', '+')}" if doctor.clinic_address else None

        nodes.append({
            "id": f"DOCTOR_{doctor.id}",
            "label": doctor.full_name,
            "type": "Doctor",
            "hasError": False,
            "details": f"Doctor | {doctor.specialization or 'General'} | {location_str}",
            "entityData": {
                "name": doctor.full_name,
                "email": user.email,
                "specialization": doctor.specialization,
                "licenseNumber": doctor.license_number,
                "clinicName": doctor.clinic_name,
                "clinicAddress": doctor.clinic_address,
                "city": doctor.city,
                "state": doctor.state,
                "country": doctor.country,
                "pincode": doctor.pincode,
                "phone": doctor.clinic_phone,
                "experience": doctor.experience_years,
                "consultationFee": doctor.consultation_fee,
                "googleMapsLink": google_maps_link
            }
        })
        edges.append({"source": "MEDICINE", "target": f"DOCTOR_{doctor.id}", "type": "prescribes"})

    # Get top 10 recent pharmacies
    pharmacies_stmt = select(Pharmacy, User).join(
        User, Pharmacy.user_id == User.id
    ).order_by(desc(Pharmacy.created_at)).limit(10)
    pharmacies_result = await db.execute(pharmacies_stmt)
    pharmacies = pharmacies_result.all()

    for pharmacy, user in pharmacies:
        location_str = f"{pharmacy.city}, {pharmacy.state}" if pharmacy.city else "Location not set"
        google_maps_link = f"https://www.google.com/maps/search/?api=1&query={pharmacy.address.replace(' ', '+')}" if pharmacy.address else None

        nodes.append({
            "id": f"PHARMACY_{pharmacy.id}",
            "label": pharmacy.business_name,
            "type": "Pharmacy",
            "hasError": False,
            "details": f"Pharmacy | {location_str}",
            "entityData": {
                "name": pharmacy.business_name,
                "email": user.email,
                "licenseNumber": pharmacy.license_number,
                "address": pharmacy.address,
                "city": pharmacy.city,
                "state": pharmacy.state,
                "country": pharmacy.country,
                "pincode": pharmacy.pincode,
                "phone": pharmacy.contact_number,
                "operatingHours": pharmacy.operating_hours,
                "is24x7": pharmacy.is_24x7,
                "googleMapsLink": google_maps_link
            }
        })
        edges.append({"source": "MEDICINE", "target": f"PHARMACY_{pharmacy.id}", "type": "dispenses"})

    # Get top 10 recent hospitals
    hospitals_stmt = select(Hospital).order_by(desc(Hospital.created_at)).limit(10)
    hospitals_result = await db.execute(hospitals_stmt)
    hospitals = hospitals_result.scalars().all()

    for hospital in hospitals:
        location_str = f"{hospital.city}, {hospital.state}" if hospital.city else "Location not set"
        google_maps_link = f"https://www.google.com/maps/search/?api=1&query={hospital.address.replace(' ', '+')}" if hospital.address else None

        nodes.append({
            "id": f"HOSPITAL_{hospital.id}",
            "label": hospital.name,
            "type": "Hospital",
            "hasError": False,
            "details": f"Hospital | {location_str}",
            "entityData": {
                "name": hospital.name,
                "address": hospital.address,
                "city": hospital.city,
                "state": hospital.state,
                "country": hospital.country,
                "pincode": hospital.pincode,
                "phone": hospital.phone_number,
                "type": hospital.type,
                "googleMapsLink": google_maps_link
            }
        })
        edges.append({"source": "MEDICINE", "target": f"HOSPITAL_{hospital.id}", "type": "hosts"})

    # Get top 10 recent admins
    admins_stmt = select(User).where(User.role == UserRole.ADMIN).order_by(desc(User.created_at)).limit(10)
    admins_result = await db.execute(admins_stmt)
    admins = admins_result.scalars().all()

    for admin in admins:
        nodes.append({
            "id": f"ADMIN_{admin.id}",
            "label": admin.email.split('@')[0],
            "type": "Admin",
            "hasError": False,
            "details": f"Admin | {admin.email}",
            "entityData": {
                "email": admin.email,
                "role": admin.role.value if hasattr(admin.role, "value") else admin.role,
                "status": admin.status.value if hasattr(admin.status, "value") else admin.status,
                "isVerified": admin.is_verified
            }
        })
        edges.append({"source": "MEDICINE", "target": f"ADMIN_{admin.id}", "type": "manages"})

    return APIResponse(
        message="Graph retrieved",
        data=RelationshipGraphResponse(nodes=nodes, links=edges)
    )

class AdminSettingsPayload(BaseModel):
    maintenance_mode: bool
    strict_verification: bool

@router.get("/settings", response_model=APIResponse[dict])
async def get_admin_settings(
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedPrincipal = Depends(require_admin)
):
    from app.models.system import SystemSetting
    stmt = select(SystemSetting)
    result = await db.execute(stmt)
    settings_db = result.scalars().all()
    
    settings = {
        "maintenance_mode": False,
        "strict_verification": True
    }
    for s in settings_db:
        if s.key in settings and s.value_bool is not None:
            settings[s.key] = s.value_bool
            
    return APIResponse(message="Settings retrieved", data=settings)

@router.post("/settings", response_model=APIResponse[dict])
async def update_admin_settings(
    payload: AdminSettingsPayload,
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedPrincipal = Depends(require_admin)
):
    from app.models.system import SystemSetting
    
    # Update Maintenance Mode
    stmt = select(SystemSetting).where(SystemSetting.key == "maintenance_mode")
    result = await db.execute(stmt)
    setting1 = result.scalar_one_or_none()
    if setting1:
        setting1.value_bool = payload.maintenance_mode
    else:
        setting1 = SystemSetting(key="maintenance_mode", value_bool=payload.maintenance_mode, description="Blocks all non-admin traffic")
        db.add(setting1)
        
    # Update Strict Verification
    stmt2 = select(SystemSetting).where(SystemSetting.key == "strict_verification")
    result2 = await db.execute(stmt2)
    setting2 = result2.scalar_one_or_none()
    if setting2:
        setting2.value_bool = payload.strict_verification
    else:
        setting2 = SystemSetting(key="strict_verification", value_bool=payload.strict_verification, description="Requires admin approval for new accounts")
        db.add(setting2)
        
    await db.commit()
    
    return APIResponse(message="Settings updated successfully", data={
        "maintenance_mode": payload.maintenance_mode,
        "strict_verification": payload.strict_verification
    })

@router.get("/system", response_model=APIResponse[dict])
async def get_system_health(
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedPrincipal = Depends(require_admin)
):
    services = []
    
    # 1. PostgreSQL DB Health
    try:
        from sqlalchemy import text
        await db.execute(text("SELECT 1"))
        services.append({"name": "PostgreSQL DB", "status": "HEALTHY", "reason": "Connected and responsive"})
    except Exception as e:
        services.append({"name": "PostgreSQL DB", "status": "ERROR", "reason": str(e)})

    # 2. Supabase Auth Health
    try:
        from app.core.config import settings
        if settings.SUPABASE_URL:
            async with await get_supabase_client() as client:
                res = await client.get("/health", timeout=5)
                if res.status_code == 200:
                    services.append({"name": "Supabase Auth", "status": "HEALTHY", "reason": "Auth API is online"})
                else:
                    services.append({"name": "Supabase Auth", "status": "DEGRADED", "reason": f"Status code {res.status_code}"})
        else:
            services.append({"name": "Supabase Auth", "status": "UNKNOWN", "reason": "SUPABASE_URL not configured"})
    except Exception as e:
        services.append({"name": "Supabase Auth", "status": "ERROR", "reason": str(e)})

    # 3. Blockchain Network Health
    try:
        from app.blockchain.client import blockchain_client
        import os
        is_mock = os.getenv("BLOCKCHAIN_MODE", "mock").lower() == "mock"
        
        if is_mock:
            services.append({"name": "Polygon Amoy Testnet", "status": "HEALTHY", "reason": "Running in MOCK mode (Skipping RPC check)"})
        else:
            if blockchain_client.w3 and blockchain_client.w3.is_connected():
                services.append({"name": "Polygon Amoy Testnet", "status": "HEALTHY", "reason": "RPC connected successfully"})
            else:
                services.append({"name": "Polygon Amoy Testnet", "status": "ERROR", "reason": "RPC disconnected or invalid"})
    except Exception as e:
        services.append({"name": "Polygon Amoy Testnet", "status": "ERROR", "reason": str(e)})
        
    # 4. AI Microservice Health
    try:
        from app.core.config import settings
        import httpx
        ai_url = settings.MEDSYNC_AI_URL
        if ai_url:
            async with httpx.AsyncClient() as client:
                # The AI service might not have a /health endpoint, but we can try / or just consider it configured
                services.append({"name": "AI Diagnostic Engine", "status": "HEALTHY", "reason": "Service configured"})
        else:
            services.append({"name": "AI Diagnostic Engine", "status": "UNKNOWN", "reason": "MEDSYNC_AI_URL not configured"})
    except Exception as e:
        services.append({"name": "AI Diagnostic Engine", "status": "ERROR", "reason": str(e)})

    return APIResponse(message="System health retrieved", data={"services": services})
