from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies.db import get_db
from jose import jwt, JWTError
from app.core.config import settings
from app.models.prescription import Prescription
from app.models.pharmacy_system import MedicineOrder, DeliveryTracking, OrderStatus
from app.models.user import User, UserStatus
from app.schemas.response import APIResponse
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import UserRole
from app.schemas.session import AuthenticatedPrincipal
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid
from app.services.qr_pdf_service import QRPdfService
from app.services.qr_authorization_service import QRAuthorizationService

router = APIRouter()


class VerifyResponse(BaseModel):
    is_valid: bool
    purpose: str
    resource_id: str
    message: str
    data: dict


class QRGenerateRequest(BaseModel):
    purpose: str
    resource_id: str


class QRGenerateServerRequest(BaseModel):
    purpose: str
    resource_id: str
    expires_in_minutes: int = 15
    max_uses: int = 1


require_pharmacy = RoleChecker([UserRole.PHARMACY])


@router.post("/qr/generate", response_model=APIResponse[str])
async def generate_qr(
    req: QRGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
):
    if req.purpose not in ["PRESCRIPTION_ACCESS", "IN_STORE_ORDER", "DELIVERY_CONFIRMATION"]:
        raise HTTPException(status_code=400, detail="Invalid purpose")

    resource_uuid = uuid.UUID(req.resource_id)

    if req.purpose == "PRESCRIPTION_ACCESS":
        stmt = select(Prescription).where(Prescription.id == resource_uuid)
        result = await db.execute(stmt)
        rx = result.scalar_one_or_none()
        if not rx:
            raise HTTPException(status_code=404, detail="Prescription not found")
        if rx.patient_id != current_user.id and rx.doctor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        if rx.is_revoked:
            raise HTTPException(status_code=400, detail="Prescription has been revoked")
        if not rx.is_finalized:
            raise HTTPException(status_code=400, detail="Prescription is not yet finalized")
        if rx.expires_at:
            try:
                exp = datetime.fromisoformat(str(rx.expires_at).replace("Z", "+00:00")) if isinstance(rx.expires_at, str) else rx.expires_at
                if hasattr(exp, 'replace'):
                    exp = exp.replace(tzinfo=timezone.utc) if exp.tzinfo is None else exp
                if exp < datetime.now(timezone.utc):
                    raise HTTPException(status_code=400, detail="Prescription has expired")
            except (ValueError, TypeError):
                pass

    elif req.purpose in ["IN_STORE_ORDER", "DELIVERY_CONFIRMATION"]:
        stmt = select(MedicineOrder).where(MedicineOrder.id == resource_uuid)
        result = await db.execute(stmt)
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.patient_id != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized")

    token = QRPdfService.generate_dynamic_token(
        resource_id=resource_uuid,
        user_id=current_user.id,
        purpose=req.purpose,
        expires_in_minutes=15,
    )
    return APIResponse(message="QR generated successfully", data=token)


@router.post("/qr/generate-secure", response_model=APIResponse[dict])
async def generate_qr_secure(
    req: QRGenerateServerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
):
    """Server-side QR token generation with token storage for audit and revocation."""
    if req.purpose not in ["PRESCRIPTION_ACCESS", "IN_STORE_ORDER", "DELIVERY_CONFIRMATION"]:
        raise HTTPException(status_code=400, detail="Invalid purpose")

    resource_uuid = uuid.UUID(req.resource_id)
    prescription_id = None
    order_id = None

    if req.purpose == "PRESCRIPTION_ACCESS":
        stmt = select(Prescription).where(Prescription.id == resource_uuid)
        result = await db.execute(stmt)
        rx = result.scalar_one_or_none()
        if not rx:
            raise HTTPException(status_code=404, detail="Prescription not found")
        if rx.patient_id != current_user.id and rx.doctor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        if rx.is_revoked:
            raise HTTPException(status_code=400, detail="Prescription has been revoked")
        if not rx.is_finalized:
            raise HTTPException(status_code=400, detail="Prescription is not yet finalized")
        if rx.expires_at:
            try:
                exp = datetime.fromisoformat(str(rx.expires_at).replace("Z", "+00:00")) if isinstance(rx.expires_at, str) else rx.expires_at
                if hasattr(exp, 'replace'):
                    exp = exp.replace(tzinfo=timezone.utc) if exp.tzinfo is None else exp
                if exp < datetime.now(timezone.utc):
                    raise HTTPException(status_code=400, detail="Prescription has expired")
            except (ValueError, TypeError):
                pass
        prescription_id = resource_uuid

    elif req.purpose in ["IN_STORE_ORDER", "DELIVERY_CONFIRMATION"]:
        stmt = select(MedicineOrder).where(MedicineOrder.id == resource_uuid)
        result = await db.execute(stmt)
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.patient_id != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        order_id = resource_uuid

    token_result = await QRAuthorizationService.generate_token(
        db=db,
        purpose=req.purpose,
        patient_id=current_user.id,
        user_id=current_user.id,
        prescription_id=prescription_id,
        order_id=order_id,
        expires_in_minutes=req.expires_in_minutes,
        max_uses=req.max_uses,
    )
    return APIResponse(message="Secure QR generated successfully", data=token_result)


@router.get("/qr/{token}", response_model=APIResponse[VerifyResponse])
async def verify_qr(
    token: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
):
    """Verify a QR token — supports both legacy JWT and new permanent MS- tokens."""
    if not token.startswith("MS-"):
        # Legacy JWT Flow
        verification = await QRAuthorizationService.verify_token(
            db=db,
            jwt_token=token,
            verifier_id=current_user.id,
            verifier_role=current_user.role,
        )
        if not verification.get("valid"):
            raise HTTPException(status_code=403, detail=verification.get("error", "Invalid or expired QR token"))
        purpose = verification.get("purpose", "PRESCRIPTION_ACCESS")
        if purpose in ["PRESCRIPTION_ACCESS", "IN_STORE_ORDER"] and current_user.role.upper() not in ["PHARMACY"]:
            raise HTTPException(status_code=403, detail="Unauthorized role for this QR purpose")
        elif purpose == "DELIVERY_CONFIRMATION" and current_user.role.upper() not in ["PHARMACY"]:
            raise HTTPException(status_code=403, detail="Unauthorized role for delivery confirmation")
        return APIResponse(
            message="Verification Successful",
            data=VerifyResponse(
                is_valid=True, purpose=purpose, resource_id=str(verification.get("resource_id", "")),
                message="Verified", data=verification.get("data", {})
            )
        )
        
    # --- Permanent MS- Token Flow ---
    stmt = select(Prescription).where(Prescription.qr_token == token)
    result = await db.execute(stmt)
    rx = result.scalar_one_or_none()
    
    if not rx:
        return APIResponse(message="Verification Failed", data=VerifyResponse(
            is_valid=False, purpose="PRESCRIPTION_ACCESS", resource_id="", message="INVALID", data={}
        ))
        
    if rx.is_revoked:
        return APIResponse(message="Verification Failed", data=VerifyResponse(
            is_valid=False, purpose="PRESCRIPTION_ACCESS", resource_id=str(rx.id), message="INVALID", data={"error": "Prescription revoked"}
        ))
        
    # Integrity Check
    from app.utils.hash import build_prescription_payload, build_offline_prescription_payload, generate_canonical_hash
    if rx.original_file_hash:
        payload = build_offline_prescription_payload(str(rx.doctor_id), str(rx.patient_id), str(rx.original_file_hash))
    else:
        from app.models.prescription import PrescriptionItem
        items_stmt = select(PrescriptionItem).where(PrescriptionItem.prescription_id == rx.id)
        items_res = await db.execute(items_stmt)
        items = [{"medicine_name": i.medicine_name, "dosage": i.dosage, "frequency": i.frequency, "duration_days": i.duration_days} for i in items_res.scalars().all()]
        payload = build_prescription_payload(str(rx.doctor_id), str(rx.patient_id), str(rx.diagnosis), items)
        
    current_hash = generate_canonical_hash(payload)
    
    if current_hash != rx.hash:
        status_msg = "TAMPERED"
    elif rx.blockchain_status != "CONFIRMED":
        status_msg = "PENDING"
    else:
        status_msg = "VERIFIED"
        
    # Authorization Rules
    authorized_for_details = False
    if current_user.role.upper() == "DOCTOR":
        if str(rx.doctor_id) == str(current_user.id):
            authorized_for_details = True
        else:
            from app.services.permission import PermissionService
            has_permission = await PermissionService.can_access_patient(db, current_user.id, rx.patient_id)
            if has_permission:
                authorized_for_details = True

    # Build Response Data
    doc_stmt = select(User).where(User.id == rx.doctor_id)
    pat_stmt = select(User).where(User.id == rx.patient_id)
    doc_res = await db.execute(doc_stmt)
    pat_res = await db.execute(pat_stmt)
    doc = doc_res.scalar_one_or_none()
    pat = pat_res.scalar_one_or_none()
    
    response_data = {
        "prescription_id": str(rx.id),
        "patient_name": f"{pat.first_name} {pat.last_name}" if pat else "Unknown",
        "doctor_name": f"{doc.first_name} {doc.last_name}" if doc else "Unknown",
        "blockchain_status": rx.blockchain_status or "PENDING",
        "is_dispensed": rx.is_dispensed,
        "is_finalized": rx.is_finalized,
        "created_at": rx.created_at.isoformat() if rx.created_at else None,
        "status": status_msg
    }
    
    if authorized_for_details:
        response_data["diagnosis"] = rx.diagnosis
        if not rx.original_file_hash:
            response_data["items"] = items
            
    return APIResponse(
        message=f"Verification Status: {status_msg}",
        data=VerifyResponse(
            is_valid=(status_msg in ["VERIFIED", "PENDING"]),
            purpose="PRESCRIPTION_ACCESS",
            resource_id=str(rx.id),
            message=status_msg,
            data=response_data
        )
    )


@router.post("/qr/{token_id}/revoke", response_model=APIResponse)
async def revoke_qr_token(
    token_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
):
    """Revoke a QR token so it can no longer be used."""
    success = await QRAuthorizationService.revoke_token(db, token_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Token not found or unauthorized")
    return APIResponse(message="QR token revoked successfully")
