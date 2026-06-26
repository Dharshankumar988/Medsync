import uuid
import enum
from sqlalchemy import String, Float, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin

class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"

class PaymentMethod(str, enum.Enum):
    UPI = "UPI"
    CARD = "CARD"
    WALLET = "WALLET"
    COD = "COD"

class Payment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "payments"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    order_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("medicine_orders.id"), nullable=True)
    appointment_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("appointments.id"), nullable=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(String(50), default=PaymentStatus.PENDING)
    method: Mapped[PaymentMethod] = mapped_column(String(50), nullable=False)
    transaction_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)

class Invoice(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "invoices"
    payment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("payments.id"), unique=True, nullable=False)
    invoice_number: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    invoice_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
