import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin

class PrescriptionTransfer(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "prescription_transfers"
    
    prescription_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("prescriptions.id", ondelete="CASCADE"), nullable=False)
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    pharmacy_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    transfer_request_id: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="CREATED", nullable=False)
    
    authorized_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    delivered_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
