from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import User, UserRole
from app.models.pharmacy_system import MedicineOrder, MedicineOrderItem, MedicineInventory, OrderStatus
from app.models.prescription import Prescription
from app.models.pharmacy import Pharmacy
from app.schemas.response import APIResponse
from typing import List
import uuid
import hmac
import hashlib
import os

router = APIRouter()
require_pharmacy = RoleChecker([UserRole.PHARMACY])

def _generate_qr_identifier(pharmacy_id: uuid.UUID) -> str:
    """Generate a persistent, HMAC-signed opaque QR identifier for a pharmacy."""
    secret = os.getenv("JWT_SECRET_KEY", "medsync-default-qr-key")
    payload = str(pharmacy_id)
    signature = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
    return f"QR-PHM-{signature}"

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
    if not qr_identifier.startswith("QR-PHM-"):
        raise HTTPException(status_code=400, detail="Invalid QR code format")
        
    stmt = select(Pharmacy, User).join(User, Pharmacy.user_id == User.id).where(Pharmacy.qr_identifier == qr_identifier)
    result = await db.execute(stmt)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
        
    pharmacy, user = row
    
    if pharmacy.qr_status != "ACTIVE":
        raise HTTPException(status_code=403, detail="This pharmacy QR code is inactive or revoked.")
        
    return APIResponse(message="Pharmacy resolved successfully", data={
        "pharmacy_id": pharmacy.user_id,
        "business_name": pharmacy.business_name,
        "address": pharmacy.address,
        "contact_number": pharmacy.contact_number,
        "logo_url": pharmacy.logo_url
    })

@router.get("/inventory")
async def get_inventory_stub():
    return APIResponse(message="Please use /api/v1/inventory", data=[])

@router.get("/orders")
async def get_orders(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_pharmacy)):
    # Fetch orders for this pharmacy
    stmt = select(MedicineOrder, User).join(User, MedicineOrder.patient_id == User.id).where(MedicineOrder.pharmacy_id == current_user.id)
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
            "patient_name": f"{patient.first_name} {patient.last_name}",
            "patient_address": order.delivery_address,
            "medication": medication_str,
            "status": order.status,
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
