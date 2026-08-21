import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import JSON
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin


class MedicalHistoryShare(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "medical_history_shares"

    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    doctor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    appointment_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("appointments.id"), index=True, nullable=True)
    consultation_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("consultations.id"), index=True, nullable=True)
    shared_records: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB, 'postgresql'), nullable=True)
    access_scope: Mapped[str] = mapped_column(String(50), default="CONSULTATION")
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
