import uuid
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin

class Patient(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "patients"
    
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    date_of_birth: Mapped[str] = mapped_column(String(50), nullable=True)
    gender: Mapped[str] = mapped_column(String(50), nullable=True)
    blood_group: Mapped[str] = mapped_column(String(10), nullable=True)
    phone_number: Mapped[str] = mapped_column(String(20), nullable=True)
    address: Mapped[str] = mapped_column(String(500), nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=True)
    state: Mapped[str] = mapped_column(String(100), nullable=True)
    country: Mapped[str] = mapped_column(String(100), nullable=True)
    pincode: Mapped[str] = mapped_column(String(20), nullable=True)
    emergency_contact_name: Mapped[str] = mapped_column(String(255), nullable=True)
    emergency_contact_number: Mapped[str] = mapped_column(String(20), nullable=True)
    profile_picture_url: Mapped[str] = mapped_column(String(1024), nullable=True)
    government_id_url: Mapped[str] = mapped_column(String(1024), nullable=True)
    medical_alerts: Mapped[str] = mapped_column(String, nullable=True)
    allergies: Mapped[str] = mapped_column(String, nullable=True)
    chronic_diseases: Mapped[str] = mapped_column(String, nullable=True)
    primary_physician_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("doctors.id"), index=True, nullable=True)
    
    user = relationship("User", back_populates="patient_profile")
