import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import UserRole
from app.schemas.response import APIResponse
from app.schemas.session import AuthenticatedPrincipal
from app.schemas.location import PharmacyLocationCreate, PharmacyLocationResponse
from app.services.pharmacy_location_service import PharmacyLocationService
from typing import List

router = APIRouter()
require_pharmacy = RoleChecker([UserRole.PHARMACY])


@router.get("/", response_model=APIResponse[List[PharmacyLocationResponse]])
async def list_my_locations(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_pharmacy),
):
    locations = await PharmacyLocationService.get_pharmacy_locations(db, current_user.id)
    return APIResponse(message="Pharmacy locations", data=locations)


@router.post("/", response_model=APIResponse[PharmacyLocationResponse], status_code=status.HTTP_201_CREATED)
async def create_location(
    req: PharmacyLocationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_pharmacy),
):
    location = await PharmacyLocationService.create_location(db, current_user.id, req)
    return APIResponse(message="Location added", data=location)


@router.put("/{location_id}", response_model=APIResponse[PharmacyLocationResponse])
async def update_location(
    location_id: uuid.UUID,
    req: PharmacyLocationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_pharmacy),
):
    update_data = req.model_dump(exclude_unset=True)
    location = await PharmacyLocationService.update_location(
        db, location_id, current_user.id, update_data
    )
    return APIResponse(message="Location updated", data=location)


@router.delete("/{location_id}", response_model=APIResponse)
async def delete_location(
    location_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_pharmacy),
):
    await PharmacyLocationService.delete_location(db, location_id, current_user.id)
    return APIResponse(message="Location deactivated")
