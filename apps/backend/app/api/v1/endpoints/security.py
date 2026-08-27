import uuid
import shutil
import tempfile
import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User, UserRole
from app.services.security_service import enroll_patient_pin, validate_patient_pin, get_security_status
from app.services.face_auth_service import face_auth_service
from app.models.security import PatientBiometricProfile
from app.models.audit_log import AuditLog

router = APIRouter()

@router.get("/status")
async def get_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the security enrollment status of the patient:
    NOT_STARTED, PIN_CREATED, COMPLETED
    """
    if current_user.role.upper() != UserRole.PATIENT.value.upper():
        raise HTTPException(status_code=403, detail="Only patients require security enrollment.")
        
    status = await get_security_status(db, current_user.id)
    return {"status": status}

@router.post("/enroll-pin")
async def enroll_pin(
    pin: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Enrolls or updates the 6-digit Authorization PIN.
    """
    if current_user.role.upper() != UserRole.PATIENT.value.upper():
        raise HTTPException(status_code=403, detail="Only patients can enroll a PIN.")
        
    try:
        await enroll_patient_pin(db, current_user.id, pin)
        return {"message": "PIN enrolled successfully."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/enroll-face")
async def enroll_face_endpoint(
    images: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Enrolls the patient's face using multiple sample images.
    """
    if current_user.role.upper() != UserRole.PATIENT.value.upper():
        raise HTTPException(status_code=403, detail="Only patients can enroll face biometrics.")
        
    if len(images) < 1 or len(images) > 3:
        raise HTTPException(status_code=400, detail="Please provide 1 to 3 face samples.")
        
    temp_files = []
    try:
        for img in images:
            suffix = f".{img.filename.split('.')[-1]}" if '.' in img.filename else ".jpg"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                shutil.copyfileobj(img.file, tmp)
                temp_files.append(tmp.name)
                
        # Running face enrollment which might block the event loop in thread pool
        import asyncio
        encrypted_template = await asyncio.to_thread(face_auth_service.enroll_patient, temp_files)
        
        # Save to DB
        result = await db.execute(select(PatientBiometricProfile).where(PatientBiometricProfile.patient_id == current_user.id))
        existing_profile = result.scalar_one_or_none()
        
        if existing_profile:
            existing_profile.encrypted_template = encrypted_template
            existing_profile.model_name = "ArcFace"
            existing_profile.enrollment_status = "COMPLETED"
        else:
            profile = PatientBiometricProfile(
                patient_id=current_user.id,
                encrypted_template=encrypted_template,
                model_name="ArcFace"
            )
            db.add(profile)
            
        # Audit
        audit = AuditLog(
            user_id=current_user.id,
            action="FACE_ENROLLMENT_COMPLETED",
            entity_type="PatientBiometricProfile",
            entity_id=current_user.id
        )
        db.add(audit)
        await db.commit()
        
        return {"message": "Face enrolled successfully."}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="An error occurred during face enrollment.")
    finally:
        for tmp_file in temp_files:
            if os.path.exists(tmp_file):
                os.remove(tmp_file)

@router.post("/verify-face")
async def verify_face_endpoint(
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Verifies the patient's identity using Face ID.
    The patient identity is derived from the authenticated token, not the frontend.
    """
    if current_user.role.upper() != UserRole.PATIENT.value.upper():
        raise HTTPException(status_code=403, detail="Only patients can use Face ID verification.")

    result = await db.execute(select(PatientBiometricProfile).where(PatientBiometricProfile.patient_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile or not profile.encrypted_template:
        raise HTTPException(status_code=400, detail="Face ID not enrolled.")

    suffix = f".{image.filename.split('.')[-1]}" if '.' in image.filename else ".jpg"
    tmp_file = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(image.file, tmp)
            tmp_file = tmp.name
        
        import asyncio
        match_score = await asyncio.to_thread(face_auth_service.verify_patient, profile.encrypted_template, tmp_file)
        
        # Audit log for verification attempt
        audit = AuditLog(
            user_id=current_user.id,
            action="FACE_VERIFICATION_SUCCESS" if match_score > 0.6 else "FACE_VERIFICATION_FAILED",
            entity_type="PatientBiometricProfile",
            entity_id=current_user.id,
            details={"match_score": match_score}
        )
        db.add(audit)
        await db.commit()

        if match_score > 0.6:  # Threshold can be adjusted
            return {"verified": True, "match_score": match_score, "message": "Face verified successfully."}
        else:
            return {"verified": False, "match_score": match_score, "message": "Face verification failed."}
            
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="An error occurred during face verification.")
    finally:
        if tmp_file and os.path.exists(tmp_file):
            os.remove(tmp_file)

@router.post("/change-pin-face")
async def change_pin_face(
    image: UploadFile = File(...),
    new_pin: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Allows a patient to change their PIN using Face ID as authorization.
    """
    if current_user.role.upper() != UserRole.PATIENT.value.upper():
        raise HTTPException(status_code=403, detail="Only patients can change their PIN.")
        
    result = await db.execute(select(PatientBiometricProfile).where(PatientBiometricProfile.patient_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile or not profile.encrypted_template:
        raise HTTPException(status_code=400, detail="Face ID not enrolled.")

    suffix = f".{image.filename.split('.')[-1]}" if '.' in image.filename else ".jpg"
    tmp_file = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(image.file, tmp)
            tmp_file = tmp.name
        
        import asyncio
        match_score = await asyncio.to_thread(face_auth_service.verify_patient, profile.encrypted_template, tmp_file)
        
        if match_score <= 0.6:
            # Audit log for failed change
            audit = AuditLog(
                user_id=current_user.id,
                action="FACE_CHANGE_PIN_FAILED",
                entity_type="PatientBiometricProfile",
                entity_id=current_user.id,
                details={"match_score": match_score}
            )
            db.add(audit)
            await db.commit()
            raise HTTPException(status_code=401, detail="Face verification failed.")
            
        # If authorized, change the PIN
        await enroll_patient_pin(db, current_user.id, new_pin)
        
        audit = AuditLog(
            user_id=current_user.id,
            action="FACE_CHANGE_PIN_SUCCESS",
            entity_type="PatientBiometricProfile",
            entity_id=current_user.id
        )
        db.add(audit)
        await db.commit()
        
        return {"message": "PIN changed successfully using Face ID."}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="An error occurred during PIN change.")
    finally:
        if tmp_file and os.path.exists(tmp_file):
            os.remove(tmp_file)
