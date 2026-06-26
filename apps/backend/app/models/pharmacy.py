import uuid
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin

class Pharmacy(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "pharmacies"
    
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    license_number: Mapped[str] = mapped_column(String(255), unique=True, nullable=True)
    gst_number: Mapped[str] = mapped_column(String(255), nullable=True)
    address: Mapped[str] = mapped_column(String(500), nullable=True)
    contact_number: Mapped[str] = mapped_column(String(20), nullable=True)
    
    user = relationship("User", back_populates="pharmacy_profile")
