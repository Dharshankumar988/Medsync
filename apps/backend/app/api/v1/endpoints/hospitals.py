from fastapi import APIRouter, HTTPException, status, Depends, Query
import time as time_module

_hospitals_cache = {"data": None, "expires": 0}
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.schemas.session import AuthenticatedPrincipal
from app.schemas.response import APIResponse
from app.utils.cache import async_ttl_cache
from app.models.hospital import Hospital
from app.models.user import UserRole
import uuid
from pydantic import BaseModel, ConfigDict
from typing import Optional, List

router = APIRouter()
require_admin = RoleChecker([UserRole.ADMIN])
require_admin_or_doctor = RoleChecker([UserRole.ADMIN, UserRole.DOCTOR])

class HospitalCreate(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    name: str
    address: str
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    type: Optional[str] = "hospital"
    google_maps_url: Optional[str] = None

class HospitalUpdate(HospitalCreate):
    model_config = ConfigDict(use_enum_values=True)
    name: Optional[str] = None
    address: Optional[str] = None
    is_verified: Optional[bool] = None
    is_active: Optional[bool] = None

class HospitalResponse(HospitalCreate):
    model_config = ConfigDict(use_enum_values=True, from_attributes=True)
    id: uuid.UUID
    is_verified: bool
    is_active: bool
    user_id: Optional[uuid.UUID] = None

class HospitalActionResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    id: uuid.UUID
    is_verified: bool
    is_active: bool
    message: str

class DoctorLocationBrief(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    id: str
    consultation_hours: Optional[str] = None
    working_days: Optional[str] = None
    phone: Optional[str] = None

class DoctorAtHospitalResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    id: str
    user_id: str
    full_name: str
    specialization: Optional[str] = None
    experience_years: Optional[int] = 0
    consultation_fee: Optional[int] = 0
    profile_picture_url: Optional[str] = None
    bio: Optional[str] = None
    locations: List[DoctorLocationBrief] = []

@router.get("", response_model=APIResponse[List[HospitalResponse]])
@router.get("/", response_model=APIResponse[List[HospitalResponse]], include_in_schema=False)
@async_ttl_cache(ttl_seconds=60)
async def list_hospitals(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    type: Optional[str] = Query(None),
    verified_only: Optional[bool] = Query(None)
):
    now = time_module.time()
    cache_key = f"data_{type}_{verified_only}"
    if _hospitals_cache.get(cache_key) is not None and now < _hospitals_cache.get("expires", 0):
        cached_data = _hospitals_cache[cache_key]
        return APIResponse(message="Hospitals fetched from cache", data=cached_data[skip:skip+limit])

    stmt = select(Hospital).where(Hospital.is_active == True)
    if type:
        stmt = stmt.where(Hospital.type == type)
    if verified_only is not None:
        stmt = stmt.where(Hospital.is_verified == verified_only)
        
    result = await db.execute(stmt)
    hospitals = list(result.scalars().all())
    
    _hospitals_cache[cache_key] = hospitals
    _hospitals_cache["expires"] = now + 300
    
    return APIResponse(message="Hospitals fetched successfully", data=hospitals[skip:skip+limit])

@router.post("", response_model=APIResponse[HospitalResponse], status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=APIResponse[HospitalResponse], status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_hospital(
    payload: HospitalCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_admin_or_doctor)
):
    new_hospital = Hospital(**payload.model_dump())
    new_hospital.user_id = current_user.id
    
    # Admins create verified hospitals directly; doctors require admin authorization
    if current_user.role.upper() == UserRole.ADMIN.value:
        new_hospital.is_verified = True
        msg = "Hospital created successfully"
    else:
        new_hospital.is_verified = False
        msg = "Medical facility submitted successfully. It is pending authorization by the administrator."

    db.add(new_hospital)
    await db.commit()
    await db.refresh(new_hospital)
    _hospitals_cache.clear()

    # If submitted by doctor, notify admin
    if current_user.role.upper() != UserRole.ADMIN.value:
        from app.services.notification import NotificationService
        from app.models.user import User
        admin_res = await db.execute(select(User).where(User.role == UserRole.ADMIN).limit(1))
        admin_user = admin_res.scalar_one_or_none()
        if admin_user:
            await NotificationService.send_notification(
                db,
                user_id=admin_user.id,
                title="New Facility Submitted",
                message=f"Medical facility '{new_hospital.name}' was submitted for administrative approval.",
                type="FACILITY"
            )

    return APIResponse(message=msg, data=new_hospital)

@router.post("/{hospital_id}/verify", response_model=APIResponse[HospitalResponse])
@router.put("/{hospital_id}/verify", response_model=APIResponse[HospitalResponse], include_in_schema=False)
async def verify_hospital(
    hospital_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_admin)
):
    """Admin authorizes and verifies a medical facility added by a doctor or staff."""
    result = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
    hospital = result.scalar_one_or_none()
    if not hospital:
        raise HTTPException(status_code=404, detail="Medical facility not found")
        
    hospital.is_verified = True
    hospital.is_active = True
    await db.commit()
    await db.refresh(hospital)
    _hospitals_cache.clear()

    # Notify facility creator/doctor
    if hospital.user_id:
        from app.services.notification import NotificationService
        await NotificationService.send_notification(
            db,
            user_id=hospital.user_id,
            title="Facility Authorized",
            message=f"Medical facility '{hospital.name}' has been verified and authorized by MedSync Administration.",
            type="FACILITY"
        )

    return APIResponse(message="Medical facility authorized and verified successfully", data=hospital)

@router.post("/{hospital_id}/reject", response_model=APIResponse[HospitalResponse])
async def reject_hospital(
    hospital_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_admin)
):
    """Admin rejects or deactivates a pending medical facility."""
    result = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
    hospital = result.scalar_one_or_none()
    if not hospital:
        raise HTTPException(status_code=404, detail="Medical facility not found")
        
    hospital.is_verified = False
    hospital.is_active = False
    await db.commit()
    await db.refresh(hospital)
    _hospitals_cache.clear()
    return APIResponse(message="Medical facility rejected/deactivated successfully", data=hospital)

@router.put("/{hospital_id}", response_model=APIResponse[HospitalResponse])
async def update_hospital(
    hospital_id: uuid.UUID, 
    payload: HospitalUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_admin)
):
    hospital_result = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
    hospital = hospital_result.scalar_one_or_none()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
        
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(hospital, key, value)
        
    await db.commit()
    await db.refresh(hospital)
    _hospitals_cache.clear()
    return APIResponse(message="Hospital updated successfully", data=hospital)

@router.delete("/{hospital_id}", response_model=APIResponse[HospitalActionResponse])
async def deactivate_hospital(
    hospital_id: uuid.UUID, 
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_admin)
):
    hospital_result = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
    hospital = hospital_result.scalar_one_or_none()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
        
    hospital.is_active = False
    await db.commit()
    _hospitals_cache.clear()
    return APIResponse(
        message="Hospital deactivated successfully",
        data=HospitalActionResponse(
            id=hospital.id,
            is_verified=hospital.is_verified,
            is_active=hospital.is_active,
            message="Deactivated"
        )
    )

@router.get("/{hospital_id}/doctors", response_model=APIResponse[List[DoctorAtHospitalResponse]])
async def get_doctors_at_hospital(
    hospital_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """List all doctors practicing at a specific hospital via their doctor_locations."""
    from app.models.doctor_location import DoctorLocation
    from app.models.doctor import Doctor

    # First verify hospital exists
    hospital_result = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
    hospital = hospital_result.scalar_one_or_none()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")

    # Get doctor locations at this hospital
    loc_stmt = (
        select(DoctorLocation)
        .where(DoctorLocation.hospital_id == hospital_id)
        .where(DoctorLocation.is_active == True)
    )
    loc_result = await db.execute(loc_stmt)
    locations = loc_result.scalars().all()

    # Get unique doctor profiles
    doctor_ids = list(set(loc.doctor_id for loc in locations))
    if not doctor_ids:
        return APIResponse(message="No doctors found", data=[])

    doc_stmt = select(Doctor).where(Doctor.id.in_(doctor_ids))
    doc_result = await db.execute(doc_stmt)
    doctors = doc_result.scalars().all()

    doctors_list = []
    for doc in doctors:
        doc_locations = [loc for loc in locations if loc.doctor_id == doc.id]
        doctors_list.append(
            DoctorAtHospitalResponse(
                id=str(doc.id),
                user_id=str(doc.user_id),
                full_name=doc.full_name,
                specialization=doc.specialization,
                experience_years=doc.experience_years or 0,
                consultation_fee=doc.consultation_fee or 0,
                profile_picture_url=doc.profile_picture_url,
                bio=doc.bio,
                locations=[
                    DoctorLocationBrief(
                        id=str(loc.id),
                        consultation_hours=loc.consultation_hours,
                        working_days=loc.working_days,
                        phone=loc.phone,
                    )
                    for loc in doc_locations
                ]
            )
        )

    return APIResponse(message="Doctors fetched successfully", data=doctors_list)
