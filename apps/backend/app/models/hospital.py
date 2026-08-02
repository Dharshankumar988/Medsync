import uuid
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin

class Hospital(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "hospitals"
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=True)
    state: Mapped[str] = mapped_column(String(100), nullable=True)
    country: Mapped[str] = mapped_column(String(100), nullable=True)
    pincode: Mapped[str] = mapped_column(String(20), nullable=True)
    phone_number: Mapped[str] = mapped_column(String(20), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    website: Mapped[str] = mapped_column(String(255), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    doctors = relationship("Doctor", back_populates="hospital")
