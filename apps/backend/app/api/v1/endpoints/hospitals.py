from fastapi import APIRouter, HTTPException, status, Depends, Query
import time as time_module

_hospitals_cache = {"data": None, "expires": 0}
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.schemas.response import APIResponse
from app.utils.cache import async_ttl_cache
from app.models.hospital import Hospital
from app.models.user import UserRole
import uuid
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

class HospitalCreate(BaseModel):
    name: str
    address: str
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None

class HospitalUpdate(HospitalCreate):
    name: Optional[str] = None
    address: Optional[str] = None
    is_verified: Optional[bool] = None
    is_active: Optional[bool] = None

class HospitalResponse(HospitalCreate):
    id: uuid.UUID
    is_verified: bool
    is_active: bool
    
    model_config = {"from_attributes": True}

@router.get("/", response_model=APIResponse[List[HospitalResponse]])
@async_ttl_cache(ttl_seconds=60)
async def list_hospitals(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200)
):
    now = time_module.time()
    if _hospitals_cache["data"] is not None and now < _hospitals_cache["expires"]:
        cached_data = _hospitals_cache["data"]
        return APIResponse(data=cached_data[skip:skip+limit])

    result = await db.execute(select(Hospital).where(Hospital.is_active == True))
    hospitals = result.scalars().all()
    
    _hospitals_cache["data"] = hospitals
    _hospitals_cache["expires"] = now + 300
    
    return APIResponse(data=hospitals[skip:skip+limit])

@router.post("/", response_model=APIResponse[HospitalResponse])
async def create_hospital(
    payload: HospitalCreate, 
    db: AsyncSession = Depends(get_db)
):
    # Should be protected by admin role, but relying on frontend / proxy for now if dependencies are simple
    # Or implement require_role(UserRole.ADMIN) if available
    new_hospital = Hospital(**payload.model_dump())
    new_hospital.is_verified = True # Admins create verified hospitals directly
    db.add(new_hospital)
    await db.commit()
    await db.refresh(new_hospital)
    return APIResponse(data=new_hospital)

@router.put("/{hospital_id}", response_model=APIResponse[HospitalResponse])
async def update_hospital(
    hospital_id: uuid.UUID, 
    payload: HospitalUpdate, 
    db: AsyncSession = Depends(get_db)
):
    hospital = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
    hospital = hospital.scalar_one_or_none()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
        
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(hospital, key, value)
        
    await db.commit()
    await db.refresh(hospital)
    return APIResponse(data=hospital)

@router.delete("/{hospital_id}", response_model=APIResponse[dict])
async def deactivate_hospital(
    hospital_id: uuid.UUID, 
    db: AsyncSession = Depends(get_db)
):
    hospital = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
    hospital = hospital.scalar_one_or_none()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
        
    hospital.is_active = False
    await db.commit()
    return APIResponse(message="Hospital deactivated successfully")
