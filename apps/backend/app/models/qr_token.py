import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin


class QRPurpose(str, enum.Enum):
    PRESCRIPTION_ACCESS = "PRESCRIPTION_ACCESS"
    IN_STORE_ORDER = "IN_STORE_ORDER"
    DELIVERY_CONFIRMATION = "DELIVERY_CONFIRMATION"


class QRTokenStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    USED = "USED"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"


class QRAuthorizationToken(Base, UUIDMixin):
    __tablename__ = "qr_authorization_tokens"

    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    purpose: Mapped[str] = mapped_column(String(50), nullable=False)
    patient_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    prescription_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("prescriptions.id"), index=True, nullable=True)
    order_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("medicine_orders.id"), index=True, nullable=True)
    pharmacy_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    delivery_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    status: Mapped[str] = mapped_column(String(30), default=QRTokenStatus.ACTIVE, nullable=False, index=True)
    max_uses: Mapped[int] = mapped_column(Integer, default=1)
    use_count: Mapped[int] = mapped_column(Integer, default=0)
    created_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
