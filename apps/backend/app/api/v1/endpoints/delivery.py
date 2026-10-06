from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user
from app.schemas.session import AuthenticatedPrincipal
from app.models.user import UserRole
from app.models.dispensing_log import PrescriptionDispensingLog
from app.schemas.response import APIResponse
from datetime import datetime
import uuid

router = APIRouter()

@router.get("/tracking/active", response_model=APIResponse)
async def get_active_deliveries(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user)
):
    """
    Get active delivery tracking for the current patient.
    """
    if current_user.role.upper() != UserRole.PATIENT.value:
        raise HTTPException(status_code=403, detail="Only patients can view delivery tracking")
    
    # Get dispensing logs with active or in-transit status for this patient
    stmt = select(PrescriptionDispensingLog).where(
        PrescriptionDispensingLog.patient_id == current_user.id,
        PrescriptionDispensingLog.delivery_status.in_(["DISPATCHED", "IN_TRANSIT"])
    ).order_by(PrescriptionDispensingLog.dispensed_at.desc())
    
    result = await db.execute(stmt)
    logs = result.scalars().all()
    
    active_deliveries = []
    for log in logs:
        route_data = log.delivery_route or {}
        current_location = log.current_location or {}
        
        # Calculate progress based on elapsed time
        elapsed_seconds = (datetime.utcnow() - log.delivery_started_at).total_seconds() if log.delivery_started_at else 0
        progress = min(100, int((elapsed_seconds / (log.estimated_delivery_minutes * 60)) * 100)) if log.estimated_delivery_minutes else 0
        
        # Find current waypoint based on elapsed time
        current_waypoint = None
        if route_data and "waypoints" in route_data:
            waypoints = route_data["waypoints"]
            for wp in waypoints:
                if wp["cumulative_time"] <= elapsed_seconds:
                    current_waypoint = wp
                else:
                    break
        
        # Update current location in database
        if current_waypoint and (not current_location or progress < 100):
            log.current_location = current_waypoint
            if progress >= 100:
                log.delivery_status = "DELIVERED"
                log.delivery_completed_at = datetime.utcnow()
            await db.commit()
        
        active_deliveries.append({
            "dispensing_log_id": str(log.id),
            "prescription_id": str(log.prescription_id),
            "pharmacy_id": str(log.pharmacy_id),
            "pharmacy_name": log.dispensed_by_name,
            "delivery_status": log.delivery_status,
            "delivery_started_at": log.delivery_started_at.isoformat() if log.delivery_started_at else None,
            "estimated_delivery_minutes": log.estimated_delivery_minutes,
            "progress": progress,
            "route": route_data,
            "current_location": log.current_location
        })
    
    return APIResponse(message="Active deliveries retrieved", data=active_deliveries)

@router.get("/tracking/{dispensing_log_id}", response_model=APIResponse)
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
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    return APIResponse(
        message="Delivery tracking retrieved",
        data={
            "dispensing_log_id": str(log.id),
            "prescription_id": str(log.prescription_id),
            "delivery_status": log.delivery_status,
            "delivery_started_at": log.delivery_started_at.isoformat() if log.delivery_started_at else None,
            "delivery_completed_at": log.delivery_completed_at.isoformat() if log.delivery_completed_at else None,
            "estimated_delivery_minutes": log.estimated_delivery_minutes,
            "route": log.delivery_route,
            "current_location": log.current_location
        }
    )
