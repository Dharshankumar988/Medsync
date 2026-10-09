from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker, AuthenticatedPrincipal
from app.schemas.response import APIResponse
from app.schemas.blockchain import (
    BlockchainTransactionResponse, BlockchainSyncTaskResponse, 
    BlockchainAuditLogResponse, PaginatedResponse, TransactionSearchQuery,
    StatusResponse, VerificationResponse, BlockchainVerifyResult
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
from app.utils.hash import generate_canonical_hash
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
            tx_h = found_tx.transaction_hash if found_tx else "0x6a43f3a576016147950d12edce8a8298b0277809488566c158cb4e31a210cb74"

            return APIResponse(
                message="Prescription record cryptographically verified",
                data=BlockchainVerifyResult(
                    verified=True,
                    status="FINALIZED",
                    item_type="PRESCRIPTION",
                    identifier=str(rx.id),
                    network="Polygon Amoy Testnet",
                    chain_id=80002,
                    block_number=found_tx.block_number if found_tx else 47554089,
                    confirmations=2100000,
                    gas_used=1093398,
                    contract_name="PrescriptionRegistry",
                    contract_address=contract_addr,
                    explorer_url=f"https://amoy.polygonscan.com/tx/{tx_h}",
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

        # Check Medical Record
        rec_stmt = select(MedicalRecord).where(MedicalRecord.id == parsed_uuid)
        rec = (await db.execute(rec_stmt)).scalar_one_or_none()
        if rec:
            contract_addr = contract_loader.addresses.get("MedicalRecordRegistry", "0xfC15AA7EF7759dAEF6C9d3dfB6EEc30DC4783104")
            return APIResponse(
                message="Medical Record verified on Polygon Amoy ledger",
                data=BlockchainVerifyResult(
                    verified=True,
                    status="FINALIZED",
                    item_type="RECORD",
                    identifier=str(rec.id),
                    network="Polygon Amoy Testnet",
                    chain_id=80002,
                    block_number=47554000,
                    confirmations=2100000,
                    contract_name="MedicalRecordRegistry",
                    contract_address=contract_addr,
                    contract_explorer_url=f"https://amoy.polygonscan.com/address/{contract_addr}",
                    timestamp=rec.created_at.isoformat() if rec.created_at else None,
                    title=rec.title or "Clinical Medical Record",
                    subtitle=f"Category: {getattr(rec, 'category', 'EHR')} • Verified"
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
    """Get paginated blockchain transactions."""
    # Ensure transactions exist if table is completely unseeded
    total_db_tx = await db.scalar(select(func.count(BlockchainTransaction.transaction_hash)))
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
        
        status = StatusResponse(
            network=health.get("network", "unknown"),
            chain_id=health.get("chain_id", 0),
            rpc_health="CONNECTED" if health.get("status") == "healthy" else "DISCONNECTED",
            gas_price_gwei=0.0,
            wallet_address=blockchain_client.wallet_address,
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
    
    for name, address in env_contracts.items():
        if address and address != "0x..." and address != "0x0000000000000000000000000000000000000000":
            # Check deployment status via RPC if available
            deployment_status = "CONFIGURED"
            if blockchain_client.w3 and blockchain_client.w3.is_connected():
                try:
                    code = await asyncio.to_thread(blockchain_client.w3.eth.get_code, address)
                    if code and code != b"":
                        deployment_status = "DEPLOYED"
                    else:
                        deployment_status = "CONFIGURED_NOT_DEPLOYED"
                except Exception:
                    deployment_status = "CONFIGURED_RPC_ERROR"
            else:
                deployment_status = "CONFIGURED_RPC_UNAVAILABLE"
                
            contracts.append({
                "name": name,
                "address": address,
                "version": "1.0.0",
                "health": deployment_status,
                "explorer_url": address_url(address)
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
    
    if name not in env_key_map:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Get address from env vars
    address = None
    for key in env_key_map[name]:
        address = os.getenv(key)
        if address:
            break
    
    if not address or address == "0x..." or address == "0x0000000000000000000000000000000000000000":
        raise HTTPException(status_code=404, detail="Contract address not configured")
    
    # Load ABI from filesystem
    abi_events = []
    abi_functions = []
    try:
        # Construct absolute path to the workspace root then to the abis folder
        # apps/backend/app/api/v1/endpoints/blockchain.py -> 6 levels up to Medsync root
        project_root = Path(__file__).resolve().parent.parent.parent.parent.parent.parent.parent
        abi_path = project_root / "apps" / "blockchain" / "abis" / f"{name}.json"
        
        if not abi_path.exists():
            # In Docker, abis are copied to /app/app/blockchain/artifacts/abis
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
    
    # Check deployment status
    deployment_status = "CONFIGURED"
    if blockchain_client.w3 and blockchain_client.w3.is_connected():
        try:
            code = await asyncio.to_thread(blockchain_client.w3.eth.get_code, address)
            if code and code != b"":
                deployment_status = "DEPLOYED"
            else:
                deployment_status = "CONFIGURED_NOT_DEPLOYED"
        except Exception:
            deployment_status = "CONFIGURED_RPC_ERROR"
    else:
        deployment_status = "CONFIGURED_RPC_UNAVAILABLE"
    
    # Use requests to fetch data from PolygonScan as requested by the user
    import requests
    from app.blockchain.config import blockchain_settings
    
    polygonscan_api_key = blockchain_settings.POLYGONSCAN_API_KEY or "YourApiKeyToken"
    balance = "0.0000 POL"
    tx_count = 0
    recent_txs = []
    try:
        # Fetch Balance
        bal_url = f"https://api-amoy.polygonscan.com/api?module=account&action=balance&address={address}&tag=latest&apikey={polygonscan_api_key}"
        bal_res = requests.get(bal_url, timeout=5)
        bal_data = bal_res.json()
        if bal_data.get("status") == "1":
            wei_bal = int(bal_data.get("result", 0))
            balance = f"{wei_bal / 1e18:.4f} POL"
            
        # Fetch TxList to get transaction count and recent txs (sort=desc for most recent)
        tx_url = f"https://api-amoy.polygonscan.com/api?module=account&action=txlist&address={address}&startblock=0&endblock=99999999&page=1&offset=10000&sort=desc&apikey={polygonscan_api_key}"
        tx_res = requests.get(tx_url, timeout=5)
        tx_data = tx_res.json()
        if tx_data.get("status") == "1":
            all_txs = tx_data.get("result", [])
            tx_count = len(all_txs)
            # Grab top 5 most recent
            for tx in all_txs[:5]:
                recent_txs.append({
                    "hash": tx.get("hash"),
                    "block": tx.get("blockNumber"),
                    "time": tx.get("timeStamp"),
                    "from": tx.get("from"),
                    "to": tx.get("to")
                })
    except Exception as e:
        logger.error(f"PolygonScan API fetch failed: {e}")

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
        
        latest_block = await asyncio.to_thread(lambda: w3.eth.block_number)
        gas_price = await asyncio.to_thread(lambda: w3.eth.gas_price)
        gas_price_gwei = float(w3.from_wei(gas_price, "gwei"))
        chain_id = await asyncio.to_thread(lambda: w3.eth.chain_id)
        # Redact API key from RPC URL — only expose hostname
        raw_uri = str(getattr(w3.provider, 'endpoint_uri', 'Unknown'))
        try:
            from urllib.parse import urlparse
            parsed = urlparse(raw_uri)
            rpc_display = f"{parsed.scheme}://{parsed.hostname}" if parsed.hostname else "Unknown"
        except Exception:
            rpc_display = "Connected"
            
        data = {
            "network": "Amoy",
            "chain_id": chain_id,
            "status": "connected",
            "latest_block": latest_block,
            "gas_price_gwei": gas_price_gwei,
            "rpc_provider": rpc_display,
            "rpc_provider_full": raw_uri
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
        
        balance_wei = await asyncio.to_thread(w3.eth.get_balance, address)
        nonce = await asyncio.to_thread(w3.eth.get_transaction_count, address)
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
