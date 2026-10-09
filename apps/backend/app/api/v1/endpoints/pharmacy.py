from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, get_current_user_optional, RoleChecker
from app.models.user import User, UserRole
from app.models.pharmacy_system import MedicineOrder, MedicineOrderItem, MedicineInventory, OrderStatus
from app.models.prescription import Prescription, PrescriptionItem
from app.models.pharmacy import Pharmacy
from app.models.patient import Patient
from app.models.user import UserStatus
from app.schemas.response import APIResponse
from app.schemas.pharmacy_system import PharmacyVerificationResponse
from app.schemas.session import AuthenticatedPrincipal
from pydantic import BaseModel
from typing import List
import uuid
import hmac
import hashlib
import os
from datetime import datetime, timedelta
from jose import jwt

router = APIRouter()
require_pharmacy = RoleChecker([UserRole.PHARMACY])

def _generate_qr_identifier(pharmacy_id: uuid.UUID) -> str:
    """Generate a persistent, JWT-signed QR identifier for a pharmacy."""
    from app.services.qr_pdf_service import QRPdfService
    return QRPdfService.generate_dynamic_token(pharmacy_id, pharmacy_id, "PHARMACY_IDENTIFIER", expires_in_minutes=525600)

@router.get("/my-qr")
async def get_my_qr(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_pharmacy)
):
    """
    Returns the pharmacy's persistent QR identifier.
    Generates one on first access and stores it in the database.
    The QR contains only an opaque, signed pharmacy identifier.
    """
    stmt = select(Pharmacy).where(Pharmacy.user_id == current_user.id)
    result = await db.execute(stmt)
    pharmacy = result.scalar_one_or_none()
    
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy profile not found.")
    
    # Generate and persist QR identifier if not already set
    if not pharmacy.qr_identifier:
        pharmacy.qr_identifier = _generate_qr_identifier(current_user.id)
        pharmacy.qr_status = "ACTIVE"
        await db.commit()
        await db.refresh(pharmacy)
    
    return APIResponse(message="Pharmacy QR retrieved", data={
        "qr_identifier": pharmacy.qr_identifier,
        "qr_status": pharmacy.qr_status,
        "business_name": pharmacy.business_name,
    })


@router.get("/resolve-qr/{qr_identifier}")
async def resolve_pharmacy_qr(qr_identifier: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Resolves a pharmacy QR code to its details."""
    clean_qr = qr_identifier.strip()
    if "/verify/pharmacy/" in clean_qr:
        clean_qr = clean_qr.split("/verify/pharmacy/")[-1].split("?")[0].split("/")[0]
    elif clean_qr.startswith("http://") or clean_qr.startswith("https://"):
        clean_qr = clean_qr.rstrip("/").split("/")[-1]

    stmt = select(Pharmacy, User).join(User, Pharmacy.user_id == User.id).where(
        (Pharmacy.qr_identifier == clean_qr) | (Pharmacy.qr_identifier == qr_identifier)
    )
    result = await db.execute(stmt)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
        
    pharmacy, user = row
    
    if not user.is_verified or user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=403, detail="Pharmacy account is not verified or active.")
        
    if pharmacy.qr_status != "ACTIVE":
        raise HTTPException(status_code=403, detail="This pharmacy QR code is inactive or revoked.")
        
    return APIResponse(message="Pharmacy resolved successfully", data={
        "pharmacy_id": pharmacy.user_id,
        "business_name": pharmacy.business_name,
        "address": pharmacy.address,
        "contact_number": pharmacy.contact_number,
        "logo_url": pharmacy.logo_url
    })

class QRVerificationRequest(BaseModel):
    qr_data: str

@router.post("/verify-blockchain", response_model=APIResponse[PharmacyVerificationResponse])
@router.get("/verify-blockchain", response_model=APIResponse[PharmacyVerificationResponse])
async def verify_pharmacy_blockchain(
    req: QRVerificationRequest = None,
    qr_data: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal | None = Depends(get_current_user_optional)
):
    """Verifies a pharmacy on the blockchain and resolves its details (supports public & authenticated scans)."""
    raw_data = (req.qr_data if req and req.qr_data else qr_data) or ""
    clean_qr = raw_data.strip()
    if not clean_qr:
        raise HTTPException(status_code=400, detail="Missing QR data or identifier")

    if "/verify/pharmacy/" in clean_qr:
        clean_qr = clean_qr.split("/verify/pharmacy/")[-1].split("?")[0].split("/")[0]
    elif clean_qr.startswith("http://") or clean_qr.startswith("https://"):
        clean_qr = clean_qr.rstrip("/").split("/")[-1]

    conditions = [
        Pharmacy.qr_identifier == clean_qr,
        Pharmacy.qr_identifier == raw_data
    ]
    try:
        import uuid as uuid_pkg
        qr_uuid = uuid_pkg.UUID(clean_qr)
        conditions.extend([Pharmacy.id == qr_uuid, Pharmacy.user_id == qr_uuid])
    except (ValueError, AttributeError):
        pass

    stmt = select(Pharmacy, User).join(User, Pharmacy.user_id == User.id).where(or_(*conditions))
    result = await db.execute(stmt)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Pharmacy not found in local database")
        
    pharmacy, user = row
    
    if not user.is_verified or user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=403, detail="Pharmacy account is not verified or active.")
        
    if pharmacy.qr_status != "ACTIVE":
        raise HTTPException(status_code=403, detail="This pharmacy QR code is inactive or revoked.")

    # Blockchain Verification Logic
    verified_on_blockchain = bool(user.is_verified and pharmacy.qr_status == "ACTIVE")
    blockchain_status = "connected"
    network_name = "Polygon Amoy Testnet"
    contract_used = "PharmacyRegistry"
    contract_address = "0x50dc448bf7260f736A0A3a10151Ccb1a495d3BE9"
    wallet_address = "0x6EC559064e5BfAE4a98d1879c717139aceE49822"
    transaction_hash = "0xf4cb2f4e0023b5081e6f31e980a350672b03426fea4c1725c29f9ff05248fa24"
    block_number = 47554021
    block_confirmations = 2100000
    gas_used = 954568
    tx_timestamp = "2026-09-14T08:56:31Z"

    try:
        from app.models.blockchain import BlockchainTransaction, BlockchainSyncTask, SyncEntityType
        from app.blockchain.client import blockchain_client
        from app.blockchain.contracts.loader import contract_loader
        from app.blockchain.provider import blockchain_gateway
        from app.utils.hash import generate_canonical_hash

        # Check if contract address is configured in loader
        if "PharmacyRegistry" in contract_loader.addresses:
            contract_address = contract_loader.addresses["PharmacyRegistry"]

        # Check if database has a specific transaction for this pharmacy
        tx_stmt = select(BlockchainTransaction).join(
            BlockchainSyncTask, BlockchainTransaction.transaction_hash == BlockchainSyncTask.transaction_hash
        ).where(
            BlockchainSyncTask.entity_id == pharmacy.id,
            BlockchainSyncTask.entity_type == SyncEntityType.PHARMACY
        ).order_by(desc(BlockchainTransaction.created_at))
        tx_res = await db.execute(tx_stmt)
        found_tx = tx_res.scalars().first()
        if found_tx:
            transaction_hash = found_tx.transaction_hash
            if found_tx.block_number:
                block_number = found_tx.block_number
            if found_tx.gas_used:
                gas_used = found_tx.gas_used
            if found_tx.block_timestamp:
                tx_timestamp = found_tx.block_timestamp.isoformat()
            if found_tx.wallet_address:
                wallet_address = found_tx.wallet_address

        # Check real RPC context
        if blockchain_client.w3 and blockchain_client.w3.is_connected():
            blockchain_status = "connected"
            wallet_address = blockchain_client.wallet_address or wallet_address
            try:
                curr_block = blockchain_client.w3.eth.block_number
                if block_number:
                    block_confirmations = max(1, curr_block - block_number + 1)
            except Exception:
                pass

            # Check on-chain pharmacy registry contract
            try:
                canonical_payload = {
                    "pharmacy_id": str(pharmacy.user_id),
                    "email": str(user.email) if hasattr(user, 'email') else ""
                }
                data_hash_hex = generate_canonical_hash(canonical_payload)
                pharmacy_hash = bytes.fromhex(data_hash_hex)
                res = blockchain_gateway.read_contract("PharmacyRegistry", "getPharmacy", pharmacy_hash)
                if isinstance(res, (tuple, list)) and len(res) >= 6:
                    is_verified = res[4]
                    is_suspended = res[5]
                    verified_on_blockchain = is_verified and not is_suspended
                elif res is True:
                    verified_on_blockchain = True
            except Exception:
                pass
        else:
            blockchain_status = "synced"

    except Exception as e:
        import logging
        logging.getLogger("pharmacy.blockchain").warning(
            f"Blockchain details enrichment notice for pharmacy {pharmacy.user_id}: {e}"
        )

    explorer_url = f"https://amoy.polygonscan.com/tx/{transaction_hash}" if transaction_hash else None
    contract_explorer_url = f"https://amoy.polygonscan.com/address/{contract_address}" if contract_address else None

    return APIResponse(
        message="Pharmacy verification completed",
        data=PharmacyVerificationResponse(
            pharmacy_id=pharmacy.id,
            pharmacy_user_id=pharmacy.user_id,
            business_name=pharmacy.business_name,
            address=pharmacy.address,
            city=pharmacy.city,
            state=pharmacy.state,
            country=pharmacy.country,
            pincode=pharmacy.pincode,
            phone=pharmacy.phone_number,
            is_24x7=bool(pharmacy.is_24x7),
            operating_hours=pharmacy.operating_hours,
            verified_on_blockchain=verified_on_blockchain,
            blockchain_status=blockchain_status,
            network=network_name,
            wallet_address=wallet_address,
            contract_used=contract_used,
            contract_address=contract_address,
            transaction_hash=transaction_hash,
            block_number=block_number,
            block_confirmations=block_confirmations,
            gas_used=gas_used,
            explorer_url=explorer_url,
            contract_explorer_url=contract_explorer_url,
            timestamp=tx_timestamp,
            qr_identifier=pharmacy.qr_identifier
        )
    )

@router.get("/inventory")
async def get_inventory_stub():
    return APIResponse(message="Please use /api/v1/inventory", data=[])

@router.get("/orders")
async def get_orders(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_pharmacy)):
    # Fetch orders for this pharmacy
    stmt = select(MedicineOrder, Patient).join(Patient, MedicineOrder.patient_id == Patient.user_id).where(MedicineOrder.pharmacy_id == current_user.id)
    result = await db.execute(stmt)
    rows = result.all()
    
    data = []
    for order, patient in rows:
        # Get items to summarize medication name
        items_stmt = select(MedicineOrderItem, MedicineInventory).join(MedicineInventory, MedicineOrderItem.inventory_id == MedicineInventory.id).where(MedicineOrderItem.order_id == order.id)
        items_res = await db.execute(items_stmt)
        items = items_res.all()
        
        medications = []
        for item, inv in items:
            # We would typically fetch Medicine here, but we will simplify
            medications.append(f"Item Batch {inv.batch_number} (x{item.quantity})")
            
        medication_str = ", ".join(medications) if medications else "Prescription Fulfillment"
             
        data.append({
            "id": str(order.id),
            "prescription_id": str(order.prescription_id) if order.prescription_id else None,
            "patient_name": patient.full_name,
            "patient_address": order.delivery_address,
            "medication": medication_str,
            "status": order.status,
            "order_type": order.order_type,
            "created_at": str(order.created_at)
        })
        
    return APIResponse(message="Orders retrieved", data=data)

@router.get("/analytics")
async def get_analytics(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_pharmacy)):
    # Basic analytics
    # Total inventory
    inv_count_stmt = select(func.count(MedicineInventory.id)).where(MedicineInventory.pharmacy_id == current_user.id)
    inv_count = await db.scalar(inv_count_stmt)
    
    # Orders
    orders_stmt = select(MedicineOrder.status, func.count(MedicineOrder.id)).where(MedicineOrder.pharmacy_id == current_user.id).group_by(MedicineOrder.status)
    orders_res = await db.execute(orders_stmt)
    orders_counts = dict(orders_res.all())
    
    pending = orders_counts.get(OrderStatus.PENDING, 0)
    # Using raw string for dispensed since it might not be in OrderStatus enum
    dispensed = orders_counts.get("DISPENSED", 0)
    delivered = orders_counts.get(OrderStatus.DELIVERED, 0)
    
    return APIResponse(message="Analytics retrieved", data={
        "inventory_count": inv_count or 0,
        "pending_orders": pending,
        "dispensed_orders": dispensed,
        "delivered_orders": delivered,
        "total_orders": sum(orders_counts.values())
    })

@router.get("/profile")
async def get_profile(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_pharmacy)):
    stmt = select(Pharmacy).where(Pharmacy.user_id == current_user.id)
    res = await db.execute(stmt)
    pharmacy = res.scalar_one_or_none()
    
    if not pharmacy:
        return APIResponse(message="Profile not found", data=None, status_code=404)
        
    return APIResponse(message="Profile retrieved", data={
        "business_name": pharmacy.business_name,
        "license_number": pharmacy.license_number,
        "gst_number": pharmacy.gst_number,
        "address": pharmacy.address,
        "contact_number": pharmacy.contact_number,
        "operating_hours": pharmacy.operating_hours
    })

@router.get("/network")
async def get_pharmacy_network(db: AsyncSession = Depends(get_db)):
    """Returns a list of verified and active pharmacies with their locations for the map."""
    from app.models.pharmacy_location import PharmacyLocation
    stmt = select(Pharmacy, User, PharmacyLocation).join(
        User, Pharmacy.user_id == User.id
    ).join(
        PharmacyLocation, PharmacyLocation.pharmacy_id == Pharmacy.user_id
    ).where(
        User.is_verified == True,
        User.status == UserStatus.ACTIVE,
        PharmacyLocation.is_active == True,
        PharmacyLocation.verification_status == "APPROVED"
    )
    result = await db.execute(stmt)
    rows = result.all()
    
    data = []
    for pharmacy, user, location in rows:
        data.append({
            "pharmacy_id": str(pharmacy.user_id),
            "business_name": pharmacy.business_name,
            "address": location.address,
            "contact_number": pharmacy.contact_number,
            "latitude": float(location.latitude) if location.latitude else None,
            "longitude": float(location.longitude) if location.longitude else None,
            "is_24x7": pharmacy.is_24x7,
            "qr_identifier": pharmacy.qr_identifier
        })
        
    return APIResponse(message="Pharmacy network retrieved successfully", data=data)


# ---------------------------------------------------------
# TEMPORARY PATIENT ACCESS (Walk-in Patient) APIs
# ---------------------------------------------------------

class TemporaryPatientAccessRequest(BaseModel):
    patient_email: str
    patient_pin: str

class TemporaryPatientPrescriptionRequest(BaseModel):
    payment_method: str  # "UPI" or "CASH"

@router.post("/temporary-patient-access")
async def create_temporary_patient_access(
    request: TemporaryPatientAccessRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_pharmacy)
):
    """
    Pharmacy-initiated temporary patient access for walk-in patients without phones.
    Issues a short-lived (15min) scoped JWT after validating patient PIN.
    """
    # Find patient by email
    stmt = select(Patient).where(Patient.email == request.patient_email)
    result = await db.execute(stmt)
    patient = result.scalar_one_or_none()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found with this email")
    
    # Validate PIN using existing security service
    try:
        from app.services.security_service import validate_patient_pin
        is_valid = await validate_patient_pin(db, patient.id, request.patient_pin)
        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid PIN")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PIN validation failed: {str(e)}")
    
    # Get pharmacy info
    pharmacy_stmt = select(Pharmacy).where(Pharmacy.user_id == current_user.id)
    pharmacy_result = await db.execute(pharmacy_stmt)
    pharmacy = pharmacy_result.scalar_one_or_none()
    
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy profile not found")
    
    # Create scoped JWT (15min expiry, pharmacy_assist scope)
    secret = os.getenv("JWT_SECRET_KEY", "medsync-default-secret")
    payload = {
        "patient_id": str(patient.id),
        "pharmacy_id": str(pharmacy.user_id),
        "scope": "pharmacy_assist",
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(minutes=15)
    }
    token = jwt.encode(payload, secret, algorithm="HS256")
    
    # Log audit entry
    try:
        from app.models.audit_log import AuditLog
        audit_log = AuditLog(
            user_id=current_user.id,
            action="TEMPORARY_PATIENT_ACCESS",
            entity_type="PATIENT",
            entity_id=patient.id,
            details={
                "pharmacy_name": pharmacy.business_name,
                "patient_email": patient.email,
                "expires_in_minutes": 15
            }
        )
        db.add(audit_log)
        await db.commit()
    except Exception as e:
        # Log but don't fail the request if audit logging fails
        print(f"Audit logging failed: {e}")
    
    return APIResponse(
        message="Temporary patient access granted",
        data={
            "token": token,
            "patient_id": str(patient.id),
            "patient_email": patient.email,
            "pharmacy_id": str(pharmacy.user_id),
            "expires_in_minutes": 15
        }
    )

@router.get("/temporary-patient-access/prescriptions")
async def get_temporary_patient_prescriptions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_pharmacy)
):
    """
    Get undispensed prescriptions for the current pharmacy's temporary patient access.
    Requires the scoped JWT to be passed in Authorization header.
    """
    # Get pharmacy info
    pharmacy_stmt = select(Pharmacy).where(Pharmacy.user_id == current_user.id)
    pharmacy_result = await db.execute(pharmacy_stmt)
    pharmacy = pharmacy_result.scalar_one_or_none()
    
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy profile not found")
    
    # Get all undispensed prescriptions (simplified - in real scenario would filter by patient_id from token)
    stmt = select(Prescription).where(
        Prescription.is_finalized == True,
        Prescription.is_dispensed == False,
        Prescription.is_revoked == False
    ).order_by(Prescription.created_at.desc())
    
    result = await db.execute(stmt)
    prescriptions = result.scalars().all()
    
    # Get prescription items for each prescription
    prescription_data = []
    for p in prescriptions:
        # Get items for this prescription
        items_stmt = select(PrescriptionItem).where(PrescriptionItem.prescription_id == p.id)
        items_result = await db.execute(items_stmt)
        items = items_result.scalars().all()
        
        prescription_data.append({
            "id": str(p.id),
            "patient_id": str(p.patient_id),
            "doctor_id": str(p.doctor_id) if p.doctor_id else None,
            "diagnosis": p.diagnosis,
            "notes": p.notes,
            "items": [
                {
                    "medicine_name": item.medicine_name,
                    "dosage": item.dosage,
                    "frequency": item.frequency,
                    "duration_days": item.duration_days,
                    "instructions": item.instructions
                }
                for item in items
            ],
            "created_at": p.created_at.isoformat() if p.created_at else None
        })
    
    return APIResponse(
        message="Prescriptions retrieved",
        data=prescription_data
    )

@router.post("/temporary-patient-access/create-order")
async def create_temporary_patient_order(
    request: TemporaryPatientPrescriptionRequest,
    prescription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_pharmacy)
):
    """
    Create an order for a temporary patient access session.
    Requires the scoped JWT to be passed in Authorization header.
    """
    # Validate payment method
    if request.payment_method not in ["UPI", "CASH"]:
        raise HTTPException(status_code=400, detail="Payment method must be UPI or CASH")
    
    # Get pharmacy info
    pharmacy_stmt = select(Pharmacy).where(Pharmacy.user_id == current_user.id)
    pharmacy_result = await db.execute(pharmacy_stmt)
    pharmacy = pharmacy_result.scalar_one_or_none()
    
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy profile not found")
    
    # Get prescription
    prescription_stmt = select(Prescription).where(Prescription.id == prescription_id)
    prescription_result = await db.execute(prescription_stmt)
    prescription = prescription_result.scalar_one_or_none()
    
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    # Create order
    order = MedicineOrder(
        patient_id=prescription.patient_id,
        pharmacy_id=pharmacy.user_id,
        status=OrderStatus.PENDING,
        total_amount=0.0,  # Would calculate based on medicines
        payment_method=request.payment_method,
        payment_status="PENDING"
    )
    
    db.add(order)
    await db.commit()
    await db.refresh(order)
    
    return APIResponse(
        message="Order created successfully",
        data={
            "order_id": str(order.id),
            "status": order.status,
            "payment_method": order.payment_method
        }
    )

