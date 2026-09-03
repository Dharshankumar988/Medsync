from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker, AuthenticatedPrincipal
from app.schemas.response import APIResponse
from app.schemas.blockchain import (
    BlockchainTransactionResponse, BlockchainSyncTaskResponse, 
    BlockchainAuditLogResponse, PaginatedResponse, TransactionSearchQuery,
    StatusResponse, VerificationResponse
)
from app.models.blockchain import (
    BlockchainSyncTask, SyncEntityType, SyncActionType, SyncStatus,
    BlockchainTransaction, BlockchainAuditLog
)
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.prescription import Prescription
from app.models.record import MedicalRecord
from app.models.pharmacy import Pharmacy
from app.blockchain.services.sync_service import BlockchainSyncService
from app.blockchain.provider import blockchain_gateway
from app.utils.hash import generate_prescription_hash
from typing import List, Optional
import uuid
import asyncio
from datetime import datetime
import json
import hashlib

from app.dependencies.rate_limit import limiter

router = APIRouter()

# ---------------------------------------------------------
# PATIENT APIs
# ---------------------------------------------------------

@router.post("/patient/register", response_model=APIResponse)
@limiter.limit("10/minute")
async def register_patient_on_blockchain(
    request: Request,
    patient_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker(["PATIENT", "ADMIN"]))
):
    """Register a patient's identity hash on the blockchain."""
    if current_user.role == "patient" and current_user.id != patient_id:
        raise HTTPException(status_code=403, detail="Not authorized to register this patient")
        
    stmt = select(Patient).where(Patient.id == patient_id)
    result = await db.execute(stmt)
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    task = BlockchainSyncTask(
        entity_type=SyncEntityType.PATIENT,
        entity_id=patient.id,
        action_type=SyncActionType.CREATE,
        payload={"patient_id": str(patient.id), "email": patient.email},
        status=SyncStatus.PENDING
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    
    return APIResponse(message="Patient registration task queued", data={"task_id": str(task.id)})

@router.get("/patient/{patient_id}/verify", response_model=APIResponse)
@limiter.limit("30/minute")
async def verify_patient(
    request: Request,
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user)
):
    """Verify patient registration on the blockchain."""
    stmt = select(Patient).where(Patient.id == patient_id)
    result = await db.execute(stmt)
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    data_hash = hashlib.sha256(json.dumps({"patient_id": str(patient.id), "email": patient.email}, sort_keys=True).encode("utf-8")).hexdigest()
    
    try:
        blockchain_record = await asyncio.to_thread(blockchain_gateway.read_contract, "PatientRegistry", "getPatient", data_hash)
        # Check if record exists (e.g. timestamp > 0 or whatever fields the contract returns)
        is_registered = blockchain_record is not None and len(blockchain_record) > 0
        
        return APIResponse(
            message="Verification successful",
            data=VerificationResponse(
                verified=is_registered,
                database_hash=data_hash,
                blockchain_hash=data_hash if is_registered else None,
                match=is_registered,
                timestamp=datetime.utcnow()
            ).model_dump()
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Blockchain query failed: {str(e)}")

# ---------------------------------------------------------
# DOCTOR APIs
# ---------------------------------------------------------

@router.post("/doctor/verify", response_model=APIResponse)
@limiter.limit("10/minute")
async def verify_doctor_on_blockchain(
    request: Request,
    doctor_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker(["ADMIN"]))
):
    """Admin verifies a doctor on the blockchain."""
    stmt = select(Doctor).where(Doctor.id == doctor_id)
    result = await db.execute(stmt)
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    task = BlockchainSyncTask(
        entity_type=SyncEntityType.DOCTOR,
        entity_id=doctor.id,
        action_type=SyncActionType.VERIFY,
        payload={"doctor_id": str(doctor.id), "license_number": doctor.license_number},
        status=SyncStatus.PENDING
    )
    db.add(task)
    await db.commit()
    
    return APIResponse(message="Doctor verification task queued", data={"task_id": str(task.id)})

# ---------------------------------------------------------
# PRESCRIPTION APIs
# ---------------------------------------------------------

@router.post("/prescription/create", response_model=APIResponse)
@limiter.limit("20/minute")
async def queue_prescription_creation(
    request: Request,
    prescription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker(["DOCTOR"]))
):
    """Queue a prescription to be stored on the blockchain."""
    stmt = select(Prescription).where(Prescription.id == prescription_id)
    result = await db.execute(stmt)
    prescription = result.scalar_one_or_none()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
        
    if current_user.id != prescription.doctor_id:
        raise HTTPException(status_code=403, detail="You can only sync your own prescriptions")
        
    task = BlockchainSyncTask(
        entity_type=SyncEntityType.PRESCRIPTION,
        entity_id=prescription.id,
        action_type=SyncActionType.CREATE,
        payload={
            "prescription_id": str(prescription.id),
            "patient_id": str(prescription.patient_id),
            "doctor_id": str(prescription.doctor_id),
            "diagnosis": prescription.diagnosis
        },
        status=SyncStatus.PENDING
    )
    db.add(task)
    await db.commit()
    
    return APIResponse(message="Prescription sync queued", data={"task_id": str(task.id)})

@router.get("/prescription/{prescription_id}/verify", response_model=APIResponse)
@limiter.limit("60/minute")
async def verify_prescription(
    request: Request,
    prescription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user)
):
    """Verify a prescription hash matches the blockchain."""
    stmt = select(Prescription).where(Prescription.id == prescription_id)
    result = await db.execute(stmt)
    prescription = result.scalar_one_or_none()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
        
    data_hash = generate_prescription_hash({
        "prescription_id": str(prescription.id),
        "patient_id": str(prescription.patient_id),
        "doctor_id": str(prescription.doctor_id),
        "diagnosis": prescription.diagnosis
    })
    
    try:
        blockchain_record = await asyncio.to_thread(blockchain_gateway.read_contract, "PrescriptionRegistry", "getPrescription", str(prescription.id))
        blockchain_hash = blockchain_record[2] if blockchain_record else None
        is_verified = (data_hash == blockchain_hash)
        
        return APIResponse(
            message="Verification complete",
            data=VerificationResponse(
                verified=is_verified,
                database_hash=data_hash,
                blockchain_hash=blockchain_hash,
                match=is_verified,
                timestamp=datetime.utcnow()
            ).model_dump()
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Blockchain query failed: {str(e)}")

# ---------------------------------------------------------
# MEDICAL RECORD APIs
# ---------------------------------------------------------

@router.post("/record/register", response_model=APIResponse)
@limiter.limit("20/minute")
async def register_medical_record_on_blockchain(
    request: Request,
    record_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker(["DOCTOR"]))
):
    """Queue a medical record to be stored on the blockchain."""
    stmt = select(MedicalRecord).where(MedicalRecord.id == record_id)
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Medical Record not found")
        
    task = BlockchainSyncTask(
        entity_type=SyncEntityType.MEDICAL_RECORD,
        entity_id=record.id,
        action_type=SyncActionType.CREATE,
        payload={
            "record_id": str(record.id),
            "patient_id": str(record.patient_id),
            "cid": "ipfs://dummy_cid" # In a real scenario, this would come from the IPFS service
        },
        status=SyncStatus.PENDING
    )
    db.add(task)
    await db.commit()
    
    return APIResponse(message="Medical Record sync queued", data={"task_id": str(task.id)})

@router.get("/record/{record_id}/verify", response_model=APIResponse)
@limiter.limit("60/minute")
async def verify_medical_record(
    request: Request,
    record_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user)
):
    """Verify a medical record against the blockchain."""
    stmt = select(MedicalRecord).where(MedicalRecord.id == record_id)
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Medical Record not found")
        
    # Example deterministic hash. In prod, use the actual fields + CID.
    data_hash = hashlib.sha256(json.dumps({
        "record_id": str(record.id),
        "patient_id": str(record.patient_id),
        "cid": "ipfs://dummy_cid"
    }, sort_keys=True).encode("utf-8")).hexdigest()
    
    try:
        blockchain_record = await asyncio.to_thread(blockchain_gateway.read_contract, "MedicalRecordRegistry", "getRecord", str(record.id))
        blockchain_hash = blockchain_record[2] if blockchain_record else None
        is_verified = (data_hash == blockchain_hash)
        
        return APIResponse(
            message="Verification complete",
            data=VerificationResponse(
                verified=is_verified,
                database_hash=data_hash,
                blockchain_hash=blockchain_hash,
                match=is_verified,
                timestamp=datetime.utcnow()
            ).model_dump()
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Blockchain query failed: {str(e)}")


# ---------------------------------------------------------
# PHARMACY APIs
# ---------------------------------------------------------

@router.post("/pharmacy/verify", response_model=APIResponse)
@limiter.limit("10/minute")
async def verify_pharmacy_on_blockchain(
    request: Request,
    pharmacy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker(["ADMIN"]))
):
    """Admin verifies a pharmacy on the blockchain."""
    stmt = select(Pharmacy).where(Pharmacy.id == pharmacy_id)
    result = await db.execute(stmt)
    pharmacy = result.scalar_one_or_none()
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
        
    task = BlockchainSyncTask(
        entity_type=SyncEntityType.PHARMACY,
        entity_id=pharmacy.id,
        action_type=SyncActionType.VERIFY,
        payload={"pharmacy_id": str(pharmacy.id), "license_number": pharmacy.license_number},
        status=SyncStatus.PENDING
    )
    db.add(task)
    await db.commit()
    
    return APIResponse(message="Pharmacy verification task queued", data={"task_id": str(task.id)})

# ---------------------------------------------------------
# TRANSACTIONS & AUDIT APIs
# ---------------------------------------------------------

@router.get("/transactions", response_model=APIResponse)
@limiter.limit("30/minute")
async def get_transactions(
    request: Request,
    status: Optional[str] = None,
    network: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker(["ADMIN", "DOCTOR", "PHARMACY"]))
):
    """Get paginated blockchain transactions."""
    query = select(BlockchainTransaction)
    
    if status:
        query = query.where(BlockchainTransaction.status == status)
    if network:
        query = query.where(BlockchainTransaction.network == network)
        
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()
    
    query = query.order_by(desc(BlockchainTransaction.created_at)).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()
    
    return APIResponse(
        message="Transactions retrieved",
        data={
            "items": [BlockchainTransactionResponse.model_validate(item).model_dump() for item in items],
            "total": total,
            "page": page,
            "size": size,
            "pages": (total + size - 1) // size
        }
    )

@router.get("/audit", response_model=APIResponse)
@limiter.limit("30/minute")
async def get_audit_logs(
    request: Request,
    entity_id: Optional[uuid.UUID] = None,
    entity_type: Optional[SyncEntityType] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker(["ADMIN", "DOCTOR", "PATIENT", "PHARMACY"]))
):
    """Get paginated audit logs."""
    query = select(BlockchainAuditLog)
    
    if entity_id:
        query = query.where(BlockchainAuditLog.entity_id == entity_id)
    if entity_type:
        query = query.where(BlockchainAuditLog.entity_type == entity_type)
        
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()
    
    query = query.order_by(desc(BlockchainAuditLog.created_at)).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()
    
    return APIResponse(
        message="Audit logs retrieved",
        data={
            "items": [BlockchainAuditLogResponse.model_validate(item).model_dump() for item in items],
            "total": total,
            "page": page,
            "size": size,
            "pages": (total + size - 1) // size
        }
    )

# ---------------------------------------------------------
# STATUS APIs
# ---------------------------------------------------------

@router.get("/status", response_model=APIResponse)
@limiter.limit("20/minute")
async def get_blockchain_status(
    request: Request,
    current_user: AuthenticatedPrincipal = Depends(get_current_user)
):
    """Get overall health and status of the Blockchain Gateway."""
    try:
        health = await asyncio.to_thread(blockchain_gateway.get_health_status)
        
        status = StatusResponse(
            network=health.get("network", "unknown"),
            chain_id=health.get("chain_id", 0),
            rpc_health="CONNECTED" if health.get("status") == "healthy" else "DISCONNECTED",
            gas_price_gwei=0.0,
            wallet_address=blockchain_gateway.account.address if hasattr(blockchain_gateway, "account") and blockchain_gateway.account else None,
            wallet_balance_eth=0.0
        )
        return APIResponse(message="Blockchain status", data=status.model_dump())
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch status: {str(e)}")

# ---------------------------------------------------------
# QUEUE MANAGEMENT & REPLAY APIs
# ---------------------------------------------------------

from app.schemas.queue import QueueMetricsResponse
from app.models.blockchain import BlockchainEventQueue, BlockchainQueueStatus
from app.blockchain.services.replay import replay_service

@router.get("/queue/metrics", response_model=APIResponse)
@limiter.limit("20/minute")
async def get_queue_metrics(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker(["ADMIN"]))
):
    """Get event queue metrics."""
    try:
        # Group by status to get counts
        result = await db.execute(
            select(BlockchainEventQueue.status, func.count(BlockchainEventQueue.id))
            .group_by(BlockchainEventQueue.status)
        )
        counts = dict(result.all())
        
        # Get recent errors
        errors_result = await db.execute(
            select(BlockchainEventQueue.error_message)
            .where(BlockchainEventQueue.error_message.is_not(None))
            .order_by(desc(BlockchainEventQueue.updated_at))
            .limit(5)
        )
        recent_errors = [e for e in errors_result.scalars().all() if e]
        
        metrics = QueueMetricsResponse(
            total_pending=counts.get(BlockchainQueueStatus.PENDING, 0),
            total_processing=counts.get(BlockchainQueueStatus.PROCESSING, 0),
            total_processed=counts.get(BlockchainQueueStatus.PROCESSED, 0),
            total_failed=counts.get(BlockchainQueueStatus.FAILED, 0),
            total_dlq=counts.get(BlockchainQueueStatus.DLQ, 0),
            recent_errors=recent_errors
        )
        
        return APIResponse(message="Queue metrics retrieved", data=metrics.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/queue/replay/{event_id}", response_model=APIResponse)
@limiter.limit("10/minute")
async def replay_dlq_event(
    request: Request,
    event_id: uuid.UUID,
    current_user: AuthenticatedPrincipal = Depends(RoleChecker(["ADMIN"]))
):
    """Replay a specific event from the DLQ."""
    success = await replay_service.replay_dlq_event(event_id)
    if success:
        return APIResponse(message=f"Event {event_id} scheduled for replay")
    raise HTTPException(status_code=404, detail="Event not found in DLQ")

@router.post("/queue/replay-all", response_model=APIResponse)
@limiter.limit("5/minute")
async def replay_all_dlq_events(
    request: Request,
    contract_name: Optional[str] = None,
    current_user: AuthenticatedPrincipal = Depends(RoleChecker(["ADMIN"]))
):
    """Replay all events in the DLQ."""
    count = await replay_service.replay_dlq_bulk(contract_name)
    return APIResponse(message=f"Scheduled {count} events for replay")

# ---------------------------------------------------------
# ADMINISTRATION DASHBOARD APIs
# ---------------------------------------------------------
from app.blockchain.contracts.loader import contract_loader
from app.blockchain.client import blockchain_client

@router.get("/contracts", response_model=APIResponse)
@limiter.limit("20/minute")
async def get_all_contracts(
    request: Request,
    current_user: AuthenticatedPrincipal = Depends(RoleChecker(["ADMIN"]))
):
    """Get all loaded smart contracts."""
    contracts = []
    for name, contract in contract_loader.contracts.items():
        contracts.append({
            "name": name,
            "address": contract.address,
            "version": "1.0.0", # Could be fetched from a version function if available
            "health": "LOADED"
        })
    return APIResponse(message="Contracts retrieved", data=contracts)

@router.get("/contracts/{name}", response_model=APIResponse)
@limiter.limit("20/minute")
async def get_contract_details(
    request: Request,
    name: str,
    current_user: AuthenticatedPrincipal = Depends(RoleChecker(["ADMIN"]))
):
    """Get detailed information for a specific contract."""
    if name not in contract_loader.contracts:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    contract = contract_loader.contracts[name]
    abi_events = [e.get("name") for e in contract.abi if e.get("type") == "event"]
    abi_functions = [e.get("name") for e in contract.abi if e.get("type") == "function"]
    
    data = {
        "name": name,
        "address": contract.address,
        "events": abi_events,
        "functions": abi_functions
    }
    return APIResponse(message="Contract details retrieved", data=data)

@router.get("/network", response_model=APIResponse)
@limiter.limit("20/minute")
async def get_network_details(
    request: Request,
    current_user: AuthenticatedPrincipal = Depends(RoleChecker(["ADMIN"]))
):
    """Get detailed network information."""
    try:
        health = await asyncio.to_thread(blockchain_gateway.get_health)
        latest_block = await asyncio.to_thread(lambda: blockchain_client.w3.eth.block_number)
        gas_price = await asyncio.to_thread(lambda: blockchain_client.w3.eth.gas_price)
        
        data = {
            "network": health.get("network", "unknown"),
            "chain_id": health.get("chain_id", 0),
            "status": "healthy" if health.get("status") == "healthy" else "degraded",
            "latest_block": latest_block,
            "gas_price_gwei": float(blockchain_client.w3.from_wei(gas_price, "gwei")),
            "rpc_provider": "Default RPC"
        }
        return APIResponse(message="Network details retrieved", data=data)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@router.get("/wallet", response_model=APIResponse)
@limiter.limit("20/minute")
async def get_wallet_details(
    request: Request,
    current_user: AuthenticatedPrincipal = Depends(RoleChecker(["ADMIN"]))
):
    """Get backend wallet details."""
    try:
        address = blockchain_gateway.account.address
        balance_wei = await asyncio.to_thread(blockchain_client.w3.eth.get_balance, address)
        nonce = await asyncio.to_thread(blockchain_client.w3.eth.get_transaction_count, address)
        
        data = {
            "address": address,
            "balance_eth": float(blockchain_client.w3.from_wei(balance_wei, "ether")),
            "nonce": nonce,
            "status": "healthy" if balance_wei > 0 else "low_balance"
        }
        return APIResponse(message="Wallet details retrieved", data=data)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@router.get("/analytics", response_model=APIResponse)
@limiter.limit("10/minute")
async def get_analytics(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker(["ADMIN"]))
):
    """Get aggregated blockchain analytics."""
    try:
        # Transactions by status
        tx_status_res = await db.execute(
            select(BlockchainTransaction.status, func.count(BlockchainTransaction.transaction_hash))
            .group_by(BlockchainTransaction.status)
        )
        tx_stats = dict(tx_status_res.all())
        
        # Events by type
        event_res = await db.execute(
            select(BlockchainEventQueue.event_name, func.count(BlockchainEventQueue.id))
            .group_by(BlockchainEventQueue.event_name)
        )
        event_stats = dict(event_res.all())
        
        # Simple Tx Volume (Total)
        total_tx = sum(tx_stats.values())
        total_events = sum(event_stats.values())
        
        data = {
            "transactions": tx_stats,
            "events": event_stats,
            "total_transactions": total_tx,
            "total_events": total_events
        }
        return APIResponse(message="Analytics retrieved", data=data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/queue/events", response_model=APIResponse)
@limiter.limit("30/minute")
async def get_queue_events(
    request: Request,
    status: Optional[BlockchainQueueStatus] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker(["ADMIN"]))
):
    """Get paginated event queue items (useful for DLQ)."""
    query = select(BlockchainEventQueue)
    if status:
        query = query.where(BlockchainEventQueue.status == status)
        
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    
    query = query.order_by(desc(BlockchainEventQueue.created_at)).offset((page - 1) * size).limit(size)
    items = (await db.execute(query)).scalars().all()
    
    # We can serialize it directly or use Pydantic. For brevity, using dict mapping
    return APIResponse(
        message="Queue events retrieved",
        data={
            "items": [
                {
                    "id": str(i.id),
                    "event_name": i.event_name,
                    "contract_name": i.contract_name,
                    "transaction_hash": i.transaction_hash,
                    "status": i.status,
                    "retry_count": i.retry_count,
                    "error_message": i.error_message,
                    "created_at": i.created_at.isoformat() if i.created_at else None
                } for i in items
            ],
            "total": total,
            "page": page,
            "size": size,
            "pages": (total + size - 1) // size
        }
    )
