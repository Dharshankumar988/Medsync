from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, and_, asc, desc
from typing import List, Optional
import datetime

from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import User, UserRole
from app.models.pharmacy_system import MedicineInventory, Medicine, Supplier
from app.schemas.pharmacy_system import MedicineInventoryResponse, MedicineInventoryCreate, MedicineResponse
from app.schemas.response import APIResponse
from app.utils.cache import async_ttl_cache

router = APIRouter()
require_pharmacy = RoleChecker([UserRole.PHARMACY])

@router.get("/", response_model=APIResponse)
@async_ttl_cache(ttl_seconds=60)
async def get_inventory(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_pharmacy),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    search: Optional[str] = None
):
    query = select(MedicineInventory, Medicine).join(Medicine).filter(MedicineInventory.pharmacy_id == current_user.id)
    
    if search:
        query = query.filter(or_(
            Medicine.name.ilike(f"%{search}%"),
            Medicine.generic_name.ilike(f"%{search}%"),
            Medicine.brand_name.ilike(f"%{search}%"),
            Medicine.barcode.ilike(f"%{search}%"),
            MedicineInventory.batch_number.ilike(f"%{search}%")
        ))
        
    result = await db.execute(query.offset(skip).limit(limit))
    rows = result.all()
    
    data = []
    for inv, med in rows:
        inv_dict = {
            "id": str(inv.id),
            "pharmacy_id": str(inv.pharmacy_id),
            "medicine_id": str(inv.medicine_id),
            "supplier_id": str(inv.supplier_id) if inv.supplier_id else None,
            "batch_number": inv.batch_number,
            "manufacturing_date": str(inv.manufacturing_date) if inv.manufacturing_date else None,
            "expiry_date": str(inv.expiry_date),
            "stock_quantity": inv.stock_quantity,
            "minimum_stock": inv.minimum_stock,
            "maximum_stock": inv.maximum_stock,
            "unit_price": inv.unit_price,
            "purchase_price": inv.purchase_price,
            "selling_price": inv.selling_price,
            "gst": inv.gst,
            "medicine": {
                "name": med.name,
                "generic_name": med.generic_name,
                "brand_name": med.brand_name,
                "barcode": med.barcode
            }
        }
        data.append(inv_dict)
        
    return APIResponse(message="Inventory retrieved successfully", data=data)

@router.get("/alerts", response_model=APIResponse)
async def get_inventory_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_pharmacy)
):
    # Low stock
    low_stock_query = select(MedicineInventory, Medicine).join(Medicine).filter(
        MedicineInventory.pharmacy_id == current_user.id,
        MedicineInventory.stock_quantity <= MedicineInventory.minimum_stock
    )
    
    # Expiring soon (within 30 days)
    thirty_days_from_now = datetime.date.today() + datetime.timedelta(days=30)
    expiring_soon_query = select(MedicineInventory, Medicine).join(Medicine).filter(
        MedicineInventory.pharmacy_id == current_user.id,
        MedicineInventory.expiry_date <= thirty_days_from_now,
        MedicineInventory.expiry_date >= datetime.date.today()
    )
    
    # Expired
    expired_query = select(MedicineInventory, Medicine).join(Medicine).filter(
        MedicineInventory.pharmacy_id == current_user.id,
        MedicineInventory.expiry_date < datetime.date.today()
    )
    
    low_stock_res = await db.execute(low_stock_query)
    expiring_res = await db.execute(expiring_soon_query)
    expired_res = await db.execute(expired_query)
    
    def serialize_rows(rows):
        res = []
        for inv, med in rows:
            res.append({
                "inventory_id": str(inv.id),
                "medicine_name": med.name,
                "batch_number": inv.batch_number,
                "stock_quantity": inv.stock_quantity,
                "expiry_date": str(inv.expiry_date)
            })
        return res

    data = {
        "low_stock": serialize_rows(low_stock_res.all()),
        "expiring_soon": serialize_rows(expiring_res.all()),
        "expired": serialize_rows(expired_res.all())
    }
    
    return APIResponse(message="Inventory alerts retrieved", data=data)

from pydantic import BaseModel
import uuid

class StockAdjustmentRequest(BaseModel):
    quantity_change: int
    reason: str

@router.post("/{inventory_id}/adjust-stock", response_model=APIResponse)
async def adjust_stock(
    inventory_id: uuid.UUID,
    req: StockAdjustmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_pharmacy)
):
    stmt = select(MedicineInventory).where(MedicineInventory.id == inventory_id).with_for_update()
    result = await db.execute(stmt)
    inv = result.scalar_one_or_none()
    
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory item not found")
        
    if inv.pharmacy_id != current_user.id:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Unauthorized to adjust this stock")
        
    new_stock = inv.stock_quantity + req.quantity_change
    if new_stock < 0:
        raise HTTPException(status_code=400, detail="Stock quantity cannot be negative")
        
    inv.stock_quantity = new_stock
    await db.commit()
    
    return APIResponse(message="Stock adjusted successfully", data={"new_quantity": inv.stock_quantity})
