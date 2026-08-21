import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.doctor_location import DoctorLocation
from app.models.doctor import Doctor
from app.schemas.location import DoctorLocationCreate, DoctorLocationResponse
from app.core.exceptions import NotFoundException, ForbiddenException


class DoctorLocationService:
    """Service for managing doctor practice locations."""

    @staticmethod
    async def _get_doctor_profile(db: AsyncSession, user_id: uuid.UUID) -> Doctor:
        stmt = select(Doctor).where(Doctor.user_id == user_id)
        result = await db.execute(stmt)
        doctor = result.scalar_one_or_none()
        if not doctor:
            raise NotFoundException("Doctor profile not found")
        return doctor

    @staticmethod
    async def create_location(
        db: AsyncSession, user_id: uuid.UUID, data: DoctorLocationCreate
    ) -> DoctorLocation:
        from fastapi import HTTPException
        if data.location_type == "HOSPITAL" and not data.hospital_id:
            raise HTTPException(status_code=400, detail="Hospital ID is required for HOSPITAL location type.")
        if data.location_type == "CLINIC" and data.hospital_id:
            raise HTTPException(status_code=400, detail="Hospital ID must not be provided for CLINIC location type.")
        if data.location_type == "CLINIC" and not data.location_name:
            raise HTTPException(status_code=400, detail="Location name is required for CLINIC location type.")

        doctor = await DoctorLocationService._get_doctor_profile(db, user_id)

        location = DoctorLocation(
            id=uuid.uuid4(),
            doctor_id=doctor.id,
            location_type=data.location_type,
            location_name=data.location_name,
            hospital_id=data.hospital_id,
            address=data.address,
            city=data.city,
            state=data.state,
            country=data.country,
            pincode=data.pincode,
            phone=data.phone,
            email=data.email,
            google_maps_url=data.google_maps_url,
            latitude=data.latitude,
            longitude=data.longitude,
            working_days=data.working_days,
            consultation_hours=data.consultation_hours,
            is_primary=data.is_primary,
        )
        db.add(location)
        await db.commit()
        await db.refresh(location)
        return location

    @staticmethod
    async def update_location(
        db: AsyncSession,
        location_id: uuid.UUID,
        user_id: uuid.UUID,
        data: dict,
    ) -> DoctorLocation:
        doctor = await DoctorLocationService._get_doctor_profile(db, user_id)

        stmt = select(DoctorLocation).where(
            DoctorLocation.id == location_id,
            DoctorLocation.doctor_id == doctor.id,
        )
        result = await db.execute(stmt)
        location = result.scalar_one_or_none()
        if not location:
            raise NotFoundException("Location not found or unauthorized")

        allowed_fields = {
            "location_type", "location_name", "hospital_id", "address",
            "city", "state", "country", "pincode", "phone", "email",
            "google_maps_url", "latitude", "longitude", "working_days",
            "consultation_hours", "is_primary",
        }
        for key, value in data.items():
            if key in allowed_fields:
                setattr(location, key, value)

        await db.commit()
        await db.refresh(location)
        return location

    @staticmethod
    async def delete_location(
        db: AsyncSession, location_id: uuid.UUID, user_id: uuid.UUID
    ) -> bool:
        doctor = await DoctorLocationService._get_doctor_profile(db, user_id)

        stmt = select(DoctorLocation).where(
            DoctorLocation.id == location_id,
            DoctorLocation.doctor_id == doctor.id,
        )
        result = await db.execute(stmt)
        location = result.scalar_one_or_none()
        if not location:
            raise NotFoundException("Location not found or unauthorized")

        location.is_active = False
        await db.commit()
        return True

    @staticmethod
    async def get_doctor_locations(
        db: AsyncSession, user_id: uuid.UUID
    ) -> list[DoctorLocation]:
        doctor = await DoctorLocationService._get_doctor_profile(db, user_id)

        stmt = (
            select(DoctorLocation)
            .where(DoctorLocation.doctor_id == doctor.id)
            .where(DoctorLocation.is_active == True)
            .order_by(DoctorLocation.is_primary.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_locations_by_hospital(
        db: AsyncSession, hospital_id: uuid.UUID
    ) -> list[DoctorLocation]:
        stmt = (
            select(DoctorLocation)
            .where(DoctorLocation.hospital_id == hospital_id)
            .where(DoctorLocation.is_active == True)
            .order_by(DoctorLocation.is_primary.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())
