import uuid
from sqlalchemy import String, Integer, ForeignKey, Text, DateTime, Enum, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin
import enum

class BlockchainTaskStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    CONFIRMED = "CONFIRMED"
    FAILED = "FAILED"
    RETRYING = "RETRYING"
    CANCELLED = "CANCELLED"

class BlockchainTask(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "blockchain_tasks"
    prescription_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("prescriptions.id"), nullable=False, unique=True)
    status: Mapped[BlockchainTaskStatus] = mapped_column(Enum(BlockchainTaskStatus), default=BlockchainTaskStatus.PENDING)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, default=5)
    next_retry_time: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

class BlockchainAuditLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "blockchain_audit_logs"
    transaction_hash: Mapped[str] = mapped_column(String(66), nullable=False, unique=True)
    block_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gas_used: Mapped[int | None] = mapped_column(Integer, nullable=True)
    wallet_address: Mapped[str | None] = mapped_column(String(42), nullable=True)
    contract_address: Mapped[str | None] = mapped_column(String(42), nullable=True)
    chain_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    explorer_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    confirmation_time: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    prescription_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("prescriptions.id"), nullable=True)
