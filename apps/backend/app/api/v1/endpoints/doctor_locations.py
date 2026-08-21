import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import UserRole
from app.schemas.response import APIResponse
from app.schemas.session import AuthenticatedPrincipal
from app.schemas.location import DoctorLocationCreate, DoctorLocationResponse
from app.services.doctor_location_service import DoctorLocationService
from typing import List

router = APIRouter()
require_doctor = RoleChecker([UserRole.DOCTOR])


@router.get("/", response_model=APIResponse[List[DoctorLocationResponse]])
async def list_my_locations(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor),
):
    locations = await DoctorLocationService.get_doctor_locations(db, current_user.id)
    return APIResponse(message="Doctor locations", data=locations)


@router.post("/", response_model=APIResponse[DoctorLocationResponse], status_code=status.HTTP_201_CREATED)
async def create_location(
    req: DoctorLocationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor),
):
    location = await DoctorLocationService.create_location(db, current_user.id, req)
    return APIResponse(message="Location added", data=location)


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


@router.delete("/{location_id}", response_model=APIResponse)
async def delete_location(
    location_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor),
):
    await DoctorLocationService.delete_location(db, location_id, current_user.id)
    return APIResponse(message="Location deactivated")
