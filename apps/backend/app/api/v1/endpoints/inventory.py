from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, and_, asc, desc
from typing import List, Optional
import datetime

from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.schemas.session import AuthenticatedPrincipal
from app.models.user import User, UserRole
from app.models.pharmacy_system import MedicineInventory, Medicine, Supplier, MedicineCategory
from app.schemas.pharmacy_system import (
    MedicineInventoryResponse,
    MedicineInventoryCreate,
    MedicineResponse,
    AddInventoryItemRequest,
    AddInventoryItemResponseData,
    RestockOrderResponseData,
    RestockOrderItemResponse,
)
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
import datetime

class RestockRequest(BaseModel):
    medicine_id: Optional[uuid.UUID] = None
    medicine_name: Optional[str] = None
    quantity: int
    pin: str

@router.post("/restock", response_model=APIResponse[RestockOrderResponseData])
async def place_restock_order(
    req: RestockRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_pharmacy)
):
    from app.services.security_service import validate_pharmacy_pin
    is_valid = await validate_pharmacy_pin(db, current_user.id, req.pin)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid Authorization PIN.")

    from app.models.pharmacy_system import PharmacyRestockOrder, Medicine, MedicineCategory
    
    if req.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")

    target_med_id = req.medicine_id
    target_med_name = req.medicine_name

    if target_med_id:
        med_res = await db.execute(select(Medicine).where(Medicine.id == target_med_id))
        med_obj = med_res.scalar_one_or_none()
        if not med_obj:
            raise HTTPException(status_code=404, detail="Selected medicine not found in catalog")
        target_med_name = med_obj.name
    elif target_med_name and target_med_name.strip():
        # Find or create medicine
        clean_name = target_med_name.strip()
        existing_med_res = await db.execute(select(Medicine).where(Medicine.name.ilike(clean_name)))
        med_obj = existing_med_res.scalar_one_or_none()
        if med_obj:
            target_med_id = med_obj.id
            target_med_name = med_obj.name
        else:
            cat_res = await db.execute(select(MedicineCategory).where(MedicineCategory.name.ilike("%General%")))
            cat = cat_res.scalars().first()
            if not cat:
                cat_any = await db.execute(select(MedicineCategory).limit(1))
                cat = cat_any.scalars().first()
            if not cat:
                cat = MedicineCategory(id=uuid.uuid4(), name="General Medicines", description="General pharmaceuticals")
                db.add(cat)
                await db.flush()

            new_med = Medicine(
                id=uuid.uuid4(),
                name=clean_name,
                generic_name=clean_name,
                dosage_form="Tablet",
                manufacturer="Generic Pharma",
                price=10.0,
                category_id=cat.id
            )
            db.add(new_med)
            await db.flush()
            target_med_id = new_med.id
            target_med_name = new_med.name
    else:
        raise HTTPException(status_code=400, detail="Please select a medicine or provide a medicine name to order.")

    expected_dt = datetime.datetime.utcnow() + datetime.timedelta(minutes=2)
    order = PharmacyRestockOrder(
        pharmacy_id=current_user.id,
        medicine_id=target_med_id,
        quantity=req.quantity,
        status="PENDING",
        expected_delivery=expected_dt
    )
    
    db.add(order)
    await db.commit()
    await db.refresh(order)

    exp_str = (
        order.expected_delivery.isoformat() + ("Z" if not order.expected_delivery.tzinfo else "")
        if isinstance(order.expected_delivery, datetime.datetime)
        else str(order.expected_delivery)
    )
    
    return APIResponse(
        message=f"Restock order for {req.quantity} units of {target_med_name} placed successfully. Estimated delivery in 2 minutes.",
        data=RestockOrderResponseData(
            order_id=str(order.id),
            medicine_id=str(target_med_id),
            medicine_name=target_med_name,
            quantity=order.quantity,
            status=order.status,
            expected_delivery=exp_str
        )
    )

@router.get("/restock", response_model=APIResponse[List[RestockOrderItemResponse]])
async def get_restock_orders(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_pharmacy)
):
    from app.models.pharmacy_system import PharmacyRestockOrder, Medicine
    query = (
        select(PharmacyRestockOrder, Medicine)
        .outerjoin(Medicine, PharmacyRestockOrder.medicine_id == Medicine.id)
        .filter(PharmacyRestockOrder.pharmacy_id == current_user.id)
        .order_by(desc(PharmacyRestockOrder.created_at))
    )
    result = await db.execute(query)
    rows = result.all()
    
    data: List[RestockOrderItemResponse] = []
    for order, med in rows:
        exp_delivery_str = (
            order.expected_delivery.isoformat() + ("Z" if not order.expected_delivery.tzinfo else "")
            if isinstance(order.expected_delivery, datetime.datetime)
            else str(order.expected_delivery)
        )
        created_at_str = (
            order.created_at.isoformat() + ("Z" if not order.created_at.tzinfo else "")
            if isinstance(order.created_at, datetime.datetime)
            else str(order.created_at)
        )
        data.append(
            RestockOrderItemResponse(
                id=str(order.id),
                medicine_name=med.name if med else "Custom Medicine",
                quantity=order.quantity,
                status=order.status,
                expected_delivery=exp_delivery_str,
                created_at=created_at_str
            )
        )
        
    return APIResponse(message="Restock orders retrieved", data=data)

@router.post("/restock/{order_id}/deliver", response_model=APIResponse[RestockOrderItemResponse])
async def deliver_restock_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_pharmacy)
):
    from app.models.pharmacy_system import PharmacyRestockOrder, MedicineInventory, Medicine
    res = await db.execute(
        select(PharmacyRestockOrder)
        .where(
            PharmacyRestockOrder.id == order_id,
            PharmacyRestockOrder.pharmacy_id == current_user.id
        )
    )
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Restock order not found")
        
    if order.status != "DELIVERED":
        order.status = "DELIVERED"
        inv_query = select(MedicineInventory).where(
            MedicineInventory.pharmacy_id == order.pharmacy_id,
            MedicineInventory.medicine_id == order.medicine_id
        )
        inv_result = await db.execute(inv_query)
        inv = inv_result.scalar_one_or_none()
        
        if inv:
            inv.stock_quantity += order.quantity
        else:
            new_inv = MedicineInventory(
                pharmacy_id=order.pharmacy_id,
                medicine_id=order.medicine_id,
                batch_number=str(uuid.uuid4())[:8].upper(),
                manufacturing_date=datetime.date.today(),
                expiry_date=datetime.date.today() + datetime.timedelta(days=365*2),
                stock_quantity=order.quantity,
                unit_price=10.0
            )
            db.add(new_inv)
            
        await db.commit()
        await db.refresh(order)

    med_res = await db.execute(select(Medicine).where(Medicine.id == order.medicine_id))
    med = med_res.scalar_one_or_none()
    med_name = med.name if med else "Medicine"

    exp_str = (
        order.expected_delivery.isoformat() + ("Z" if not order.expected_delivery.tzinfo else "")
        if isinstance(order.expected_delivery, datetime.datetime)
        else str(order.expected_delivery)
    )
    created_str = (
        order.created_at.isoformat() + ("Z" if not order.created_at.tzinfo else "")
        if isinstance(order.created_at, datetime.datetime)
        else str(order.created_at)
    )

    return APIResponse(
        message=f"Restock order for {med_name} fulfilled and added to inventory.",
        data=RestockOrderItemResponse(
            id=str(order.id),
            medicine_name=med_name,
            quantity=order.quantity,
            status=order.status,
            expected_delivery=exp_str,
            created_at=created_str
        )
    )

@router.post("/{inventory_id}/discard", response_model=APIResponse)
async def discard_expired_stock(
    inventory_id: uuid.UUID,
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
        
    if inv.expiry_date >= datetime.date.today():
        raise HTTPException(status_code=400, detail="Cannot discard medicine that is not yet expired")
        
    inv.stock_quantity = 0
    await db.commit()
    
    return APIResponse(message="Expired stock discarded successfully", data={"new_quantity": 0})

@router.post("/items", response_model=APIResponse[AddInventoryItemResponseData])
async def add_inventory_item(
    req: AddInventoryItemRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_pharmacy)
):
    """Add a new or existing medicine with stock to the pharmacy's inventory."""
    if req.stock_quantity < 0:
        raise HTTPException(status_code=400, detail="Stock quantity cannot be negative")
    if req.unit_price < 0:
        raise HTTPException(status_code=400, detail="Unit price cannot be negative")

    target_med_id = req.medicine_id
    med_name = req.medicine_name

    if target_med_id:
        med_stmt = select(Medicine).where(Medicine.id == target_med_id)
        med_res = await db.execute(med_stmt)
        med_obj = med_res.scalar_one_or_none()
        if not med_obj:
            raise HTTPException(status_code=404, detail="Selected medicine does not exist in catalog")
        med_name = med_obj.name
    else:
        if not req.medicine_name or not req.medicine_name.strip():
            raise HTTPException(status_code=400, detail="Please provide a medicine name or choose an existing medicine from the catalog")
        
        # Check if medicine already exists with same name
        existing_med_res = await db.execute(select(Medicine).where(Medicine.name.ilike(req.medicine_name.strip())))
        existing_med = existing_med_res.scalar_one_or_none()
        if existing_med:
            target_med_id = existing_med.id
            med_name = existing_med.name
        else:
            # Find default category or create General
            cat_res = await db.execute(select(MedicineCategory).where(MedicineCategory.name.ilike("%General%")))
            cat = cat_res.scalars().first()
            if not cat:
                cat_any = await db.execute(select(MedicineCategory).limit(1))
                cat = cat_any.scalars().first()
            if not cat:
                cat = MedicineCategory(id=uuid.uuid4(), name="General Medicines", description="General over the counter and prescribed pharmaceuticals")
                db.add(cat)
                await db.flush()

            new_med = Medicine(
                id=uuid.uuid4(),
                name=req.medicine_name.strip(),
                generic_name=req.generic_name or req.medicine_name.strip(),
                dosage_form=req.dosage_form or "Tablet",
                strength=req.strength or "",
                manufacturer=req.manufacturer or "Generic Pharma",
                price=req.unit_price,
                category_id=cat.id
            )
            db.add(new_med)
            await db.flush()
            target_med_id = new_med.id
            med_name = new_med.name

    batch_num = req.batch_number.strip() if req.batch_number and req.batch_number.strip() else f"BATCH-{datetime.date.today().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"

    new_inventory = MedicineInventory(
        id=uuid.uuid4(),
        pharmacy_id=current_user.id,
        medicine_id=target_med_id,
        batch_number=batch_num,
        expiry_date=req.expiry_date,
        manufacturing_date=req.manufacturing_date,
        stock_quantity=req.stock_quantity,
        minimum_stock=req.minimum_stock or 10,
        maximum_stock=1000,
        unit_price=req.unit_price,
        selling_price=req.unit_price,
        purchase_price=round(req.unit_price * 0.7, 2)
    )
    db.add(new_inventory)
    await db.commit()

    return APIResponse(
        message=f"Added {req.stock_quantity} units of {med_name} to inventory successfully",
        data=AddInventoryItemResponseData(
            inventory_id=str(new_inventory.id),
            medicine_id=str(target_med_id),
            medicine_name=med_name,
            stock_quantity=new_inventory.stock_quantity,
            batch_number=new_inventory.batch_number,
            unit_price=new_inventory.unit_price,
            expiry_date=str(new_inventory.expiry_date)
        )
    )


