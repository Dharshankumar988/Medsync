import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import UserRole
from app.schemas.response import APIResponse
from app.schemas.session import AuthenticatedPrincipal
from app.schemas.location import (
    DoctorLocationCreate,
    DoctorLocationResponse,
    DoctorLocationActionResponse,
)
from app.services.doctor_location_service import DoctorLocationService
from typing import List

router = APIRouter()
require_doctor = RoleChecker([UserRole.DOCTOR])
require_admin = RoleChecker([UserRole.ADMIN])


@router.get("", response_model=APIResponse[List[DoctorLocationResponse]])
@router.get("/", response_model=APIResponse[List[DoctorLocationResponse]], include_in_schema=False)
async def list_my_locations(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor),
):
    locations = await DoctorLocationService.get_doctor_locations(db, current_user.id)
    return APIResponse(message="Doctor locations", data=locations)


@router.get("/pending", response_model=APIResponse[List[DoctorLocationResponse]])
async def list_pending_locations(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_admin),
):
    from sqlalchemy import select
    from app.models.doctor_location import DoctorLocation, LocationVerificationStatus
    stmt = (
        select(DoctorLocation)
        .where(DoctorLocation.verification_status == LocationVerificationStatus.PENDING)
        .where(DoctorLocation.is_active == True)
        .order_by(DoctorLocation.created_at.desc())
    )
    res = await db.execute(stmt)
    pending_locs = list(res.scalars().all())
    return APIResponse(message="Pending doctor locations", data=pending_locs)


@router.post("", response_model=APIResponse[DoctorLocationResponse], status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=APIResponse[DoctorLocationResponse], status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_location(
    req: DoctorLocationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor),
):
    from app.services.notification import NotificationService
    from app.models.user import User, UserRole
    from sqlalchemy import select

    location = await DoctorLocationService.create_location(db, current_user.id, req)

    # Notify administrators about new facility/location submission
    admin_res = await db.execute(select(User).where(User.role == UserRole.ADMIN).limit(1))
    admin_user = admin_res.scalar_one_or_none()
    if admin_user:
        loc_display = req.location_name or "Medical Facility"
        await NotificationService.send_notification(
            db,
            user_id=admin_user.id,
            title="Workplace Affiliation Submitted",
            message=f"A doctor added workplace '{loc_display}' awaiting administrative verification.",
            type="FACILITY"
        )

    return APIResponse(message="Location added and submitted for administrative approval", data=location)


@router.put("/{location_id}", response_model=APIResponse[DoctorLocationResponse])
async def update_location(
    location_id: uuid.UUID,
    req: DoctorLocationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor),
):
    update_data = req.model_dump(exclude_unset=True)
    location = await DoctorLocationService.update_location(
        db, location_id, current_user.id, update_data
    )
    return APIResponse(message="Location updated", data=location)


@router.delete("/{location_id}", response_model=APIResponse[DoctorLocationActionResponse])
async def delete_location(
    location_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor),
):
    await DoctorLocationService.delete_location(db, location_id, current_user.id)
    return APIResponse(
        message="Location deactivated",
        data=DoctorLocationActionResponse(
            id=location_id,
            is_active=False,
            message="Location deactivated successfully"
        )
    )


@router.post("/{location_id}/verify", response_model=APIResponse[DoctorLocationResponse])
async def verify_location(
    location_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_admin),
):
    """Admin endpoint to verify and approve a doctor's practice location."""
    from datetime import datetime
    from app.models.doctor_location import DoctorLocation, LocationVerificationStatus
    from sqlalchemy import select
    from fastapi import HTTPException

    stmt = select(DoctorLocation).where(DoctorLocation.id == location_id)
    result = await db.execute(stmt)
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Doctor location not found")

    location.verification_status = LocationVerificationStatus.APPROVED
    location.verified_by = current_user.id
    location.verified_at = datetime.utcnow()
    await db.commit()
    await db.refresh(location)

    # Notify doctor
    from app.services.notification import NotificationService
    from app.models.doctor import Doctor
    doc_res = await db.execute(select(Doctor).where(Doctor.id == location.doctor_id))
    doc = doc_res.scalar_one_or_none()
    if doc:
        loc_display = location.location_name or location.address or "Practice Facility"
        await NotificationService.send_notification(
            db,
            user_id=doc.user_id,
            title="Workplace Facility Authorized",
            message=f"Your affiliation with '{loc_display}' has been verified and authorized by MedSync Administration.",
            type="FACILITY"
        )

    return APIResponse(message="Doctor location verified successfully", data=location)
