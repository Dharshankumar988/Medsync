import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, ForeignKey, Numeric, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin


class PharmacyLocation(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "pharmacy_locations"

    pharmacy_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pharmacies.id"), index=True, nullable=False)
    location_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pincode: Mapped[str | None] = mapped_column(String(20), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    google_maps_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 8), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(11, 8), nullable=True)
    operating_hours: Mapped[str | None] = mapped_column(String, nullable=True)
    working_days: Mapped[str | None] = mapped_column(String, nullable=True)
    delivery_available: Mapped[bool] = mapped_column(Boolean, default=False)
    pickup_available: Mapped[bool] = mapped_column(Boolean, default=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    verification_status: Mapped[str] = mapped_column(String(30), default="PENDING")
    verified_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    pharmacy = relationship("Pharmacy", backref="locations")
