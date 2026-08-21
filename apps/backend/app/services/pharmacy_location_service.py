import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.pharmacy_location import PharmacyLocation
from app.models.pharmacy import Pharmacy
from app.schemas.location import PharmacyLocationCreate
from app.core.exceptions import NotFoundException, ForbiddenException


class PharmacyLocationService:
    """Service for managing pharmacy branch locations."""

    @staticmethod
    async def _get_pharmacy_profile(db: AsyncSession, user_id: uuid.UUID) -> Pharmacy:
        stmt = select(Pharmacy).where(Pharmacy.user_id == user_id)
        result = await db.execute(stmt)
        pharmacy = result.scalar_one_or_none()
        if not pharmacy:
            raise NotFoundException("Pharmacy profile not found")
        return pharmacy

    @staticmethod
    async def create_location(
        db: AsyncSession, user_id: uuid.UUID, data: PharmacyLocationCreate
    ) -> PharmacyLocation:
        pharmacy = await PharmacyLocationService._get_pharmacy_profile(db, user_id)

        location = PharmacyLocation(
            id=uuid.uuid4(),
            pharmacy_id=pharmacy.id,
            location_name=data.location_name,
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
            operating_hours=data.operating_hours,
            working_days=data.working_days,
            delivery_available=data.delivery_available,
            pickup_available=data.pickup_available,
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
    ) -> PharmacyLocation:
        pharmacy = await PharmacyLocationService._get_pharmacy_profile(db, user_id)

        stmt = select(PharmacyLocation).where(
            PharmacyLocation.id == location_id,
            PharmacyLocation.pharmacy_id == pharmacy.id,
        )
        result = await db.execute(stmt)
        location = result.scalar_one_or_none()
        if not location:
            raise NotFoundException("Location not found or unauthorized")

        allowed_fields = {
            "location_name", "address", "city", "state", "country", "pincode",
            "phone", "email", "google_maps_url", "latitude", "longitude",
            "operating_hours", "working_days", "delivery_available",
            "pickup_available", "is_primary",
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
        pharmacy = await PharmacyLocationService._get_pharmacy_profile(db, user_id)

        stmt = select(PharmacyLocation).where(
            PharmacyLocation.id == location_id,
            PharmacyLocation.pharmacy_id == pharmacy.id,
        )
        result = await db.execute(stmt)
        location = result.scalar_one_or_none()
        if not location:
            raise NotFoundException("Location not found or unauthorized")

        location.is_active = False
        await db.commit()
        return True

    @staticmethod
    async def get_pharmacy_locations(
        db: AsyncSession, user_id: uuid.UUID
    ) -> list[PharmacyLocation]:
        pharmacy = await PharmacyLocationService._get_pharmacy_profile(db, user_id)

        stmt = (
            select(PharmacyLocation)
            .where(PharmacyLocation.pharmacy_id == pharmacy.id)
            .where(PharmacyLocation.is_active == True)
            .order_by(PharmacyLocation.is_primary.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())
