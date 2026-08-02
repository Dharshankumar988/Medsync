from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID
from app.models.blockchain import SyncEntityType, SyncActionType, SyncStatus

class BlockchainTransactionBase(BaseModel):
    transaction_hash: str
    block_number: Optional[int] = None
    block_timestamp: Optional[datetime] = None
    gas_used: Optional[int] = None
    gas_price: Optional[str] = None
    contract_address: Optional[str] = None
    contract_name: Optional[str] = None
    contract_version: Optional[str] = None
    network: str
    chain_id: Optional[int] = None
    confirmation_count: int = 0
    status: str = "PENDING"
    wallet_address: Optional[str] = None

class BlockchainTransactionResponse(BlockchainTransactionBase):
    model_config = ConfigDict(from_attributes=True)

class BlockchainSyncTaskBase(BaseModel):
    entity_type: SyncEntityType
    entity_id: UUID
    action_type: SyncActionType
    status: SyncStatus = SyncStatus.PENDING
    transaction_hash: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    retry_count: int = 0
    max_retries: int = 5
    next_retry_time: Optional[datetime] = None
    error_message: Optional[str] = None

class BlockchainSyncTaskResponse(BlockchainSyncTaskBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class BlockchainAuditLogBase(BaseModel):
    entity_type: SyncEntityType
    entity_id: UUID
    action: str
    transaction_hash: Optional[str] = None
    block_number: Optional[int] = None
    contract_address: Optional[str] = None
    caller_address: Optional[str] = None
    event_data: Optional[Dict[str, Any]] = None
    status: str

class BlockchainAuditLogResponse(BlockchainAuditLogBase):
    id: UUID
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class PaginatedResponse(BaseModel):
    items: list[Any]
    total: int
    page: int
    size: int
    pages: int
    
class TransactionSearchQuery(BaseModel):
    status: Optional[str] = None
    contract_name: Optional[str] = None
    entity_type: Optional[SyncEntityType] = None
    wallet_address: Optional[str] = None
    page: int = 1
    size: int = 20

class StatusResponse(BaseModel):
    network: str
    chain_id: int
    rpc_health: str
    gas_price_gwei: float
    wallet_address: Optional[str] = None
    wallet_balance_eth: float = 0.0

class VerificationResponse(BaseModel):
    verified: bool
    database_hash: str
    blockchain_hash: Optional[str] = None
    match: bool
    timestamp: datetime = datetime.utcnow()
