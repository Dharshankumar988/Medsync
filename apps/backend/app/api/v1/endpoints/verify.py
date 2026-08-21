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
    """Verify a QR token — uses server-side QRAuthorizationService for full verification."""
    # Try server-side verification first
    verification = await QRAuthorizationService.verify_token(
        db=db,
        jwt_token=token,
        verifier_id=current_user.id,
        verifier_role=current_user.role,
    )

    if not verification.get("valid"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=verification.get("error", "Invalid or expired QR token"),
        )

    # Role enforcement based on purpose
    purpose = verification.get("purpose", "PRESCRIPTION_ACCESS")
    if purpose in ["PRESCRIPTION_ACCESS", "IN_STORE_ORDER"]:
        if current_user.role.upper() not in ["PHARMACY"]:
            raise HTTPException(status_code=403, detail="Unauthorized role for this QR purpose")
    elif purpose == "DELIVERY_CONFIRMATION":
        if current_user.role.upper() not in ["PHARMACY"]:
            raise HTTPException(status_code=403, detail="Unauthorized role for delivery confirmation")

    resource_id = verification.get("resource_id", "")
    response_data = verification.get("data", {})

    # Handle delivery confirmation side-effects
    if purpose == "DELIVERY_CONFIRMATION":
        resource_uuid = uuid.UUID(resource_id)
        stmt = select(DeliveryTracking).where(DeliveryTracking.order_id == resource_uuid)
        result = await db.execute(stmt)
        tracking = result.scalar_one_or_none()

        if tracking and tracking.current_status != "DELIVERED":
            tracking.current_status = "DELIVERED"
            tracking.delivery_completed_at = datetime.now(timezone.utc)
            tracking.delivery_code_hash = None
            tracking.delivery_progress = 100

            order_stmt = select(MedicineOrder).where(MedicineOrder.id == resource_uuid)
            order_res = await db.execute(order_stmt)
            order = order_res.scalar_one_or_none()
            if order:
                order.status = OrderStatus.DELIVERED

            await db.commit()
            response_data = {"order_id": str(resource_uuid), "status": "DELIVERED"}

    # Log verification audit
    try:
        from app.services.audit_service import AuditService
        await AuditService.log_action(
            db=db,
            action=f"QR_VERIFY_{purpose}",
            user_id=current_user.id,
            entity_type="qr_verification",
            entity_id=uuid.UUID(resource_id) if resource_id else None,
            details={"purpose": purpose, "verified_at": datetime.now(timezone.utc).isoformat()},
        )
    except Exception:
        pass  # Audit logging is best-effort

    return APIResponse(
        message="Verification Successful",
        data=VerifyResponse(
            is_valid=True,
            purpose=purpose,
            resource_id=str(resource_id),
            message="Verified",
            data=response_data,
        ),
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
