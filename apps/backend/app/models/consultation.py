import uuid
from datetime import datetime, date
from sqlalchemy import String, ForeignKey, Text, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin


class Consultation(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "consultations"

    appointment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("appointments.id"), index=True, unique=True, nullable=False)
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    doctor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    symptoms: Mapped[str | None] = mapped_column(Text, nullable=True)
    observations: Mapped[str | None] = mapped_column(Text, nullable=True)
    diagnosis: Mapped[str | None] = mapped_column(Text, nullable=True)
    treatment_plan: Mapped[str | None] = mapped_column(Text, nullable=True)
    clinical_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    follow_up_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    follow_up_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    prescription_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("prescriptions.id"), index=True, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
