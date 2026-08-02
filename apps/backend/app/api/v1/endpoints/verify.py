from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies.db import get_db
from jose import jwt, JWTError
from app.core.config import settings
from app.models.prescription import Prescription
from app.models.user import User, UserStatus
from app.schemas.response import APIResponse
from pydantic import BaseModel
import uuid

router = APIRouter()

class VerifyResponse(BaseModel):
    is_valid: bool
    prescription_id: str
    patient_id: str
    doctor_name: str
    hospital_id: str
    blockchain_status: str
    blockchain_tx: str
    is_dispensed: bool

@router.get("/qr/{token}", response_model=APIResponse[VerifyResponse])
async def verify_qr(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        prescription_id = payload.get("sub")
        doctor_id = payload.get("doc")
        
        if payload.get("type") != "rx_verify" or not prescription_id:
            raise HTTPException(status_code=400, detail="Invalid token payload")
            
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired QR token")
        
    # Check Prescription in DB
    stmt = select(Prescription).where(Prescription.id == uuid.UUID(prescription_id))
    result = await db.execute(stmt)
    rx = result.scalar_one_or_none()
    
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
        
    # Check Doctor is active and verified
    doc_stmt = select(User).where(User.id == uuid.UUID(doctor_id))
    doc_res = await db.execute(doc_stmt)
    doctor = doc_res.scalar_one_or_none()
    
    if not doctor or doctor.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=403, detail="Prescribing doctor is no longer active")
        
    # The frontend will enforce dispensing blockers if `is_dispensed` is True
    
    return APIResponse(
        message="Verification Successful",
        data=VerifyResponse(
            is_valid=True,
            prescription_id=str(rx.id),
            patient_id=str(rx.patient_id),
            doctor_name=f"{doctor.first_name} {doctor.last_name}",
            hospital_id=str(doctor.hospital_id) if hasattr(doctor, 'hospital_id') else "Unknown",
            blockchain_status=rx.blockchain_status or "PENDING",
            blockchain_tx=rx.blockchain_tx_hash or "PENDING",
            is_dispensed=rx.is_dispensed
        )
    )
