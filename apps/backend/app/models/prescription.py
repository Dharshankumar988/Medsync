import uuid
from sqlalchemy import String, Integer, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin

class Prescription(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "prescriptions"
    appointment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("appointments.id"), unique=True, nullable=False)
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    doctor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    diagnosis: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_finalized: Mapped[bool] = mapped_column(Boolean, default=False)
    is_dispensed: Mapped[bool] = mapped_column(Boolean, default=False)

class PrescriptionItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "prescription_items"
    prescription_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("prescriptions.id"), nullable=False)
    medicine_name: Mapped[str] = mapped_column(String(255), nullable=False)
    dosage: Mapped[str] = mapped_column(String(100), nullable=False)
    frequency: Mapped[str] = mapped_column(String(100), nullable=False)
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
