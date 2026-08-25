import uuid
from fastapi import APIRouter, Depends, status, Form, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import UserRole
from app.schemas.response import APIResponse
from app.schemas.session import AuthenticatedPrincipal
from app.schemas.prescription import PrescriptionCreate, PrescriptionResponse
from app.services.prescription import PrescriptionService
from sqlalchemy import select
from app.models.pharmacy_system import MedicineOrder
from app.models.prescription import Prescription
from fastapi import HTTPException

router = APIRouter()
require_doctor = RoleChecker([UserRole.DOCTOR])

@router.post("/", response_model=APIResponse[PrescriptionResponse], status_code=status.HTTP_201_CREATED)
async def create_prescription(
    req: PrescriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor)
):
    rx = await PrescriptionService.create_prescription(db, current_user.id, req)
    return APIResponse(message="Prescription finalized", data=rx)

@router.post("/{id}/authorize-download", response_model=APIResponse)
async def authorize_prescription_download(
    id: uuid.UUID,
    pin: str = Form(...),
    face_image: UploadFile = File(...),
    challenge_type: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user)
):
    from sqlalchemy import select
    from app.models.prescription import Prescription
    from fastapi import HTTPException
    
    stmt = select(Prescription).where(Prescription.id == id)
    result = await db.execute(stmt)
    rx = result.scalar_one_or_none()
    
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
        
    if rx.patient_id != current_user.id and rx.doctor_id != current_user.id and current_user.role not in [UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Unauthorized to download this prescription")
        
    if not rx.pdf_url:
        raise HTTPException(status_code=404, detail="PDF not generated for this prescription")

    # If the user is the patient, enforce MFA
    if current_user.role == UserRole.PATIENT:
        from app.models.user import User
        from app.services.security_service import validate_patient_pin, create_download_authorization
        from app.services.face_auth_service import face_auth_service
        from app.models.security import PatientBiometricProfile
        import asyncio
        import tempfile, shutil, os

        pin_valid = await validate_patient_pin(db, current_user.id, pin)
        if not pin_valid:
            raise HTTPException(status_code=401, detail="Invalid Authorization PIN")

        bio_stmt = select(PatientBiometricProfile).where(PatientBiometricProfile.patient_id == current_user.id)
        bio_res = await db.execute(bio_stmt)
        bio_profile = bio_res.scalar_one_or_none()

        if not bio_profile:
            raise HTTPException(status_code=400, detail="Biometric profile not enrolled.")

        # Save face image temporarily to verify
        suffix = f".{face_image.filename.split('.')[-1]}" if '.' in face_image.filename else ".jpg"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(face_image.file, tmp)
            tmp_path = tmp.name

        try:
            challenge_data = {"type": challenge_type} if challenge_type else None
            face_verified = await asyncio.to_thread(face_auth_service.verify_patient, bio_profile.encrypted_template, tmp_path, challenge_data)
            if not face_verified:
                raise HTTPException(status_code=401, detail="Face verification failed")
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

        auth_ref = await create_download_authorization(db, current_user.id, rx.id, password_verified=False, pin_verified=True, face_verified=True)
        return APIResponse(message="Authorization successful", data={"authorization_reference": auth_ref})
    
    # For doctors/admins, just return a direct short-lived auth reference bypassing MFA for now (or a different flow)
    from app.services.security_service import create_download_authorization
    auth_ref = await create_download_authorization(db, current_user.id, rx.id, password_verified=False, pin_verified=False, face_verified=False)
    return APIResponse(message="Authorization successful", data={"authorization_reference": auth_ref})

@router.get("/download/{authorization_reference}")
async def download_prescription_by_ref(
    authorization_reference: str,
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import select, text
    from app.models.security import PrescriptionDownloadAuthorization
    from app.models.prescription import Prescription
    from app.services.storage import StorageService
    from fastapi import HTTPException
    import datetime

    stmt = select(PrescriptionDownloadAuthorization).where(PrescriptionDownloadAuthorization.authorization_reference == authorization_reference)
    result = await db.execute(stmt)
    auth = result.scalar_one_or_none()

    if not auth:
        raise HTTPException(status_code=404, detail="Invalid authorization reference")

    if auth.used_at:
        raise HTTPException(status_code=403, detail="Authorization reference already used")

    if auth.expires_at < datetime.datetime.utcnow():
        raise HTTPException(status_code=403, detail="Authorization reference expired")

    # Mark as used
    auth.used_at = datetime.datetime.utcnow()
    await db.commit()

    # Get prescription
    rx_stmt = select(Prescription).where(Prescription.id == auth.prescription_id)
    rx_res = await db.execute(rx_stmt)
    rx = rx_res.scalar_one_or_none()

    if not rx or not rx.pdf_url:
        raise HTTPException(status_code=404, detail="Prescription PDF not found")

    # Generate signed URL valid for 5 minutes
    signed_url = await StorageService.create_signed_download_url(rx.pdf_url, expires_in=300)
    
    return APIResponse(message="Download URL generated", data={"url": signed_url})

@router.post("/{id}/dispense", response_model=APIResponse)
async def dispense_prescription(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker([UserRole.PHARMACY]))
):
    stmt = select(Prescription).where(Prescription.id == id).with_for_update()
    result = await db.execute(stmt)
    rx = result.scalar_one_or_none()
    
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
        
    if rx.is_dispensed:
        raise HTTPException(status_code=400, detail="Prescription has already been dispensed")
        
    rx.is_dispensed = True
    
    # Check if there is an order, update it
    order_stmt = select(MedicineOrder).where(MedicineOrder.prescription_id == id)
    order_res = await db.execute(order_stmt)
    order = order_res.scalar_one_or_none()
    
    if order:
        if order.pharmacy_id != current_user.id:
            from app.core.exceptions import ForbiddenException
            raise ForbiddenException("You are not authorized to dispense this prescription")
            
        from app.models.pharmacy_system import MedicineOrderItem, MedicineInventory
        items_stmt = select(MedicineOrderItem, MedicineInventory).join(
            MedicineInventory, MedicineOrderItem.inventory_id == MedicineInventory.id
        ).where(MedicineOrderItem.order_id == order.id)
        
        items_res = await db.execute(items_stmt)
        items = items_res.all()
        
        # Verify enough stock first
        for item, inv in items:
            if inv.stock_quantity < item.quantity:
                raise HTTPException(status_code=400, detail=f"Insufficient stock for inventory batch {inv.batch_number}")
                
        # Deduct stock
        for item, inv in items:
            inv.stock_quantity -= item.quantity
            
        order.status = "DISPENSED"
        
    await db.commit()
    return APIResponse(message="Prescription dispensed successfully", data={"prescription_id": str(rx.id)})

from pydantic import BaseModel
class VerifyPrescriptionRequest(BaseModel):
    pin: str

@router.post("/{id}/verify", response_model=APIResponse)
async def verify_prescription_with_pin(
    id: uuid.UUID,
    req: VerifyPrescriptionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker([UserRole.PHARMACY]))
):
    # Fetch prescription and patient
    stmt = select(Prescription).where(Prescription.id == id)
    result = await db.execute(stmt)
    rx = result.scalar_one_or_none()
    
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if rx.is_dispensed:
        raise HTTPException(status_code=400, detail="Prescription has already been dispensed")

    from app.services.security_service import validate_patient_pin
    pin_valid = await validate_patient_pin(db, rx.patient_id, req.pin)
    if not pin_valid:
        raise HTTPException(status_code=401, detail="Invalid Authorization PIN")
        
    # Enqueue Blockchain Sync for Verification (Status Update)
    try:
        from app.services.blockchain_sync import BlockchainSyncService
        from app.models.blockchain import SyncEntityType, SyncActionType
        
        await BlockchainSyncService.enqueue_sync_task(
            db=db,
            entity_type=SyncEntityType.PRESCRIPTION,
            entity_id=rx.id,
            action_type=SyncActionType.UPDATE,
            payload={
                "action": "VERIFY",
                "pharmacy_id": str(current_user.id)
            }
        )
        await db.commit()
    except Exception:
        pass
        
    return APIResponse(message="Prescription verified successfully", data={"prescription_id": str(rx.id), "hash": getattr(rx, 'hash', None)})

from fastapi import Form, UploadFile, File

@router.post("/{id}/order-online", response_model=APIResponse)
async def order_prescription_online(
    id: uuid.UUID,
    pharmacy_id: uuid.UUID = Form(...),
    delivery_address: str = Form(...),
    pin: str = Form(...),
    face_image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker([UserRole.PATIENT]))
):
    # Fetch prescription
    stmt = select(Prescription).where(Prescription.id == id, Prescription.patient_id == current_user.id)
    result = await db.execute(stmt)
    rx = result.scalar_one_or_none()
    
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if rx.is_dispensed:
        raise HTTPException(status_code=400, detail="Prescription has already been dispensed")

    from app.services.security_service import validate_patient_pin
    from app.services.face_auth_service import face_auth_service
    from app.models.security import PatientBiometricProfile
    import tempfile, shutil, os, asyncio

    # Validate PIN
    pin_valid = await validate_patient_pin(db, current_user.id, pin)
    if not pin_valid:
        raise HTTPException(status_code=401, detail="Invalid Authorization PIN")

    # Validate Face
    bio_stmt = select(PatientBiometricProfile).where(PatientBiometricProfile.patient_id == current_user.id)
    bio_res = await db.execute(bio_stmt)
    bio_profile = bio_res.scalar_one_or_none()
    
    if not bio_profile:
        raise HTTPException(status_code=400, detail="Biometric profile not enrolled.")
        
    suffix = f".{face_image.filename.split('.')[-1]}" if '.' in face_image.filename else ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(face_image.file, tmp)
        tmp_path = tmp.name

    try:
        face_verified = await asyncio.to_thread(face_auth_service.verify_patient, bio_profile.encrypted_template, tmp_path)
        if not face_verified:
            raise HTTPException(status_code=401, detail="Face verification failed")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        
    try:
        from app.models.pharmacy_system import MedicineOrder, OrderStatus
        order = MedicineOrder(
            id=uuid.uuid4(),
            pharmacy_id=pharmacy_id,
            patient_id=current_user.id,
            prescription_id=rx.id,
            status=OrderStatus.PENDING,
            delivery_address=delivery_address,
            total_amount=0.0
        )
        db.add(order)
        await db.commit()
    except ImportError:
        pass
        
    return APIResponse(message="Prescription order placed successfully", data={"prescription_id": str(rx.id)})
