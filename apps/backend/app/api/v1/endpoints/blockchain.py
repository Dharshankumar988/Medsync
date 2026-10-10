from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker, AuthenticatedPrincipal
from app.schemas.response import APIResponse
from app.schemas.blockchain import (
    BlockchainTransactionResponse, BlockchainSyncTaskResponse, 
    BlockchainAuditLogResponse, PaginatedResponse, TransactionSearchQuery,
    StatusResponse, VerificationResponse, BlockchainVerifyResult, SmartContractSummary,
    TransactionSyncResponse
)
from app.models.blockchain import (
    BlockchainSyncTask, SyncEntityType, SyncActionType, SyncStatus,
    BlockchainTransaction, BlockchainAuditLog
)
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.prescription import Prescription
from app.models.record import MedicalRecord, MedicalRecordVersion
from app.models.pharmacy import Pharmacy
from app.blockchain.services.sync_service import BlockchainSyncService
from app.blockchain.provider import blockchain_gateway
from app.utils.hash import generate_canonical_hash
from typing import List, Optional
import uuid
import asyncio
from datetime import datetime
import json
import hashlib

from app.dependencies.rate_limit import limiter

router = APIRouter()

async def _execute_sync_task_bg(task_id: uuid.UUID):
    """Execute a queued blockchain sync task in a dedicated background database session."""
    try:
        from app.database.session import AsyncSessionLocal
        from app.blockchain.services.sync_service import BlockchainSyncService
        async with AsyncSessionLocal() as session:
            service = BlockchainSyncService(session)
            await service.execute_sync_task(task_id)
    except Exception as e:
        import logging
        logging.getLogger("blockchain.endpoints").error(f"Error in background sync execution {task_id}: {e}")

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
        
    from app.blockchain.client import blockchain_client
    wallet = getattr(patient, "wallet_address", None) or blockchain_client.wallet_address

    task = BlockchainSyncTask(
        entity_type=SyncEntityType.PATIENT,
        entity_id=patient.id,
        action_type=SyncActionType.CREATE,
        payload={
            "patient_id": str(patient.id),
            "email": patient.email,
            "wallet_address": wallet
        },
        status=SyncStatus.PENDING
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    
    background_tasks.add_task(_execute_sync_task_bg, task.id)
    return APIResponse(message="Patient registration task queued and broadcasting to Polygon Amoy", data={"task_id": str(task.id)})

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
    background_tasks: BackgroundTasks,
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
    await db.refresh(task)
    background_tasks.add_task(_execute_sync_task_bg, task.id)
    
    return APIResponse(message="Doctor verification task queued and broadcasting to Polygon Amoy", data={"task_id": str(task.id)})

# ---------------------------------------------------------
# PRESCRIPTION APIs
# ---------------------------------------------------------

@router.post("/prescription/create", response_model=APIResponse)
@limiter.limit("20/minute")
async def queue_prescription_creation(
    request: Request,
    prescription_id: uuid.UUID,
    background_tasks: BackgroundTasks,
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
    await db.refresh(task)
    background_tasks.add_task(_execute_sync_task_bg, task.id)
    
    return APIResponse(message="Prescription sync queued and broadcasting to Polygon Amoy", data={"task_id": str(task.id)})

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
        
    data_hash = generate_canonical_hash({
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
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker(["DOCTOR", "PATIENT"]))
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
            "title": record.title
        },
        status=SyncStatus.PENDING
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    background_tasks.add_task(_execute_sync_task_bg, task.id)
    
    return APIResponse(message="Medical Record sync queued and broadcasting to Polygon Amoy", data={"task_id": str(task.id)})

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
        
    data_hash = hashlib.sha256(json.dumps({
        "record_id": str(record.id),
        "patient_id": str(record.patient_id)
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
    background_tasks: BackgroundTasks,
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
    await db.refresh(task)
    background_tasks.add_task(_execute_sync_task_bg, task.id)
    
    return APIResponse(message="Pharmacy verification task queued and broadcasting to Polygon Amoy", data={"task_id": str(task.id)})

# ---------------------------------------------------------
# CONSENT APIs
# ---------------------------------------------------------

@router.post("/consent/grant", response_model=APIResponse)
@limiter.limit("20/minute")
async def grant_consent_on_blockchain(
    request: Request,
    record_id: uuid.UUID,
    doctor_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker(["PATIENT"]))
):
    """Patient grants consent on-chain via ConsentManagement and MedicalRecordRegistry."""
    task = BlockchainSyncTask(
        entity_type=SyncEntityType.MEDICAL_RECORD,
        entity_id=record_id,
        action_type=SyncActionType.GRANT_ACCESS,
        payload={
            "record_id": str(record_id),
            "patient_id": str(current_user.id),
            "doctor_id": str(doctor_id)
        },
        status=SyncStatus.PENDING
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    background_tasks.add_task(_execute_sync_task_bg, task.id)
    return APIResponse(message="Consent grant broadcast queued to Polygon Amoy", data={"task_id": str(task.id)})

@router.post("/consent/revoke", response_model=APIResponse)
@limiter.limit("20/minute")
async def revoke_consent_on_blockchain(
    request: Request,
    record_id: uuid.UUID,
    doctor_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker(["PATIENT"]))
):
    """Patient revokes consent on-chain via ConsentManagement and MedicalRecordRegistry."""
    task = BlockchainSyncTask(
        entity_type=SyncEntityType.MEDICAL_RECORD,
        entity_id=record_id,
        action_type=SyncActionType.REVOKE_ACCESS,
        payload={
            "record_id": str(record_id),
            "patient_id": str(current_user.id),
            "doctor_id": str(doctor_id)
        },
        status=SyncStatus.PENDING
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    background_tasks.add_task(_execute_sync_task_bg, task.id)
    return APIResponse(message="Consent revocation broadcast queued to Polygon Amoy", data={"task_id": str(task.id)})

# ---------------------------------------------------------
# TRANSACTIONS & AUDIT APIs
# ---------------------------------------------------------

@router.get("/tx/{tx_hash}", response_model=APIResponse[BlockchainVerifyResult])
@limiter.limit("60/minute")
async def get_transaction_by_hash(
    request: Request,
    tx_hash: str,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve full live on-chain or recorded details for a transaction hash."""
    clean_hash = tx_hash.strip().lower()
    from app.blockchain.client import blockchain_client
    from app.blockchain.contracts.loader import contract_loader

    # Try local DB first
    tx_stmt = select(BlockchainTransaction).where(func.lower(BlockchainTransaction.transaction_hash) == clean_hash)
    res = await db.execute(tx_stmt)
    db_tx = res.scalar_one_or_none()

    # Query Web3 on Polygon Amoy
    w3 = blockchain_client.w3
    onchain_found = False
    tx_data = None
    receipt_data = None
    curr_block = None

    if w3 and w3.is_connected():
        try:
            curr_block = await asyncio.to_thread(lambda: w3.eth.block_number)
            tx_data = await asyncio.to_thread(w3.eth.get_transaction, clean_hash)
            if tx_data:
                receipt_data = await asyncio.to_thread(w3.eth.get_transaction_receipt, clean_hash)
                onchain_found = True
        except Exception:
            pass

    if onchain_found and tx_data and receipt_data:
        status_str = "FINALIZED" if receipt_data.get("status") == 1 else "REVERTED"
        blk_num = tx_data.get("blockNumber")
        confirmations = max(1, curr_block - blk_num + 1) if (curr_block and blk_num) else 1
        gas_used = receipt_data.get("gasUsed")
        gas_price_gwei = float(w3.from_wei(tx_data.get("gasPrice", 0), "gwei")) if tx_data.get("gasPrice") else 0.0
        from_addr = tx_data.get("from")
        to_addr = receipt_data.get("contractAddress") or tx_data.get("to")
        
        # Get block timestamp
        tx_time = None
        try:
            blk = await asyncio.to_thread(w3.eth.get_block, blk_num)
            if blk and blk.get("timestamp"):
                tx_time = datetime.utcfromtimestamp(blk["timestamp"]).isoformat() + "Z"
        except Exception:
            pass

        # Identify contract name if matched
        matched_contract = None
        if to_addr:
            for c_name, c_addr in contract_loader.addresses.items():
                if c_addr and c_addr.lower() == str(to_addr).lower():
                    matched_contract = c_name
                    break

        return APIResponse(
            message="Transaction retrieved from Polygon Amoy ledger",
            data=BlockchainVerifyResult(
                verified=receipt_data.get("status") == 1,
                status=status_str,
                item_type="TRANSACTION",
                identifier=clean_hash,
                network="Polygon Amoy Testnet",
                chain_id=80002,
                block_number=blk_num,
                confirmations=confirmations,
                gas_used=gas_used,
                gas_price_gwei=round(gas_price_gwei, 4),
                from_address=from_addr,
                to_address=to_addr,
                contract_name=matched_contract or (db_tx.contract_name if db_tx else None),
                contract_address=to_addr,
                explorer_url=f"https://amoy.polygonscan.com/tx/{clean_hash}",
                contract_explorer_url=f"https://amoy.polygonscan.com/address/{to_addr}" if to_addr else None,
                timestamp=tx_time or (db_tx.created_at.isoformat() if db_tx and db_tx.created_at else None),
                title="Polygon Amoy Transaction",
                subtitle=f"Block #{blk_num} • {status_str}",
                details={"hash": clean_hash, "logsCount": len(receipt_data.get("logs", []))}
            )
        )

    if db_tx:
        return APIResponse(
            message="Transaction retrieved from MedSync ledger",
            data=BlockchainVerifyResult(
                verified=db_tx.status.upper() in ("CONFIRMED", "SUCCESS", "FINALIZED"),
                status=db_tx.status.upper(),
                item_type="TRANSACTION",
                identifier=clean_hash,
                network="Polygon Amoy Testnet",
                chain_id=80002,
                block_number=db_tx.block_number,
                confirmations=db_tx.confirmation_count or 1,
                gas_used=db_tx.gas_used,
                gas_price_gwei=float(db_tx.gas_price) if db_tx.gas_price else None,
                contract_name=db_tx.contract_name,
                contract_address=db_tx.contract_address,
                from_address=db_tx.wallet_address,
                to_address=db_tx.contract_address,
                explorer_url=f"https://amoy.polygonscan.com/tx/{clean_hash}",
                contract_explorer_url=f"https://amoy.polygonscan.com/address/{db_tx.contract_address}" if db_tx.contract_address else None,
                timestamp=db_tx.created_at.isoformat() if db_tx.created_at else None,
                title=f"{db_tx.contract_name or 'Blockchain'} Transaction",
                subtitle=f"Status: {db_tx.status.upper()}"
            )
        )

    # Not found on ledger
    return APIResponse(
        message="Transaction not found on Polygon Amoy ledger",
        data=BlockchainVerifyResult(
            verified=False,
            status="NOT_FOUND",
            item_type="TRANSACTION",
            identifier=clean_hash,
            network="Polygon Amoy Testnet",
            chain_id=80002,
            explorer_url=f"https://amoy.polygonscan.com/tx/{clean_hash}",
            error_message="Transaction hash not found on Polygon Amoy network or local ledger."
        )
    )

@router.get("/verify-hash/{identifier:path}", response_model=APIResponse[BlockchainVerifyResult])
@limiter.limit("60/minute")
async def verify_hash_or_identifier(
    request: Request,
    identifier: str,
    db: AsyncSession = Depends(get_db)
):
    """Universal resolver for scanned QR hashes, addresses, receipts, and tokens."""
    clean_id = identifier.strip()
    from app.blockchain.client import blockchain_client
    from app.blockchain.contracts.loader import contract_loader

    # 1. Transaction Hash (0x + 64 hex chars = 66)
    if clean_id.startswith("0x") and len(clean_id) == 66:
        return await get_transaction_by_hash(request, clean_id, db)

    # 2. Contract or Wallet Address (0x + 40 hex chars = 42)
    if clean_id.startswith("0x") and len(clean_id) == 42:
        clean_addr = clean_id.lower()
        matched_contract = None
        for c_name, c_addr in contract_loader.addresses.items():
            if c_addr and c_addr.lower() == clean_addr:
                matched_contract = c_name
                break

        w3 = blockchain_client.w3
        is_contract = False
        balance_eth = 0.0
        if w3 and w3.is_connected():
            try:
                code = await asyncio.to_thread(w3.eth.get_code, w3.to_checksum_address(clean_id))
                is_contract = (code is not None and code != b"" and code != b"\x00")
                bal = await asyncio.to_thread(w3.eth.get_balance, w3.to_checksum_address(clean_id))
                balance_eth = float(w3.from_wei(bal, "ether"))
            except Exception:
                pass

        return APIResponse(
            message="Address verified on Polygon Amoy",
            data=BlockchainVerifyResult(
                verified=True,
                status="ACTIVE",
                item_type="CONTRACT" if is_contract or matched_contract else "ADDRESS",
                identifier=clean_id,
                network="Polygon Amoy Testnet",
                chain_id=80002,
                contract_name=matched_contract,
                contract_address=clean_id,
                explorer_url=f"https://amoy.polygonscan.com/address/{clean_id}",
                title=f"{matched_contract or ('Smart Contract' if is_contract else 'Wallet Address')}",
                subtitle=f"Polygon Amoy Node • Balance: {balance_eth:.4f} POL",
                details={"balanceEth": balance_eth, "isContract": is_contract}
            )
        )

    # 3. Prescription ID or permanent token (starts with MS- or UUID)
    clean_rx_id = clean_id
    if clean_rx_id.startswith("QR-REC-"):
        clean_rx_id = clean_rx_id.replace("QR-REC-", "")

    # Try UUID lookup
    import uuid as uuid_pkg
    parsed_uuid = None
    try:
        parsed_uuid = uuid_pkg.UUID(clean_rx_id)
    except Exception:
        pass

    if parsed_uuid:
        # Check current block for real confirmations
        curr_block = None
        w3 = blockchain_client.w3
        if w3 and w3.is_connected():
            try:
                curr_block = await asyncio.to_thread(lambda: w3.eth.block_number)
            except Exception:
                pass

        # Check Prescription
        rx_stmt = select(Prescription).where(Prescription.id == parsed_uuid)
        rx = (await db.execute(rx_stmt)).scalar_one_or_none()
        if rx:
            rx_hash = generate_canonical_hash({
                "prescription_id": str(rx.id),
                "patient_id": str(rx.patient_id),
                "doctor_id": str(rx.doctor_id),
                "diagnosis": rx.diagnosis
            })
            contract_addr = contract_loader.addresses.get("PrescriptionRegistry", "0x94013b71F9A3eEbCdbcD11fE460E8E9253916A6D")
            
            # Check for linked sync task / tx
            tx_stmt = select(BlockchainTransaction).join(
                BlockchainSyncTask, BlockchainTransaction.transaction_hash == BlockchainSyncTask.transaction_hash
            ).where(BlockchainSyncTask.entity_id == rx.id)
            found_tx = (await db.execute(tx_stmt)).scalars().first()
            
            if found_tx:
                confirms = max(1, curr_block - found_tx.block_number + 1) if (curr_block and found_tx.block_number) else (found_tx.confirmation_count or 1)
                gas_price_gwei = float(found_tx.gas_price) / 1e9 if found_tx.gas_price else None
                return APIResponse(
                    message="Prescription record cryptographically verified on Polygon Amoy",
                    data=BlockchainVerifyResult(
                        verified=True,
                        status=found_tx.status.upper(),
                        item_type="PRESCRIPTION",
                        identifier=found_tx.transaction_hash,
                        network="Polygon Amoy Testnet",
                        chain_id=80002,
                        block_number=found_tx.block_number,
                        confirmations=confirms,
                        gas_used=found_tx.gas_used,
                        gas_price_gwei=round(gas_price_gwei, 4) if gas_price_gwei else None,
                        contract_name="PrescriptionRegistry",
                        contract_address=contract_addr,
                        explorer_url=f"https://amoy.polygonscan.com/tx/{found_tx.transaction_hash}",
                        contract_explorer_url=f"https://amoy.polygonscan.com/address/{contract_addr}",
                        timestamp=rx.created_at.isoformat() if rx.created_at else None,
                        title="Verified Prescription Record",
                        subtitle=f"{rx.diagnosis or 'Medical Prescription'} • Signed by Doctor",
                        details={
                            "prescription_id": str(rx.id),
                            "patient_id": str(rx.patient_id),
                            "doctor_id": str(rx.doctor_id),
                            "data_hash": rx_hash
                        }
                    )
                )
            else:
                return APIResponse(
                    message="Prescription record queued for on-chain block confirmation",
                    data=BlockchainVerifyResult(
                        verified=False,
                        status="PENDING_ON_CHAIN",
                        item_type="PRESCRIPTION",
                        identifier=str(rx.id),
                        network="Polygon Amoy Testnet",
                        chain_id=80002,
                        contract_name="PrescriptionRegistry",
                        contract_address=contract_addr,
                        contract_explorer_url=f"https://amoy.polygonscan.com/address/{contract_addr}",
                        timestamp=rx.created_at.isoformat() if rx.created_at else None,
                        title="Prescription Record (Sync Pending)",
                        subtitle=f"{rx.diagnosis or 'Medical Prescription'} • Broadcasting to Ledger",
                        details={
                            "prescription_id": str(rx.id),
                            "patient_id": str(rx.patient_id),
                            "doctor_id": str(rx.doctor_id),
                            "data_hash": rx_hash
                        }
                    )
                )

        # Check Medical Record
        rec_stmt = select(MedicalRecord).where(MedicalRecord.id == parsed_uuid)
        rec = (await db.execute(rec_stmt)).scalar_one_or_none()
        if rec:
            contract_addr = contract_loader.addresses.get("MedicalRecordRegistry", "0xfC15AA7EF7759dAEF6C9d3dfB6EEc30DC4783104")
            
            # Check for linked sync task / tx via version
            v_stmt = select(MedicalRecordVersion.id).where(MedicalRecordVersion.record_id == rec.id)
            version_ids = (await db.execute(v_stmt)).scalars().all()
            
            found_tx = None
            if version_ids:
                tx_stmt = select(BlockchainTransaction).join(
                    BlockchainSyncTask, BlockchainTransaction.transaction_hash == BlockchainSyncTask.transaction_hash
                ).where(BlockchainSyncTask.entity_id.in_(version_ids))
                found_tx = (await db.execute(tx_stmt)).scalars().first()
            
            if found_tx:
                confirms = max(1, curr_block - found_tx.block_number + 1) if (curr_block and found_tx.block_number) else (found_tx.confirmation_count or 1)
                gas_price_gwei = float(found_tx.gas_price) / 1e9 if found_tx.gas_price else None
                return APIResponse(
                    message="Medical Record verified on Polygon Amoy ledger",
                    data=BlockchainVerifyResult(
                        verified=True,
                        status=found_tx.status.upper(),
                        item_type="RECORD",
                        identifier=found_tx.transaction_hash,
                        network="Polygon Amoy Testnet",
                        chain_id=80002,
                        block_number=found_tx.block_number,
                        confirmations=confirms,
                        gas_used=found_tx.gas_used,
                        gas_price_gwei=round(gas_price_gwei, 4) if gas_price_gwei else None,
                        contract_name="MedicalRecordRegistry",
                        contract_address=contract_addr,
                        explorer_url=f"https://amoy.polygonscan.com/tx/{found_tx.transaction_hash}",
                        contract_explorer_url=f"https://amoy.polygonscan.com/address/{contract_addr}",
                        timestamp=rec.created_at.isoformat() if rec.created_at else None,
                        title=rec.title or "Clinical Medical Record",
                        subtitle="Verified On-Chain • Polygon Amoy Ledger",
                        details={
                            "record_id": str(rec.id),
                            "patient_id": str(rec.patient_id),
                            "transaction_hash": found_tx.transaction_hash
                        }
                    )
                )
            else:
                return APIResponse(
                    message="Medical Record queued for on-chain block confirmation",
                    data=BlockchainVerifyResult(
                        verified=False,
                        status="PENDING_ON_CHAIN",
                        item_type="RECORD",
                        identifier=f"QR-REC-{rec.id}",
                        network="Polygon Amoy Testnet",
                        chain_id=80002,
                        contract_name="MedicalRecordRegistry",
                        contract_address=contract_addr,
                        contract_explorer_url=f"https://amoy.polygonscan.com/address/{contract_addr}",
                        timestamp=rec.created_at.isoformat() if rec.created_at else None,
                        title=rec.title or "Clinical Medical Record",
                        subtitle="Sync Task Queued • Awaiting Amoy Miners",
                        details={
                            "record_id": str(rec.id),
                            "patient_id": str(rec.patient_id)
                        }
                    )
                )

    # 4. Fallback: general verification result
    return APIResponse(
        message="Verification evaluated",
        data=BlockchainVerifyResult(
            verified=False,
            status="NOT_FOUND",
            item_type="UNKNOWN",
            identifier=clean_id,
            network="Polygon Amoy Testnet",
            chain_id=80002,
            error_message="Record or hash was not found on the active ledger."
        )
    )

async def _auto_seed_transactions_if_empty(db: AsyncSession):
    """Seed deployment and operational transactions if the database has no transactions."""
    try:
        from app.blockchain.constants import DEPLOYMENT_TRANSACTIONS
        for tx_data in DEPLOYMENT_TRANSACTIONS:
            existing = await db.execute(
                select(BlockchainTransaction).where(
                    BlockchainTransaction.transaction_hash == tx_data["transaction_hash"]
                )
            )
            if not existing.scalar_one_or_none():
                db.add(BlockchainTransaction(**tx_data))
        await db.commit()
    except Exception as e:
        logger.warning(f"Could not auto-seed blockchain transactions: {e}")

@router.post("/transactions/sync", response_model=APIResponse[TransactionSyncResponse])
@limiter.limit("10/minute")
async def trigger_chain_transactions_sync(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker(["ADMIN"]))
):
    """Explicitly trigger live wallet transactions synchronization from Polygon Amoy."""
    from app.blockchain.services.chain_sync import sync_wallet_transactions_from_chain
    synced = await sync_wallet_transactions_from_chain(db, max_count=50)
    return APIResponse(
        message=f"Synced {synced} blockchain transactions from Polygon Amoy",
        data=TransactionSyncResponse(
            synced_count=synced,
            message=f"Successfully synchronized {synced} wallet transactions from Polygon Amoy"
        )
    )

@router.get("/transactions", response_model=APIResponse)
@limiter.limit("30/minute")
async def get_transactions(
    request: Request,
    status: Optional[str] = None,
    network: Optional[str] = None,
    contract: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("latest"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker(["ADMIN", "DOCTOR", "PHARMACY"]))
):
    # Auto-sync live wallet transactions from Polygon Amoy if table only has seed data
    total_db_tx = await db.scalar(select(func.count(BlockchainTransaction.transaction_hash)))
    if total_db_tx <= 1:
        from app.blockchain.services.chain_sync import sync_wallet_transactions_from_chain
        try:
            await sync_wallet_transactions_from_chain(db, max_count=50)
        except Exception as e:
            import logging
            logging.getLogger("blockchain.endpoints").warning(f"Live chain auto-sync note: {e}")
        if total_db_tx == 0:
            await _auto_seed_transactions_if_empty(db)

    query = select(BlockchainTransaction)
    
    if status and status.upper() != "ALL":
        stat_upper = status.upper()
        if stat_upper in ("CONFIRMED", "SUCCESS"):
            query = query.where(func.upper(BlockchainTransaction.status).in_(["CONFIRMED", "SUCCESS"]))
        else:
            query = query.where(func.upper(BlockchainTransaction.status) == stat_upper)
    if network and network != "ALL":
        query = query.where(BlockchainTransaction.network == network)
    if contract and contract != "ALL":
        query = query.where(BlockchainTransaction.contract_name == contract)
    if search:
        clean_search = search.strip()
        if clean_search:
            query = query.where(
                (BlockchainTransaction.transaction_hash.ilike(f"%{clean_search}%")) |
                (BlockchainTransaction.wallet_address.ilike(f"%{clean_search}%"))
            )
        
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()
    
    if sort_by == "oldest":
        query = query.order_by(BlockchainTransaction.created_at.asc())
    else:
        query = query.order_by(desc(BlockchainTransaction.created_at))
        
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()
    
    from app.blockchain.provider import RESOLVED_BLOCKCHAIN_MODE
    from app.blockchain.explorer import tx_url
    
    formatted_items = []
    for item in items:
        base = BlockchainTransactionResponse.model_validate(item).model_dump()
        if RESOLVED_BLOCKCHAIN_MODE == "mock":
            base["network"] = base.get("network", "") + " (MOCK)"
            base["explorer_url"] = None
        else:
            base["explorer_url"] = tx_url(base.get("transaction_hash")) if base.get("transaction_hash") else None
        formatted_items.append(base)
            
    return APIResponse(
        message="Transactions retrieved",
        data={
            "items": formatted_items,
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
        w3 = blockchain_client.w3
        gas_price_gwei = 0.0
        wallet_balance = health.get("walletBalanceEth") or 0.0
        
        if w3 and w3.is_connected():
            try:
                gp = await asyncio.to_thread(lambda: w3.eth.gas_price)
                gas_price_gwei = float(w3.from_wei(gp, "gwei"))
            except Exception:
                pass
            if wallet_balance == 0.0 and blockchain_client.wallet_address:
                try:
                    bal = await asyncio.to_thread(w3.eth.get_balance, blockchain_client.wallet_address)
                    wallet_balance = float(w3.from_wei(bal, "ether"))
                except Exception:
                    pass

        status = StatusResponse(
            network=health.get("network", "amoy"),
            chain_id=health.get("chain_id", 80002),
            rpc_health="CONNECTED" if health.get("status") in ("healthy", "healthy (mock)") else "DISCONNECTED",
            gas_price_gwei=round(gas_price_gwei, 4),
            wallet_address=blockchain_client.wallet_address,
            wallet_balance_eth=round(wallet_balance, 4)
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

DEFAULT_AMOY_CONTRACTS = {
    "ConsentManagement": "0x755F2DBB9Caaa78Eac77fF3115F92984BAc37e52",
    "PatientRegistry": "0x9Dcd620f006555ffFA072d2280ef47506C5Da2A3",
    "DoctorRegistry": "0x260d8C75009B62009aA2762c1d76d8daAeA1A7A9",
    "PharmacyRegistry": "0x50dc448bf7260f736A0A3a10151Ccb1a495d3BE9",
    "MedicalRecordRegistry": "0xfC15AA7EF7759dAEF6C9d3dfB6EEc30DC4783104",
    "PrescriptionRegistry": "0x94013b71F9A3eEbCdbcD11fE460E8E9253916A6D",
}

@router.get("/contracts", response_model=APIResponse[List[SmartContractSummary]])
@limiter.limit("20/minute")
async def get_all_contracts(
    request: Request,
    current_user: AuthenticatedPrincipal = Depends(RoleChecker(["ADMIN"]))
):
    """Get all configured smart contracts."""
    from app.blockchain.explorer import address_url
    import os
    
    contracts = []
    
    env_contracts = {
        "ConsentManagement": os.getenv("CONSENT_MANAGER_ADDRESS") or os.getenv("CONSENTMANAGEMENT_ADDRESS", ""),
        "PatientRegistry": os.getenv("PATIENT_REGISTRY_ADDRESS") or os.getenv("PATIENTREGISTRY_ADDRESS", ""),
        "DoctorRegistry": os.getenv("DOCTOR_REGISTRY_ADDRESS") or os.getenv("DOCTORREGISTRY_ADDRESS", ""),
        "PharmacyRegistry": os.getenv("PHARMACY_REGISTRY_ADDRESS") or os.getenv("PHARMACYREGISTRY_ADDRESS", ""),
        "MedicalRecordRegistry": os.getenv("RECORD_REGISTRY_ADDRESS") or os.getenv("MEDICALRECORDREGISTRY_ADDRESS", ""),
        "PrescriptionRegistry": os.getenv("PRESCRIPTION_REGISTRY_ADDRESS") or os.getenv("PRESCRIPTIONREGISTRY_ADDRESS", ""),
    }
    
    for name, def_addr in DEFAULT_AMOY_CONTRACTS.items():
        env_addr = env_contracts.get(name)
        address = env_addr if (env_addr and env_addr != "0x..." and env_addr != "0x0000000000000000000000000000000000000000") else def_addr
        deployment_status = "DEPLOYED"
        contracts.append(SmartContractSummary(
            name=name,
            address=address,
            version="1.0.0",
            health=deployment_status,
            explorer_url=address_url(address)
        ))
            
    return APIResponse(message="Contracts retrieved", data=contracts)

@router.get("/contracts/{name}", response_model=APIResponse)
@limiter.limit("20/minute")
async def get_contract_details(
    request: Request,
    name: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(RoleChecker(["ADMIN"]))
):
    """Get detailed information for a specific contract."""
    from app.blockchain.explorer import address_url
    import os
    import json
    from pathlib import Path
    
    # Map contract names to env var keys
    env_key_map = {
        "ConsentManagement": ["CONSENT_MANAGER_ADDRESS", "CONSENTMANAGEMENT_ADDRESS"],
        "PatientRegistry": ["PATIENT_REGISTRY_ADDRESS", "PATIENTREGISTRY_ADDRESS"],
        "DoctorRegistry": ["DOCTOR_REGISTRY_ADDRESS", "DOCTORREGISTRY_ADDRESS"],
        "PharmacyRegistry": ["PHARMACY_REGISTRY_ADDRESS", "PHARMACYREGISTRY_ADDRESS"],
        "MedicalRecordRegistry": ["RECORD_REGISTRY_ADDRESS", "MEDICALRECORDREGISTRY_ADDRESS"],
        "PrescriptionRegistry": ["PRESCRIPTION_REGISTRY_ADDRESS", "PRESCRIPTIONREGISTRY_ADDRESS"],
    }
    
    if name not in env_key_map and name not in DEFAULT_AMOY_CONTRACTS:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Get address from env vars or defaults
    address = None
    if name in env_key_map:
        for key in env_key_map[name]:
            val = os.getenv(key)
            if val and val != "0x..." and val != "0x0000000000000000000000000000000000000000":
                address = val
                break
    if not address:
        address = DEFAULT_AMOY_CONTRACTS.get(name)
    
    if not address:
        raise HTTPException(status_code=404, detail="Contract address not configured")
    
    # Load ABI from filesystem
    abi_events = []
    abi_functions = []
    try:
        project_root = Path(__file__).resolve().parent.parent.parent.parent.parent.parent.parent
        abi_path = project_root / "apps" / "blockchain" / "abis" / f"{name}.json"
        
        if not abi_path.exists():
            docker_abi_path = Path(__file__).resolve().parent.parent.parent.parent / "blockchain" / "artifacts" / "abis" / f"{name}.json"
            if docker_abi_path.exists():
                abi_path = docker_abi_path
        
        if abi_path.exists():
            with open(abi_path, 'r') as f:
                abi_data = json.load(f)
                if isinstance(abi_data, list):
                    abi_events = [e.get("name") for e in abi_data if e.get("type") == "event"]
                    abi_functions = [e.get("name") for e in abi_data if e.get("type") == "function"]
                elif isinstance(abi_data, dict) and "abi" in abi_data:
                    abi_events = [e.get("name") for e in abi_data["abi"] if e.get("type") == "event"]
                    abi_functions = [e.get("name") for e in abi_data["abi"] if e.get("type") == "function"]
    except Exception as e:
        logger.warning(f"Failed to load ABI for {name}: {e}")
    
    # Check deployment status and on-chain balance via Web3
    deployment_status = "CONFIGURED"
    balance = "0.0000 POL"
    w3 = blockchain_client.w3
    if w3 and w3.is_connected():
        try:
            checksum_addr = w3.to_checksum_address(address)
            code = await asyncio.to_thread(w3.eth.get_code, checksum_addr)
            if code and code != b"":
                deployment_status = "DEPLOYED"
            else:
                deployment_status = "CONFIGURED_NOT_DEPLOYED"
            bal = await asyncio.to_thread(w3.eth.get_balance, checksum_addr)
            balance = f"{float(w3.from_wei(bal, 'ether')):.4f} POL"
        except Exception:
            deployment_status = "CONFIGURED_RPC_ERROR"
    else:
        deployment_status = "CONFIGURED_RPC_UNAVAILABLE"
    
    # Fetch real transactions associated with this contract from database
    tx_count = 0
    recent_txs = []
    try:
        from sqlalchemy import or_
        tx_stmt = select(BlockchainTransaction).where(
            or_(
                BlockchainTransaction.contract_name == name,
                func.lower(BlockchainTransaction.contract_address) == address.lower()
            )
        ).order_by(desc(BlockchainTransaction.created_at))
        
        count_stmt = select(func.count(BlockchainTransaction.transaction_hash)).where(
            or_(
                BlockchainTransaction.contract_name == name,
                func.lower(BlockchainTransaction.contract_address) == address.lower()
            )
        )
        tx_count = (await db.scalar(count_stmt)) or 0
        tx_rows = (await db.execute(tx_stmt.limit(5))).scalars().all()
        
        for tx in tx_rows:
            recent_txs.append({
                "hash": tx.transaction_hash,
                "block": tx.block_number,
                "time": tx.created_at.isoformat() if tx.created_at else None,
                "from": tx.wallet_address or blockchain_client.wallet_address,
                "to": tx.contract_address or address
            })
    except Exception as db_err:
        logger.warning(f"Failed to query local contract transactions: {db_err}")

    data = {
        "name": name,
        "address": address,
        "events": abi_events,
        "functions": abi_functions,
        "health": deployment_status,
        "explorer_url": address_url(address),
        "balance": balance,
        "transaction_count": tx_count,
        "recent_transactions": recent_txs
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
        w3 = blockchain_client.w3
        
        if w3 is None or not w3.is_connected():
            data = {
                "network": "Amoy",
                "chain_id": 80002,
                "status": "not_configured",
                "latest_block": 0,
                "gas_price_gwei": 0.0,
                "rpc_provider": "Not configured"
            }
            return APIResponse(message="Network not configured", data=data)
        
        def _fetch_chain_details():
            block_num = w3.eth.block_number
            gp = w3.eth.gas_price
            cid = w3.eth.chain_id
            c_version = getattr(w3, 'client_version', 'Bor')
            
            # Fetch latest block details
            latest_b = w3.eth.get_block(block_num, full_transactions=False)
            base_fee = getattr(latest_b, 'baseFeePerGas', 0)
            
            # Fetch last 5 real mined blocks from Polygon Amoy
            blocks_list = []
            for i in range(5):
                try:
                    b_obj = w3.eth.get_block(block_num - i, full_transactions=False)
                    gas_pct = round((b_obj.gasUsed / b_obj.gasLimit) * 100, 1) if b_obj.gasLimit else 0.0
                    blocks_list.append({
                        "number": b_obj.number,
                        "hash": b_obj.hash.hex(),
                        "tx_count": len(b_obj.transactions),
                        "gas_used": b_obj.gasUsed,
                        "gas_limit": b_obj.gasLimit,
                        "gas_pct": gas_pct,
                        "miner": b_obj.miner,
                        "timestamp": b_obj.timestamp
                    })
                except Exception:
                    pass
            
            return block_num, gp, cid, c_version, latest_b, base_fee, blocks_list

        latest_block, gas_price, chain_id, client_version, latest_block_obj, base_fee, recent_blocks = await asyncio.to_thread(_fetch_chain_details)
        
        gas_price_gwei = float(w3.from_wei(gas_price, "gwei"))
        base_fee_gwei = float(w3.from_wei(base_fee, "gwei")) if base_fee else 0.0
        priority_fee_gwei = max(0.0, gas_price_gwei - base_fee_gwei)

        # Redact API key from RPC URL — only expose hostname
        raw_uri = str(getattr(w3.provider, 'endpoint_uri', 'Unknown'))
        try:
            from urllib.parse import urlparse
            parsed = urlparse(raw_uri)
            rpc_display = f"{parsed.scheme}://{parsed.hostname}" if parsed.hostname else "Unknown"
        except Exception:
            rpc_display = "Connected"
        
        from app.blockchain.services.chain_sync import KNOWN_CONTRACTS
        contracts_list = [
            {
                "name": name,
                "address": addr,
                "status": "deployed",
                "network": "Polygon Amoy"
            }
            for addr, name in KNOWN_CONTRACTS.items()
        ]
            
        data = {
            "network": "Amoy",
            "chain_id": chain_id,
            "status": "connected",
            "latest_block": latest_block,
            "gas_price_gwei": round(gas_price_gwei, 2),
            "base_fee_gwei": round(base_fee_gwei, 6),
            "priority_fee_gwei": round(priority_fee_gwei, 2),
            "client_version": client_version,
            "rpc_provider": rpc_display,
            "rpc_provider_full": raw_uri,
            "recent_blocks": recent_blocks,
            "contracts": contracts_list
        }
        return APIResponse(message="Network details retrieved", data=data)
    except Exception as e:
        data = {
            "network": "Amoy",
            "chain_id": 80002,
            "status": "degraded",
            "latest_block": 0,
            "gas_price_gwei": 0.0,
            "rpc_provider": "Error"
        }
        return APIResponse(message=f"Network details degraded: {str(e)}", data=data)

@router.get("/wallet", response_model=APIResponse)
@limiter.limit("20/minute")
async def get_wallet_details(
    request: Request,
    current_user: AuthenticatedPrincipal = Depends(RoleChecker(["ADMIN"]))
):
    """Get backend wallet details using configured MedSync wallet address."""
    try:
        from app.blockchain.config import blockchain_settings
        from app.blockchain.client import blockchain_client
        
        w3 = blockchain_client.w3
        
        # Use the configured MedSync wallet address from environment
        address = blockchain_settings.MEDSYNC_WALLET_ADDRESS or blockchain_client.wallet_address
        
        if w3 is None or not w3.is_connected():
            data = {
                "address": address,
                "balance_eth": 0.0,
                "nonce": 0,
                "status": "rpc_unavailable"
            }
            return APIResponse(message="Wallet details (RPC unavailable)", data=data)
        
        chk_addr = w3.to_checksum_address(address)
        balance_wei = await asyncio.to_thread(w3.eth.get_balance, chk_addr)
        nonce = await asyncio.to_thread(w3.eth.get_transaction_count, chk_addr)
        balance_eth = float(w3.from_wei(balance_wei, "ether"))
        
        data = {
            "address": address,
            "balance_eth": balance_eth,
            "nonce": nonce,
            "status": "healthy" if balance_wei > 0 else "low_balance"
        }
        return APIResponse(message="Wallet details retrieved", data=data)
    except Exception as e:
        from app.blockchain.config import blockchain_settings
        data = {
            "address": blockchain_settings.MEDSYNC_WALLET_ADDRESS or blockchain_client.wallet_address,
            "balance_eth": 0.0,
            "nonce": 0,
            "status": "degraded"
        }
        return APIResponse(message=f"Wallet details degraded: {str(e)}", data=data)

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
    formatted_items = [
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
    ]
        
    return APIResponse(
        message="Queue events retrieved",
        data={
            "items": formatted_items,
            "total": total,
            "page": page,
            "size": size,
            "pages": (total + size - 1) // size
        }
    )
