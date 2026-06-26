import uuid
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin

class Doctor(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "doctors"
    
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    specialization: Mapped[str] = mapped_column(String(255), nullable=True)
    license_number: Mapped[str] = mapped_column(String(255), unique=True, nullable=True)
    experience_years: Mapped[int] = mapped_column(Integer, default=0)
    bio: Mapped[str] = mapped_column(String(1000), nullable=True)
    consultation_fee: Mapped[int] = mapped_column(Integer, default=0)
    
    user = relationship("User", back_populates="doctor_profile")
