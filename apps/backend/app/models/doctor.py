import uuid
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import JSON

class Doctor(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "doctors"
    
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    specialization: Mapped[str] = mapped_column(String(255), nullable=True)
    license_number: Mapped[str] = mapped_column(String(255), unique=True, nullable=True)
    hospital_name: Mapped[str] = mapped_column(String(255), nullable=True)
    hospital_address: Mapped[str] = mapped_column(String(500), nullable=True)
    experience_years: Mapped[int] = mapped_column(Integer, default=0)
    bio: Mapped[str] = mapped_column(String(1000), nullable=True)
    consultation_fee: Mapped[int] = mapped_column(Integer, default=0)
    
    # New profile completion fields
    qualifications: Mapped[str] = mapped_column(String, nullable=True)
    clinic_name: Mapped[str] = mapped_column(String(255), nullable=True)
    clinic_address: Mapped[str] = mapped_column(String(500), nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=True)
    state: Mapped[str] = mapped_column(String(100), nullable=True)
    country: Mapped[str] = mapped_column(String(100), nullable=True)
    pincode: Mapped[str] = mapped_column(String(20), nullable=True)
    clinic_phone: Mapped[str] = mapped_column(String(20), nullable=True)
    clinic_email: Mapped[str] = mapped_column(String(255), nullable=True)
    languages: Mapped[str] = mapped_column(String, nullable=True)
    consultation_hours: Mapped[str] = mapped_column(String, nullable=True)
    consultation_timings: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB, 'postgresql'), nullable=True)
    certificates_url: Mapped[str] = mapped_column(String, nullable=True)
    government_id_url: Mapped[str] = mapped_column(String(1024), nullable=True)
    professional_documents_url: Mapped[str] = mapped_column(String, nullable=True)
    profile_picture_url: Mapped[str] = mapped_column(String(1024), nullable=True)
    verification_documents_url: Mapped[str] = mapped_column(String, nullable=True)
    hospital_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("hospitals.id"), index=True, nullable=True)
    medical_council_reg_number: Mapped[str] = mapped_column(String(255), nullable=True)
    
    # Image upload and approval fields
    profile_image: Mapped[str] = mapped_column(String(1024), nullable=True)
    thumbnail: Mapped[str] = mapped_column(String(1024), nullable=True)
    image_uploaded_at: Mapped[datetime] = mapped_column(nullable=True)
    approval_date: Mapped[datetime] = mapped_column(nullable=True)
    approved_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    approval_notes: Mapped[str] = mapped_column(String, nullable=True)
    doctor_status: Mapped[str] = mapped_column(String(50), default="PENDING", index=True)
    
    user = relationship("User", foreign_keys=[user_id], back_populates="doctor_profile")
    hospital = relationship("Hospital", back_populates="doctors")
