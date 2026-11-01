from fastapi import APIRouter, Depends, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import User, UserRole
from app.schemas.response import APIResponse
from app.schemas.pharmacy_system import MedicineOrderCreate, MedicineOrderResponse, OrderDetailData
from app.services.pharmacy_system import PharmacyService
from app.services.notification import NotificationService
from app.models.pharmacy_system import DeliveryTracking, MedicineOrder, OrderStatus, MedicineOrderItem, MedicineInventory
import uuid
from datetime import datetime, timedelta
import hashlib
import random
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import select

router = APIRouter()
require_patient = RoleChecker([UserRole.PATIENT])

@router.get("/", response_model=APIResponse[list[MedicineOrderResponse]])
@router.get("", response_model=APIResponse[list[MedicineOrderResponse]])
async def list_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_role = str(current_user.role).upper()
    if user_role == UserRole.PATIENT.value:
        stmt = select(MedicineOrder).where(MedicineOrder.patient_id == current_user.id).order_by(MedicineOrder.created_at.desc())
    elif user_role == UserRole.PHARMACY.value:
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
    background_tasks: BackgroundTasks,
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

    # Trigger notifications
    await NotificationService.send_notification(
        db,
        user_id=order.patient_id,
        title="Order Out for Delivery",
        message=f"Your medicine Order #{str(order_id)[:8]} is out for delivery with {driver[0]} ({driver[3]}).",
        type="DELIVERY"
    )
    if order.pharmacy_id:
        await NotificationService.send_notification(
            db,
            user_id=order.pharmacy_id,
            title="Order Dispatched",
            message=f"Order #{str(order_id)[:8]} dispatched with driver {driver[0]}.",
            type="DELIVERY"
        )

    # Start delivery simulation in background
    background_tasks.add_task(simulate_delivery, order.id)
    
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
        
    user_role = str(current_user.role).upper()
    if user_role == UserRole.PATIENT.value and order.patient_id != current_user.id:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Unauthorized to track this order")
    elif user_role == UserRole.PHARMACY.value and order.pharmacy_id != current_user.id:
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

import asyncio
from app.database.session import AsyncSessionLocal

async def simulate_delivery(order_id: uuid.UUID):
    try:
        # Simulate delivery route progress
        await asyncio.sleep(45)
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

                # Trigger notifications on simulation completion
                await NotificationService.send_notification(
                    db,
                    user_id=order.patient_id,
                    title="Delivery Arrived",
                    message=f"Your medicine delivery for Order #{str(order_id)[:8]} has arrived safely!",
                    type="DELIVERY"
                )
                if order.pharmacy_id:
                    await NotificationService.send_notification(
                        db,
                        user_id=order.pharmacy_id,
                        title="Order Delivered",
                        message=f"Order #{str(order_id)[:8]} has been successfully delivered to the patient.",
                        type="DELIVERY"
                    )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to update delivery status for order {order_id}: {e}")

@router.post("/{order_id}/complete-delivery", response_model=APIResponse)
async def complete_delivery_now(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Instantly completes a delivery simulation and emits arrival notifications."""
    stmt = select(MedicineOrder).where(MedicineOrder.id == order_id)
    result = await db.execute(stmt)
    order = result.scalar_one_or_none()
    if not order:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = OrderStatus.DELIVERED
    tracking_stmt = select(DeliveryTracking).where(DeliveryTracking.order_id == order_id)
    tracking_res = await db.execute(tracking_stmt)
    tracking = tracking_res.scalar_one_or_none()
    if tracking:
        tracking.current_status = "DELIVERED"
        tracking.delivery_completed_at = datetime.utcnow()
        tracking.delivery_progress = 100

    await db.commit()

    # Trigger notifications
    await NotificationService.send_notification(
        db,
        user_id=order.patient_id,
        title="Delivery Arrived",
        message=f"Your medicine delivery for Order #{str(order_id)[:8]} has arrived safely!",
        type="DELIVERY"
    )
    if order.pharmacy_id:
        await NotificationService.send_notification(
            db,
            user_id=order.pharmacy_id,
            title="Order Delivered",
            message=f"Order #{str(order_id)[:8]} has been successfully delivered to the patient.",
            type="DELIVERY"
        )

    return APIResponse(message="Delivery marked as completed and notifications sent", data={"order_id": str(order_id)})

class PayOrderPayload(BaseModel):
    payment_method: Optional[str] = "ONLINE"  # "ONLINE" or "CASH_ON_DELIVERY"

@router.get("/{order_id}", response_model=APIResponse[OrderDetailData])
async def get_order_by_id(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(MedicineOrder).where(MedicineOrder.id == order_id)
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()
    if not order:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Order not found")

    user_role = str(current_user.role).upper()
    if user_role == UserRole.PATIENT.value and order.patient_id != current_user.id:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Unauthorized to view this order")
    elif user_role == UserRole.PHARMACY.value and order.pharmacy_id != current_user.id:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Unauthorized to view this order")

    from app.models.pharmacy import Pharmacy
    from app.models.prescription import PrescriptionItem
    from sqlalchemy import or_

    pharm_name = "Partner Pharmacy"
    pharm_stmt = select(Pharmacy).where(or_(Pharmacy.user_id == order.pharmacy_id, Pharmacy.id == order.pharmacy_id))
    pharm_res = await db.execute(pharm_stmt)
    pharm = pharm_res.scalar_one_or_none()
    if pharm:
        pharm_name = pharm.business_name

    # Collect medication summary
    medications = []
    items_stmt = select(MedicineOrderItem, MedicineInventory).join(
        MedicineInventory, MedicineOrderItem.inventory_id == MedicineInventory.id
    ).where(MedicineOrderItem.order_id == order.id)
    items_res = await db.execute(items_stmt)
    items = items_res.all()
    for item, inv in items:
        medications.append(f"Batch {inv.batch_number} (x{item.quantity})")

    if not medications and order.prescription_id:
        rx_items_stmt = select(PrescriptionItem).where(PrescriptionItem.prescription_id == order.prescription_id)
        rx_items_res = await db.execute(rx_items_stmt)
        for p_item in rx_items_res.scalars().all():
            medications.append(f"{p_item.medicine_name} ({p_item.dosage})")

    med_summary = ", ".join(medications) if medications else "Prescription Medication Order"

    return APIResponse(
        message="Order retrieved successfully",
        data={
            "id": str(order.id),
            "pharmacy_id": str(order.pharmacy_id),
            "patient_id": str(order.patient_id),
            "prescription_id": str(order.prescription_id) if order.prescription_id else None,
            "status": str(order.status),
            "order_type": order.order_type,
            "total_amount": float(order.total_amount or 0.0),
            "delivery_address": order.delivery_address,
            "delivery_latitude": float(order.delivery_latitude) if order.delivery_latitude else 12.9229,
            "delivery_longitude": float(order.delivery_longitude) if order.delivery_longitude else 77.6175,
            "created_at": str(order.created_at) if order.created_at else None,
            "updated_at": str(order.updated_at) if order.updated_at else None,
            "medication": med_summary,
            "pharmacies": {"full_name": pharm_name}
        }
    )

@router.post("/{order_id}/pay", response_model=APIResponse)
async def pay_order(
    order_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    payload: Optional[PayOrderPayload] = None,
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
        
    is_cod = payload and payload.payment_method == "CASH_ON_DELIVERY"

    if order.status != OrderStatus.PENDING:
        # If order was already accepted/paid, return success idempotently
        return APIResponse(
            message="Order is already confirmed.", 
            data={"order_id": str(order_id), "status": str(order.status), "already_confirmed": True}
        )

    # Deduct stock safely
    from app.models.pharmacy_system import MedicineOrderItem, MedicineInventory
    items_stmt = select(MedicineOrderItem, MedicineInventory).join(
        MedicineInventory, MedicineOrderItem.inventory_id == MedicineInventory.id
    ).where(MedicineOrderItem.order_id == order.id)
    
    items_res = await db.execute(items_stmt)
    items = items_res.all()
    
    # Deduct available stock gracefully
    for item, inv in items:
        inv.stock_quantity = max(0, inv.stock_quantity - item.quantity)

    # Update order status to ACCEPTED
    order.status = OrderStatus.ACCEPTED
    await db.commit()
    
    background_tasks.add_task(simulate_delivery, order.id)
    
    msg = "Order placed with Cash on Delivery (COD)!" if is_cod else "Payment successful!"
    return APIResponse(
        message=msg, 
        data={
            "order_id": str(order_id), 
            "status": str(order.status),
            "payment_method": "CASH_ON_DELIVERY" if is_cod else "ONLINE"
        }
    )

