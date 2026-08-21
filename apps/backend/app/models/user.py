from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin, SoftDeleteMixin
import enum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import JSON

class UserRole(str, enum.Enum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    PHARMACY = "PHARMACY"
    ADMIN = "ADMIN"

class UserStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"

class User(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"
    
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    status: Mapped[UserStatus] = mapped_column(Enum(UserStatus), default=UserStatus.ACTIVE, index=True)
    profile_completion_percentage: Mapped[int] = mapped_column(default=0)
    is_verified: Mapped[bool] = mapped_column(default=False)
    
    # Phase 16 profile fields
    cover_image_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    bio: Mapped[str | None] = mapped_column(String, nullable=True)
    social_links: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB, 'postgresql'), nullable=True)
    languages_spoken: Mapped[str | None] = mapped_column(String, nullable=True)
    
    # Relationships
    patient_profile = relationship("Patient", back_populates="user", uselist=False)
    doctor_profile = relationship("Doctor", foreign_keys="[Doctor.user_id]", back_populates="user", uselist=False)
    pharmacy_profile = relationship("Pharmacy", back_populates="user", uselist=False)
    admin_profile = relationship("Admin", back_populates="user", uselist=False)
