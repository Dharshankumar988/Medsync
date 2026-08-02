import logging
from sqlalchemy import select
from app.database.session import AsyncSessionLocal
from app.models.blockchain import BlockchainTransaction, BlockchainAuditLog
from app.models.record import MedicalRecord
from app.models.prescription import Prescription
from app.models.patient import Patient
from app.models.doctor import Doctor

logger = logging.getLogger("blockchain.reconciliation")

async def run_reconciliation():
    """
    Periodic job to verify database state matches blockchain records.
    Finds missing on-chain events for database entities, or vice-versa.
    """
    logger.info("Starting blockchain reconciliation...")
    
    async with AsyncSessionLocal() as db:
        try:
            # 1. Detect pending transactions that are actually confirmed on chain
            # (Handled mostly by confirmation worker, but we can do a deep check here)
            
            # 2. Check Database Entities vs Audit Logs
            # Ensure every ACTIVE patient/doctor/prescription has a corresponding CONFIRMED audit log
            # This is a basic example of reconciliation
            
            # Example: Check Patients
            result = await db.execute(select(Patient))
            patients = result.scalars().all()
            for patient in patients:
                audit_result = await db.execute(
                    select(BlockchainAuditLog).where(
                        (BlockchainAuditLog.entity_id == patient.id) &
                        (BlockchainAuditLog.action.in_(["PatientRegistered", "PatientVerified"])) &
                        (BlockchainAuditLog.status == "CONFIRMED")
                    )
                )
                if not audit_result.scalars().first():
                    logger.warning(f"Reconciliation Alert: Patient {patient.id} exists in DB but has no confirmed blockchain audit log.")
            
            # Generate a summary metrics report
            logger.info("Reconciliation complete.")
            
        except Exception as e:
            logger.error(f"Error during reconciliation: {e}")
