from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user
from app.schemas.session import AuthenticatedPrincipal
from app.models.user import UserRole
from app.models.dispensing_log import PrescriptionDispensingLog
from app.models.pharmacy_system import MedicineOrder
from app.models.pharmacy import Pharmacy
from app.schemas.response import APIResponse
from app.schemas.delivery import ActiveDeliveryItem, DeliveryDetailData
from datetime import datetime
import uuid

router = APIRouter()

@router.get("/tracking/active", response_model=APIResponse[List[ActiveDeliveryItem]])
async def get_active_deliveries(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user)
):
    """
    Get active delivery tracking for the current patient.
    Aggregates active dispensing logs and in-flight medicine orders.
    """
    if current_user.role.upper() != UserRole.PATIENT.value:
        raise HTTPException(status_code=403, detail="Only patients can view delivery tracking")
    
    # 1. Get dispensing logs with active or in-transit status for this patient
    stmt = select(PrescriptionDispensingLog).where(
        PrescriptionDispensingLog.patient_id == current_user.id,
        PrescriptionDispensingLog.delivery_status.in_(["DISPATCHED", "IN_TRANSIT", "PENDING"])
    ).order_by(PrescriptionDispensingLog.dispensed_at.desc())
    
    result = await db.execute(stmt)
    logs = result.scalars().all()
    
    active_deliveries: List[ActiveDeliveryItem] = []
    seen_prescription_ids = set()
    
    for log in logs:
        route_data = log.delivery_route or {}
        current_location = log.current_location or {}
        
        # Calculate smooth progression based on elapsed time (capped at 97% until confirmed received)
        elapsed_seconds = (datetime.utcnow() - log.delivery_started_at).total_seconds() if log.delivery_started_at else 0
        est_mins = log.estimated_delivery_minutes or 10
        raw_pct = int((elapsed_seconds / (est_mins * 60)) * 100) if est_mins else 0
        progress = min(97, max(18, raw_pct))
        
        # Find current waypoint based on elapsed time
        current_waypoint = None
        if route_data and "waypoints" in route_data:
            waypoints = route_data["waypoints"]
            for wp in waypoints:
                if wp.get("cumulative_time", 0) <= elapsed_seconds:
                    current_waypoint = wp
                else:
                    break
        
        if current_waypoint and not current_location:
            log.current_location = current_waypoint
            await db.commit()
            
        seen_prescription_ids.add(str(log.prescription_id))

        # Check corresponding MedicineOrder to provide order_id
        order_match_stmt = (
            select(MedicineOrder)
            .where(MedicineOrder.prescription_id == log.prescription_id)
            .order_by(MedicineOrder.created_at.desc())
        )
        order_match_res = await db.execute(order_match_stmt)
        matched_order = order_match_res.scalars().first()
        
        active_deliveries.append(ActiveDeliveryItem(
            dispensing_log_id=str(log.id),
            prescription_id=str(log.prescription_id),
            pharmacy_id=str(log.pharmacy_id),
            pharmacy_name=log.dispensed_by_name or "Partner Pharmacy",
            delivery_status=log.delivery_status,
            delivery_started_at=log.delivery_started_at.isoformat() if log.delivery_started_at else None,
            estimated_delivery_minutes=est_mins,
            progress=progress,
            route=route_data,
            current_location=log.current_location or current_waypoint,
            order_id=str(matched_order.id) if matched_order else str(log.id),
            can_confirm_received=True,
            order_type=matched_order.order_type if matched_order else "ONLINE_DELIVERY"
        ))

    # 2. Also check active medicine orders for this patient
    order_stmt = select(MedicineOrder).where(
        MedicineOrder.patient_id == current_user.id,
        MedicineOrder.status.in_(["SHIPPED", "OUT_FOR_DELIVERY", "DISPATCHED", "PROCESSING", "PENDING"])
    ).order_by(MedicineOrder.created_at.desc())
    
    order_res = await db.execute(order_stmt)
    orders = order_res.scalars().all()
    
    for o in orders:
        # Avoid duplicate if prescription already in dispensing logs
        if o.prescription_id and str(o.prescription_id) in seen_prescription_ids:
            continue
            
        # Get pharmacy business name
        pharm_name = "Care Pharmacy"
        pharm_stmt = select(Pharmacy).where(Pharmacy.user_id == o.pharmacy_id)
        pharm_res = await db.execute(pharm_stmt)
        pharm = pharm_res.scalar_one_or_none()
        if pharm and pharm.business_name:
            pharm_name = pharm.business_name
            
        elapsed_seconds = (datetime.utcnow() - o.created_at).total_seconds() if o.created_at else 0
        est_mins = 10
        raw_pct = int((elapsed_seconds / (est_mins * 60)) * 100)
        progress = min(97, max(18, raw_pct))
        
        active_deliveries.append(ActiveDeliveryItem(
            dispensing_log_id=str(o.id),
            prescription_id=str(o.prescription_id or o.id),
            pharmacy_id=str(o.pharmacy_id),
            pharmacy_name=pharm_name,
            delivery_status="IN_TRANSIT" if o.status in ["SHIPPED", "OUT_FOR_DELIVERY", "DISPATCHED"] else "DISPATCHED",
            delivery_started_at=o.created_at.isoformat() if o.created_at else datetime.utcnow().isoformat(),
            estimated_delivery_minutes=est_mins,
            progress=progress,
            route=None,
            current_location=None,
            order_id=str(o.id),
            can_confirm_received=True,
            order_type=o.order_type
        ))
    
    return APIResponse(message="Active deliveries retrieved", data=active_deliveries)

@router.get("/tracking/{dispensing_log_id}", response_model=APIResponse[DeliveryDetailData])
async def get_delivery_tracking(
    dispensing_log_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user)
):
    """
    Get detailed tracking for a specific delivery.
    """
    if current_user.role.upper() != UserRole.PATIENT.value:
        raise HTTPException(status_code=403, detail="Only patients can view delivery tracking")
    
    stmt = select(PrescriptionDispensingLog).where(
        PrescriptionDispensingLog.id == dispensing_log_id,
        PrescriptionDispensingLog.patient_id == current_user.id
    )
    result = await db.execute(stmt)
    log = result.scalar_one_or_none()
    
    if not log:
        # Fallback to check medicine orders
        order_stmt = select(MedicineOrder).where(
            MedicineOrder.id == dispensing_log_id,
            MedicineOrder.patient_id == current_user.id
        )
        order_res = await db.execute(order_stmt)
        order = order_res.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Delivery not found")
            
        return APIResponse(
            message="Delivery tracking retrieved",
            data=DeliveryDetailData(
                dispensing_log_id=str(order.id),
                prescription_id=str(order.prescription_id or order.id),
                delivery_status=str(order.status),
                delivery_started_at=order.created_at.isoformat() if order.created_at else None,
                delivery_completed_at=None,
                estimated_delivery_minutes=10,
                route=None,
                current_location=None
            )
        )
    
    return APIResponse(
        message="Delivery tracking retrieved",
        data=DeliveryDetailData(
            dispensing_log_id=str(log.id),
            prescription_id=str(log.prescription_id),
            delivery_status=log.delivery_status,
            delivery_started_at=log.delivery_started_at.isoformat() if log.delivery_started_at else None,
            delivery_completed_at=log.delivery_completed_at.isoformat() if log.delivery_completed_at else None,
            estimated_delivery_minutes=log.estimated_delivery_minutes or 10,
            route=log.delivery_route,
            current_location=log.current_location
        )
    )

@router.post("/tracking/{tracking_id}/confirm-received", response_model=APIResponse[DeliveryDetailData])
async def confirm_delivery_received(
    tracking_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user)
):
    """
    Patient action: confirms that the delivery package has been physically received.
    Transitions delivery and order status to DELIVERED, sets progress to 100%, and archives from active tracking.
    """
    from app.models.notification import Notification
    from app.services.notification import NotificationService
    from app.models.pharmacy_system import OrderStatus, DeliveryTracking
    import uuid

    if current_user.role.upper() != UserRole.PATIENT.value:
        raise HTTPException(status_code=403, detail="Only the recipient patient can confirm delivery receipt")

    # Try parsing UUID
    target_uuid = None
    try:
        target_uuid = uuid.UUID(tracking_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid tracking or order ID format")

    # 1. Check PrescriptionDispensingLog
    log_stmt = select(PrescriptionDispensingLog).where(
        (PrescriptionDispensingLog.id == target_uuid) |
        (PrescriptionDispensingLog.prescription_id == target_uuid)
    )
    log_res = await db.execute(log_stmt)
    log = log_res.scalar_one_or_none()

    # 2. Check MedicineOrder
    order_stmt = select(MedicineOrder).where(
        (MedicineOrder.id == target_uuid) |
        (MedicineOrder.prescription_id == target_uuid)
    )
    order_res = await db.execute(order_stmt)
    order = order_res.scalar_one_or_none()

    if not log and not order:
        raise HTTPException(status_code=404, detail="Active delivery record not found")

    # Verify authorization
    patient_id = (log.patient_id if log else None) or (order.patient_id if order else None)
    if patient_id != current_user.id and current_user.role.upper() != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Unauthorized to confirm delivery for this patient")

    now = datetime.utcnow()

    # Update Dispensing Log
    if log:
        log.delivery_status = "DELIVERED"
        log.delivery_completed_at = now

    # Update Medicine Order
    if order:
        order.status = OrderStatus.DELIVERED

    # Update DeliveryTracking model if exists
    tracking_stmt = select(DeliveryTracking).where(
        (DeliveryTracking.order_id == (order.id if order else target_uuid)) |
        (DeliveryTracking.id == target_uuid)
    )
    tracking_res = await db.execute(tracking_stmt)
    tracking = tracking_res.scalar_one_or_none()
    if tracking:
        tracking.current_status = "DELIVERED"
        tracking.delivery_completed_at = now
        tracking.delivery_progress = 100

    await db.commit()

    # Notify Pharmacy of successful receipt
    pharmacy_id = (log.pharmacy_id if log else None) or (order.pharmacy_id if order else None)
    if pharmacy_id:
        try:
            await NotificationService.send_notification(
                db,
                user_id=pharmacy_id,
                title="Package Received by Patient",
                message=f"Patient confirmed package receipt for Order #{str(tracking_id)[:8]}.",
                type="DELIVERY"
            )
        except Exception:
            pass

    return APIResponse(
        message="Package receipt confirmed successfully! Delivery is now marked as Delivered.",
        data=DeliveryDetailData(
            dispensing_log_id=str(log.id if log else order.id),
            prescription_id=str(log.prescription_id if log else (order.prescription_id or order.id)),
            delivery_status="DELIVERED",
            delivery_started_at=log.delivery_started_at.isoformat() if log and log.delivery_started_at else None,
            delivery_completed_at=now.isoformat(),
            estimated_delivery_minutes=0,
            route=log.delivery_route if log else None,
            current_location=log.current_location if log else None
        )
    )

