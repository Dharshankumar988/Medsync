import uuid
import enum
from datetime import datetime
from sqlalchemy import Enum, String, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin

class RoleType(str, enum.Enum):
    DOCTOR = "DOCTOR"
    PHARMACY = "PHARMACY"

class VerificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_REVIEW = "IN_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class VerificationRequest(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "verification_requests"
    
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    role_type: Mapped[RoleType] = mapped_column(Enum(RoleType), nullable=False)
    status: Mapped[VerificationStatus] = mapped_column(Enum(VerificationStatus), default=VerificationStatus.PENDING)
    reviewer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("admins.id"), nullable=True)
    review_date: Mapped[datetime | None] = mapped_column(nullable=True)
    approval_date: Mapped[datetime | None] = mapped_column(nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    blockchain_tx_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
