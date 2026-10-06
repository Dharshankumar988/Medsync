import uuid
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin

class PrescriptionDispensingLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "prescription_dispensing_log"

    prescription_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("prescriptions.id", ondelete="CASCADE"), index=True, nullable=False)
    pharmacy_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    
    dispensed_by_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    dispensed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    
    medicines_prescribed: Mapped[list] = mapped_column(JSONB, default=list, server_default='[]', nullable=False)
    medicines_dispensed: Mapped[list] = mapped_column(JSONB, default=list, server_default='[]', nullable=False)
    
    prescribed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    dispensed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    count_mismatch: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mismatch_details: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    patient_contact: Mapped[str | None] = mapped_column(String(50), nullable=True)
    pharmacy_contact: Mapped[str | None] = mapped_column(String(50), nullable=True)
    
    verification_method: Mapped[str | None] = mapped_column(String(50), default="QR_OFFLINE", nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    blockchain_tx_hash: Mapped[str | None] = mapped_column(String(66), nullable=True)
    blockchain_status: Mapped[str | None] = mapped_column(String(50), default="PENDING", nullable=True)
