from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import User, UserRole
from app.schemas.response import APIResponse
from app.schemas.pharmacy_system import MedicineOrderCreate, MedicineOrderResponse
from app.services.pharmacy_system import PharmacyService
from app.models.pharmacy_system import DeliveryTracking, MedicineOrder, OrderStatus
import uuid
from datetime import datetime, timedelta
import hashlib
import random
from pydantic import BaseModel
from sqlalchemy import select

router = APIRouter()
require_patient = RoleChecker([UserRole.PATIENT])

@router.get("/", response_model=APIResponse[list[MedicineOrderResponse]])
@router.get("", response_model=APIResponse[list[MedicineOrderResponse]])
async def list_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == UserRole.PATIENT:
        stmt = select(MedicineOrder).where(MedicineOrder.patient_id == current_user.id).order_by(MedicineOrder.created_at.desc())
    elif current_user.role == UserRole.PHARMACY:
        stmt = select(MedicineOrder).where(MedicineOrder.pharmacy_id == current_user.id).order_by(MedicineOrder.created_at.desc())
    else:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Unauthorized to view orders")
        
    result = await db.execute(stmt)
    orders = result.scalars().all()
    
    return APIResponse(message="Orders retrieved successfully", data=orders)

@router.post("/", response_model=APIResponse[MedicineOrderResponse], status_code=status.HTTP_201_CREATED)
async def place_order(
    req: MedicineOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_patient)
):
    order = await PharmacyService.place_order(db, current_user.id, req)
    return APIResponse(message="Order placed successfully", data=order)



@router.post("/{order_id}/dispatch", response_model=APIResponse)
async def dispatch_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.PHARMACY]))
):
    # Verify order ownership and status
    order_stmt = select(MedicineOrder).where(MedicineOrder.id == order_id).with_for_update()
    order_res = await db.execute(order_stmt)
    order = order_res.scalar_one_or_none()
    
    if not order:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.pharmacy_id != current_user.id:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Unauthorized to dispatch this order")
        
    if order.status in [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.OUT_FOR_DELIVERY]:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Cannot dispatch order currently in state {order.status}")

    # Retrieve order and delivery tracking
    stmt = select(DeliveryTracking).where(DeliveryTracking.order_id == order_id)
    result = await db.execute(stmt)
    tracking = result.scalar_one_or_none()
    
    if not tracking:
        tracking = DeliveryTracking(
            order_id=order_id,
            tracking_number=f"TRK-BLR-{random.randint(1000, 9999)}",
            current_status="PREPARING"
        )
        db.add(tracking)
        
    # Assign simulated driver
    drivers = [
        ("Rahul Kumar", "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul", "KA-01-AB-1234", "Electric Bike"),
        ("Amit Singh", "https://api.dicebear.com/7.x/avataaars/svg?seed=Amit", "KA-03-CD-5678", "Scooter"),
        ("Kiran Desai", "https://api.dicebear.com/7.x/avataaars/svg?seed=Kiran", "KA-05-EF-9012", "Bike"),
        ("Arjun Reddy", "https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun", "KA-02-GH-3456", "Electric Scooter")
    ]
    driver = random.choice(drivers)
    
    # Simulation Start Parameters (Bangalore coords)
    tracking.delivery_started_at = datetime.utcnow()
    tracking.delivery_eta = datetime.utcnow() + timedelta(minutes=15)
    tracking.driver_name = driver[0]
    tracking.driver_avatar = driver[1]
    tracking.vehicle_number = driver[2]
    tracking.vehicle_type = driver[3]
    tracking.delivery_speed = random.randint(30, 50)
    
    # Mock Start/End for Bangalore
    tracking.start_latitude = 12.9229 + random.uniform(-0.01, 0.01)
    tracking.start_longitude = 77.6175 + random.uniform(-0.01, 0.01)
    tracking.end_latitude = 12.9716 + random.uniform(-0.01, 0.01)
    tracking.end_longitude = 77.5946 + random.uniform(-0.01, 0.01)
    
    tracking.current_latitude = tracking.start_latitude
    tracking.current_longitude = tracking.start_longitude
    
    # Update order status
    order.status = OrderStatus.OUT_FOR_DELIVERY

    await db.commit()
    
    return APIResponse(
        message="Order dispatched successfully.",
        data={
            "driver_name": driver[0],
            "vehicle": driver[3]
        }
    )

@router.get("/{order_id}/tracking", response_model=APIResponse)
async def get_tracking(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.PATIENT, UserRole.PHARMACY]))
):
    # Verify order ownership
    order_stmt = select(MedicineOrder).where(MedicineOrder.id == order_id)
    order_res = await db.execute(order_stmt)
    order = order_res.scalar_one_or_none()
    
    if not order:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Order not found")
        
    if current_user.role == UserRole.PATIENT and order.patient_id != current_user.id:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Unauthorized to track this order")
    elif current_user.role == UserRole.PHARMACY and order.pharmacy_id != current_user.id:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Unauthorized to track this order")
        
    stmt = select(DeliveryTracking).where(DeliveryTracking.order_id == order_id)
    result = await db.execute(stmt)
    tracking = result.scalar_one_or_none()
    
    if not tracking:
        return APIResponse(message="No tracking info available yet", data=None)
        
    return APIResponse(
        message="Tracking retrieved successfully",
        data={
            "tracking_number": tracking.tracking_number,
            "status": tracking.current_status,
            "eta": tracking.delivery_eta,
            "driver_name": tracking.driver_name,
            "driver_avatar": tracking.driver_avatar,
            "vehicle": tracking.vehicle_number,
            "start_coords": [tracking.start_latitude, tracking.start_longitude],
            "end_coords": [tracking.end_latitude, tracking.end_longitude],
            "current_coords": [tracking.current_latitude, tracking.current_longitude],
            "progress": tracking.delivery_progress
        }
    )

from fastapi import BackgroundTasks
import asyncio
from app.database.session import AsyncSessionLocal

async def simulate_delivery(order_id: uuid.UUID):
    try:
        # Simulate delivery taking 10 minutes
        await asyncio.sleep(600)
        async with AsyncSessionLocal() as db:
            stmt = select(MedicineOrder).where(MedicineOrder.id == order_id)
            result = await db.execute(stmt)
            order = result.scalar_one_or_none()
            if order and order.status != OrderStatus.DELIVERED:
                order.status = OrderStatus.DELIVERED
                
                # Update tracking if it exists
                tracking_stmt = select(DeliveryTracking).where(DeliveryTracking.order_id == order_id)
                tracking_res = await db.execute(tracking_stmt)
                tracking = tracking_res.scalar_one_or_none()
                if tracking:
                    tracking.current_status = "DELIVERED"
                    tracking.delivery_completed_at = datetime.utcnow()
                    tracking.delivery_progress = 100
                await db.commit()
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to update delivery status for order {order_id}: {e}")

@router.post("/{order_id}/pay", response_model=APIResponse)
async def pay_order(
    order_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.PATIENT]))
):
    # Verify order ownership
    order_stmt = select(MedicineOrder).where(MedicineOrder.id == order_id).with_for_update()
    order_res = await db.execute(order_stmt)
    order = order_res.scalar_one_or_none()
    
    if not order:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.patient_id != current_user.id:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Unauthorized to pay for this order")
        
    if order.status != OrderStatus.PENDING:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Cannot pay for order in state {order.status}")

    # Deduct stock here for confirmed online order
    from app.models.pharmacy_system import MedicineOrderItem, MedicineInventory
    items_stmt = select(MedicineOrderItem, MedicineInventory).join(
        MedicineInventory, MedicineOrderItem.inventory_id == MedicineInventory.id
    ).where(MedicineOrderItem.order_id == order.id)
    
    items_res = await db.execute(items_stmt)
    items = items_res.all()
    
    # Verify enough stock first
    for item, inv in items:
        if inv.stock_quantity < item.quantity:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail=f"Insufficient stock for inventory batch {inv.batch_number}")
            
    # Deduct stock
    for item, inv in items:
        inv.stock_quantity -= item.quantity

    # Payment successful: Just set it to ACCEPTED
    order.status = OrderStatus.ACCEPTED
    await db.commit()
    
    background_tasks.add_task(simulate_delivery, order.id)
    
    return APIResponse(message="Payment successful", data={"order_id": str(order_id)})

