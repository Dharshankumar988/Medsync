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
from pydantic import BaseModel
from sqlalchemy import select

router = APIRouter()
require_patient = RoleChecker([UserRole.PATIENT])

@router.post("/", response_model=APIResponse[MedicineOrderResponse], status_code=status.HTTP_201_CREATED)
async def place_order(
    req: MedicineOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_patient)
):
    order = await PharmacyService.place_order(db, current_user.id, req)
    return APIResponse(message="Order placed successfully", data=order)

class VerifyDeliveryRequest(BaseModel):
    otp: str

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
        
    # Generate OTP
    otp = str(random.randint(100000, 999999))
    otp_hash = hashlib.sha256(otp.encode()).hexdigest()
    
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
    tracking.delivery_progress = 0
    tracking.current_status = "OUT_FOR_DELIVERY"
    
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
    
    tracking.delivery_code_hash = otp_hash
    tracking.delivery_code_expiry = datetime.utcnow() + timedelta(minutes=15)
    
    # Update order status
    order_stmt = select(MedicineOrder).where(MedicineOrder.id == order_id)
    order_res = await db.execute(order_stmt)
    order = order_res.scalar_one_or_none()
    if order:
        order.status = OrderStatus.OUT_FOR_DELIVERY

    await db.commit()
    
    return APIResponse(
        message="Order dispatched successfully.",
        data={
            "otp": otp, # In a real app this is sent via SMS, but we return it here for simulation testing
            "driver_name": driver[0],
            "vehicle": driver[3]
        }
    )

@router.get("/{order_id}/tracking", response_model=APIResponse)
async def get_tracking(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(DeliveryTracking).where(DeliveryTracking.order_id == order_id)
    result = await db.execute(stmt)
    tracking = result.scalar_one_or_none()
    
    if not tracking:
        return APIResponse(message="No tracking found", data=None)
        
    return APIResponse(
        message="Tracking info retrieved",
        data={
            "status": tracking.current_status,
            "started_at": tracking.delivery_started_at,
            "eta": tracking.delivery_eta,
            "driver_name": tracking.driver_name,
            "driver_avatar": tracking.driver_avatar,
            "vehicle_type": tracking.vehicle_type,
            "vehicle_number": tracking.vehicle_number,
            "speed": tracking.delivery_speed,
            "start_lat": tracking.start_latitude,
            "start_lng": tracking.start_longitude,
            "end_lat": tracking.end_latitude,
            "end_lng": tracking.end_longitude,
            "current_lat": tracking.current_latitude,
            "current_lng": tracking.current_longitude,
            "has_otp": bool(tracking.delivery_code_hash)
        }
    )

@router.post("/{order_id}/verify-delivery", response_model=APIResponse)
async def verify_delivery(
    order_id: uuid.UUID,
    req: VerifyDeliveryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.PHARMACY]))
):
    # Verify order ownership
    order_stmt = select(MedicineOrder).where(MedicineOrder.id == order_id).with_for_update()
    order_res = await db.execute(order_stmt)
    order = order_res.scalar_one_or_none()
    
    if not order:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.pharmacy_id != current_user.id:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Unauthorized to verify delivery for this order")
        
    if order.status != OrderStatus.OUT_FOR_DELIVERY:
        return APIResponse(message="Cannot verify delivery: order is not out for delivery", data=None, status_code=400)

    stmt = select(DeliveryTracking).where(DeliveryTracking.order_id == order_id)
    result = await db.execute(stmt)
    tracking = result.scalar_one_or_none()
    
    if not tracking or not tracking.delivery_code_hash:
        return APIResponse(message="Tracking not found or no OTP set", data=None, status_code=400)
        
    if tracking.current_status == "DELIVERED":
        return APIResponse(message="Order already delivered", data=None, status_code=400)
        
    if datetime.utcnow() > tracking.delivery_code_expiry:
        return APIResponse(message="OTP has expired", data=None, status_code=400)
        
    req_hash = hashlib.sha256(req.otp.encode()).hexdigest()
    if req_hash != tracking.delivery_code_hash:
        return APIResponse(message="Invalid OTP", data=None, status_code=400)
        
    # Mark as delivered
    tracking.current_status = "DELIVERED"
    tracking.delivery_completed_at = datetime.utcnow()
    tracking.delivery_code_hash = None # Clear OTP
    tracking.delivery_progress = 100
    
    # Update order
    order_stmt = select(MedicineOrder).where(MedicineOrder.id == order_id)
    order_res = await db.execute(order_stmt)
    order = order_res.scalar_one_or_none()
    if order:
        order.status = OrderStatus.DELIVERED
        
    await db.commit()
    
    return APIResponse(message="Delivery verified and completed successfully", data=None)

@router.post("/{order_id}/generate-delivery-code", response_model=APIResponse)
async def generate_delivery_code(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.PATIENT]))
):
    # Verify order ownership
    order_stmt = select(MedicineOrder).where(MedicineOrder.id == order_id)
    order_res = await db.execute(order_stmt)
    order = order_res.scalar_one_or_none()
    
    if not order:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.patient_id != current_user.id:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Unauthorized to generate code for this order")
        
    stmt = select(DeliveryTracking).where(DeliveryTracking.order_id == order_id).with_for_update()
    result = await db.execute(stmt)
    tracking = result.scalar_one_or_none()
    
    if not tracking:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Tracking info not found")

    # Generate new OTP using cryptographically secure generator
    import secrets
    otp = str(secrets.SystemRandom().randint(1000, 9999)) # 4-digit code requested by user
    otp_hash = hashlib.sha256(otp.encode()).hexdigest()
    
    tracking.delivery_code_hash = otp_hash
    tracking.delivery_code_expiry = datetime.utcnow() + timedelta(minutes=15)
    
    await db.commit()
    
    return APIResponse(message="Code generated successfully", data={"otp": otp})
