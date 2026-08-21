import uuid
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import JSON, Boolean, String

class Pharmacy(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "pharmacies"
    
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, unique=True, nullable=False)
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    license_number: Mapped[str] = mapped_column(String(255), unique=True, nullable=True)
    gst_number: Mapped[str] = mapped_column(String(255), nullable=True)
    address: Mapped[str] = mapped_column(String(500), nullable=True)
    contact_number: Mapped[str] = mapped_column(String(20), nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=True)
    state: Mapped[str] = mapped_column(String(100), nullable=True)
    country: Mapped[str] = mapped_column(String(100), nullable=True)
    pincode: Mapped[str] = mapped_column(String(20), nullable=True)
    operating_hours: Mapped[str] = mapped_column(String(100), nullable=True)
    working_days: Mapped[str] = mapped_column(String, nullable=True)
    location: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB, 'postgresql'), nullable=True)
    is_24x7: Mapped[bool] = mapped_column(Boolean, default=False)
    owner_details: Mapped[str] = mapped_column(String, nullable=True)
    supporting_documents_url: Mapped[str] = mapped_column(String, nullable=True)
    logo_url: Mapped[str] = mapped_column(String(1024), nullable=True)
    verification_documents_url: Mapped[str] = mapped_column(String, nullable=True)
    branch_information: Mapped[str] = mapped_column(String, nullable=True)
    business_registration_number: Mapped[str] = mapped_column(String(255), nullable=True)
    description: Mapped[str] = mapped_column(String, nullable=True)
    
    user = relationship("User", back_populates="pharmacy_profile")

