import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, Enum, JSON, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin

class SyncEntityType(str, enum.Enum):
    PRESCRIPTION = "PRESCRIPTION"
    MEDICAL_RECORD = "MEDICAL_RECORD"
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    PHARMACY = "PHARMACY"

class SyncActionType(str, enum.Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    REVOKE = "REVOKE"
    VERIFY = "VERIFY"
    GRANT_ACCESS = "GRANT_ACCESS"
    REVOKE_ACCESS = "REVOKE_ACCESS"

class SyncStatus(str, enum.Enum):
    PENDING = "PENDING"
    SUBMITTED = "SUBMITTED"
    CONFIRMING = "CONFIRMING"
    CONFIRMED = "CONFIRMED"
    FAILED = "FAILED"
    RETRYING = "RETRYING"
    REVERTED = "REVERTED"
    SYNCED = "SYNCED"

class BlockchainTransaction(Base, TimestampMixin):
    __tablename__ = "blockchain_transactions"
    
    transaction_hash: Mapped[str] = mapped_column(String(66), primary_key=True)
    block_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    block_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    gas_used: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gas_price: Mapped[str | None] = mapped_column(String(50), nullable=True)
    contract_address: Mapped[str | None] = mapped_column(String(42), nullable=True)
    contract_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    contract_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
    network: Mapped[str] = mapped_column(String(50), nullable=False)
    chain_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    confirmation_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(50), default='PENDING', index=True)
    wallet_address: Mapped[str | None] = mapped_column(String(42), nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    execution_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

class BlockchainSyncTask(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "blockchain_sync_tasks"
    
    entity_type: Mapped[SyncEntityType] = mapped_column(Enum(SyncEntityType, native_enum=False), nullable=False, index=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(nullable=False, index=True)
    action_type: Mapped[SyncActionType] = mapped_column(Enum(SyncActionType, native_enum=False), nullable=False)
    status: Mapped[SyncStatus] = mapped_column(Enum(SyncStatus, native_enum=False), default=SyncStatus.PENDING, index=True)
    
    transaction_hash: Mapped[str | None] = mapped_column(ForeignKey("blockchain_transactions.transaction_hash"), index=True, nullable=True)
    payload: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB, 'postgresql'), nullable=True)
    
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, default=5)
    next_retry_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Relationship to transaction
    transaction = relationship("BlockchainTransaction")

class BlockchainAuditLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "blockchain_audit_logs"
    
    entity_type: Mapped[SyncEntityType] = mapped_column(Enum(SyncEntityType, native_enum=False), nullable=False, index=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    
    transaction_hash: Mapped[str | None] = mapped_column(ForeignKey("blockchain_transactions.transaction_hash"), index=True, nullable=True)
    block_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    contract_address: Mapped[str | None] = mapped_column(String(42), nullable=True)
    caller_address: Mapped[str | None] = mapped_column(String(42), nullable=True)
    event_data: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB, 'postgresql'), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    
    transaction = relationship("BlockchainTransaction")

class BlockchainQueueStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"
    DLQ = "DLQ"

class BlockchainEventQueue(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "blockchain_event_queue"
    
    event_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    contract_name: Mapped[str] = mapped_column(String(100), nullable=False)
    contract_address: Mapped[str] = mapped_column(String(42), nullable=False)
    transaction_hash: Mapped[str] = mapped_column(String(66), nullable=False)
    block_number: Mapped[int] = mapped_column(Integer, nullable=False)
    log_index: Mapped[int] = mapped_column(Integer, nullable=False)
    event_data: Mapped[dict] = mapped_column(JSON().with_variant(JSONB, 'postgresql'), nullable=False)
    
    status: Mapped[BlockchainQueueStatus] = mapped_column(Enum(BlockchainQueueStatus, native_enum=False), default=BlockchainQueueStatus.PENDING, index=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, default=5)
    next_retry_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

class BlockchainSyncState(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "blockchain_sync_state"
    
    contract_name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    last_processed_block: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
