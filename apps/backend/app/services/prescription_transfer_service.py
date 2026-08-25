import uuid
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.models.prescription_transfer import PrescriptionTransfer
from app.models.prescription import Prescription
from app.models.security import PrescriptionDownloadAuthorization

logger = logging.getLogger("medsync.prescription_transfer")

class PrescriptionTransferService:
    @staticmethod
    async def create_transfer(
        db: AsyncSession, 
        patient_id: uuid.UUID, 
        pharmacy_id: uuid.UUID, 
        prescription_id: uuid.UUID, 
        transfer_request_id: str
    ) -> PrescriptionTransfer:
        """Create a new prescription transfer request."""
        
        # Check idempotency
        stmt = select(PrescriptionTransfer).where(PrescriptionTransfer.transfer_request_id == transfer_request_id)
        result = await db.execute(stmt)
        existing_transfer = result.scalar_one_or_none()
        
        if existing_transfer:
            logger.info(f"Idempotent transfer request: returning existing transfer {transfer_request_id}")
            return existing_transfer
            
        # Verify prescription belongs to patient
        stmt = select(Prescription).where(Prescription.id == prescription_id, Prescription.patient_id == patient_id)
        result = await db.execute(stmt)
        prescription = result.scalar_one_or_none()
        
        if not prescription:
            raise HTTPException(status_code=404, detail="Prescription not found or unauthorized.")
            
        # Verify prescription download authorization is valid? 
        # (Could be checked before calling this method)
        
        new_transfer = PrescriptionTransfer(
            patient_id=patient_id,
            pharmacy_id=pharmacy_id,
            prescription_id=prescription_id,
            transfer_request_id=transfer_request_id,
            status="CREATED"
        )
        db.add(new_transfer)
        await db.commit()
        await db.refresh(new_transfer)
        return new_transfer
        
    @staticmethod
    async def authorize_transfer(
        db: AsyncSession,
        transfer_id: uuid.UUID,
        patient_id: uuid.UUID,
        authorization_reference: str
    ) -> PrescriptionTransfer:
        """Patient authorizes the transfer after face/PIN validation."""
        # 1. Fetch Transfer
        stmt = select(PrescriptionTransfer).where(PrescriptionTransfer.id == transfer_id, PrescriptionTransfer.patient_id == patient_id)
        result = await db.execute(stmt)
        transfer = result.scalar_one_or_none()
        
        if not transfer:
            raise HTTPException(status_code=404, detail="Transfer not found.")
            
        if transfer.status != "CREATED":
            raise HTTPException(status_code=400, detail=f"Transfer cannot be authorized from status {transfer.status}")
            
        # 2. Check Authorization Grant
        stmt = select(PrescriptionDownloadAuthorization).where(
            PrescriptionDownloadAuthorization.authorization_reference == authorization_reference,
            PrescriptionDownloadAuthorization.patient_id == patient_id,
            PrescriptionDownloadAuthorization.prescription_id == transfer.prescription_id
        )
        result = await db.execute(stmt)
        auth = result.scalar_one_or_none()
        
        if not auth:
            raise HTTPException(status_code=403, detail="Invalid authorization reference.")
            
        if auth.expires_at < datetime.utcnow():
            raise HTTPException(status_code=403, detail="Authorization has expired.")
            
        if auth.used_at is not None:
            raise HTTPException(status_code=403, detail="Authorization has already been used.")
            
        # Must have verified either face or pin (or both depending on policy)
        if not (auth.face_verified or auth.pin_verified):
            raise HTTPException(status_code=403, detail="Insufficient verification factors met.")
            
        # Mark auth as used
        auth.used_at = datetime.utcnow()
        
        # Mark transfer as authorized
        transfer.status = "AUTHORIZED"
        transfer.authorized_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(transfer)
        return transfer

    @staticmethod
    async def complete_transfer(
        db: AsyncSession,
        transfer_id: uuid.UUID,
        pharmacy_id: uuid.UUID
    ) -> PrescriptionTransfer:
        """Pharmacy marks the transfer as delivered."""
        stmt = select(PrescriptionTransfer).where(PrescriptionTransfer.id == transfer_id, PrescriptionTransfer.pharmacy_id == pharmacy_id)
        result = await db.execute(stmt)
        transfer = result.scalar_one_or_none()
        
        if not transfer:
            raise HTTPException(status_code=404, detail="Transfer not found.")
            
        if transfer.status != "AUTHORIZED":
            raise HTTPException(status_code=400, detail=f"Transfer cannot be completed from status {transfer.status}")
            
        transfer.status = "DELIVERED"
        transfer.delivered_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(transfer)
        return transfer

prescription_transfer_service = PrescriptionTransferService()
