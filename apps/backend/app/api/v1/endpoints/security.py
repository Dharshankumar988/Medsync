import uuid
import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.schemas.session import AuthenticatedPrincipal
from app.models.user import User, UserRole
from app.services.security_service import enroll_patient_pin, validate_patient_pin, get_security_status, enroll_doctor_pin, validate_doctor_pin, get_doctor_security_status, enroll_pharmacy_pin, validate_pharmacy_pin, get_pharmacy_security_status
from app.models.audit_log import AuditLog
from app.schemas.response import APIResponse

from app.schemas.security import SecurityStatusResponse, SecurityStatusData, SecurityActionResponse

router = APIRouter()

@router.get("/status", response_model=SecurityStatusResponse)
async def get_status(
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker([UserRole.PATIENT, UserRole.DOCTOR, UserRole.PHARMACY]))
):
    """
    Returns the security enrollment status:
    - For patients: NOT_STARTED, PIN_CREATED, COMPLETED
    - For doctors: has_pin boolean
    """
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    
    if current_user.role.upper() == UserRole.DOCTOR.value:
        status_val = await get_doctor_security_status(db, current_user.id)
    elif current_user.role.upper() == UserRole.PATIENT.value:
        status_val = await get_security_status(db, current_user.id)
    elif current_user.role.upper() == UserRole.PHARMACY.value:
        status_val = await get_pharmacy_security_status(db, current_user.id)
    else:
        raise HTTPException(status_code=403, detail="Only patients, doctors, and pharmacies require security enrollment.")

    return SecurityStatusResponse(
        status=status_val,
        message="Security status retrieved",
        data=SecurityStatusData(status=status_val)
    )

@router.post("/enroll-pin", response_model=SecurityActionResponse)
async def enroll_pin(
    pin: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker([UserRole.PATIENT, UserRole.DOCTOR, UserRole.PHARMACY]))
):
    """
    Enrolls or updates the 6-digit Authorization PIN.
    - For patients: stored in PatientSecurityCredential
    - For doctors: stored in Doctor.security_pin_hash
    """
    try:
        if current_user.role.upper() == UserRole.DOCTOR.value:
            await enroll_doctor_pin(db, current_user.id, pin)
        elif current_user.role.upper() == UserRole.PATIENT.value:
            await enroll_patient_pin(db, current_user.id, pin)
        elif current_user.role.upper() == UserRole.PHARMACY.value:
            await enroll_pharmacy_pin(db, current_user.id, pin)
        else:
            raise HTTPException(status_code=403, detail="Only patients, doctors, and pharmacies can enroll a PIN.")
        return SecurityActionResponse(status="success", message="PIN enrolled successfully.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/reset-pin-with-password")
async def reset_pin_with_password(
    current_password: str = Form(...),
    new_pin: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reset PIN using account password for authorization.
    """
    if current_user.role.upper() not in (UserRole.PATIENT.value.upper(), UserRole.DOCTOR.value.upper(), UserRole.PHARMACY.value.upper()):
        raise HTTPException(status_code=403, detail="Only patients, doctors, and pharmacies can reset their PIN.")

    if len(new_pin) != 6 or not new_pin.isdigit():
        raise HTTPException(status_code=400, detail="PIN must be exactly 6 digits.")

    # Verify current password via Supabase
    try:
        from supabase import create_client
        supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )

        # Re-authenticate with current password
        auth_result = supabase.auth.sign_in_with_password({
            "email": current_user.email,
            "password": current_password
        })

        if not auth_result.user:
            raise HTTPException(status_code=401, detail="Current password is incorrect.")

        # Password verified, update PIN
        if current_user.role.upper() == UserRole.PATIENT.value.upper():
            await enroll_patient_pin(db, current_user.id, new_pin)
        elif current_user.role.upper() == UserRole.DOCTOR.value.upper():
            await enroll_doctor_pin(db, current_user.id, new_pin)
        elif current_user.role.upper() == UserRole.PHARMACY.value.upper():
            await enroll_pharmacy_pin(db, current_user.id, new_pin)

        # Audit log
        audit = AuditLog(
            user_id=current_user.id,
            action="PIN_RESET_WITH_PASSWORD",
            entity_type="User",
            entity_id=current_user.id
        )
        db.add(audit)
        await db.commit()

        return {"message": "PIN reset successfully."}

    except Exception as e:
        import logging
        logging.getLogger("medsync.security").error(f"Error during PIN reset: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail="Failed to reset PIN.")
