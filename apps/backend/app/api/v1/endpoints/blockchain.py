from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies.db import get_db
from app.models.prescription import Prescription
from app.models.blockchain import BlockchainTask, BlockchainAuditLog
from app.blockchain.client import w3_client
from app.blockchain.config import blockchain_settings
from app.utils.hash import generate_prescription_hash
from app.schemas.response import APIResponse
import uuid

router = APIRouter()

@router.get("/verify/{prescription_id}", response_model=APIResponse)
async def verify_prescription(prescription_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    # 1. Retrieve the prescription
    stmt = select(Prescription).where(Prescription.id == prescription_id)
    result = await db.execute(stmt)
    prescription = result.scalar_one_or_none()
    
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
        
    if not prescription.blockchain_tx_hash or prescription.blockchain_status != "CONFIRMED":
        return APIResponse(message="Prescription has not been confirmed on the blockchain yet", data={"verified": False, "status": prescription.blockchain_status})

    # 2. Recompute the SHA-256 hash
    prescription_data = {
        "prescription_id": str(prescription.id),
        "patient_id": str(prescription.patient_id),
        "doctor_id": str(prescription.doctor_id),
        "diagnosis": prescription.diagnosis
    }
    recomputed_hash = generate_prescription_hash(prescription_data)

    # 3. Read the blockchain hash
    try:
        contract = w3_client.load_contract(blockchain_settings.RECORD_REGISTRY_ADDRESS, "MedicalRecordRegistry")
        blockchain_record = contract.functions.getRecord(str(prescription.id)).call()
        # The struct Record is (storageType, storageReference, sha256Hash, ownerId, version, timestamp)
        blockchain_hash = blockchain_record[2]
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to read from blockchain: {str(e)}")

    # 4. Compare them
    is_verified = (recomputed_hash == blockchain_hash)

    # 5. Return status
    return APIResponse(
        message="Verification complete",
        data={
            "verified": is_verified,
            "database_hash": recomputed_hash,
            "blockchain_hash": blockchain_hash,
            "match": is_verified
        }
    )

@router.get("/tasks", response_model=APIResponse)
async def get_blockchain_tasks(db: AsyncSession = Depends(get_db), limit: int = 50):
    stmt = select(BlockchainTask).order_by(BlockchainTask.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    tasks = result.scalars().all()
    
    # Calculate stats
    total_stmt = select(BlockchainTask)
    all_tasks_result = await db.execute(total_stmt)
    all_tasks = all_tasks_result.scalars().all()
    
    stats = {
        "PENDING": 0,
        "PROCESSING": 0,
        "CONFIRMED": 0,
        "FAILED": 0,
        "RETRYING": 0,
        "CANCELLED": 0,
        "total": len(all_tasks)
    }
    
    for t in all_tasks:
        stats[t.status.value] += 1
        
    success_rate = (stats["CONFIRMED"] / stats["total"] * 100) if stats["total"] > 0 else 0
    
    return APIResponse(
        message="Tasks retrieved",
        data={
            "tasks": [
                {
                    "id": str(t.id),
                    "prescription_id": str(t.prescription_id),
                    "status": t.status.value,
                    "retry_count": t.retry_count,
                    "max_retries": t.max_retries,
                    "next_retry_time": t.next_retry_time.isoformat() if t.next_retry_time else None,
                    "error_message": t.error_message,
                    "created_at": t.created_at.isoformat() if t.created_at else None
                } for t in tasks
            ],
            "stats": stats,
            "success_rate": round(success_rate, 2)
        }
    )

@router.post("/tasks/{task_id}/retry", response_model=APIResponse)
async def retry_task(task_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(BlockchainTask).where(BlockchainTask.id == task_id)
    result = await db.execute(stmt)
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task.status = "PENDING" # Reset to pending
    task.retry_count = 0
    task.next_retry_time = None
    task.error_message = None
    await db.commit()
    
    return APIResponse(message="Task requeued successfully", data={"task_id": str(task_id)})

@router.get("/logs", response_model=APIResponse)
async def get_audit_logs(db: AsyncSession = Depends(get_db), limit: int = 50):
    stmt = select(BlockchainAuditLog).order_by(BlockchainAuditLog.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    logs = result.scalars().all()
    
    return APIResponse(
        message="Audit logs retrieved",
        data=[
            {
                "id": str(l.id),
                "transaction_hash": l.transaction_hash,
                "block_number": l.block_number,
                "gas_used": l.gas_used,
                "wallet_address": l.wallet_address,
                "chain_id": l.chain_id,
                "explorer_url": l.explorer_url,
                "confirmation_time": l.confirmation_time.isoformat() if l.confirmation_time else None,
                "failure_reason": l.failure_reason,
                "prescription_id": str(l.prescription_id) if l.prescription_id else None
            } for l in logs
        ]
    )
