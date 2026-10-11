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
    failure_reason: Optional[str] = None
    created_at: Optional[datetime] = None

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

class BlockchainVerifyResult(BaseModel):
    verified: bool
    status: str  # FINALIZED, CONFIRMED, PENDING, REVERTED, NOT_FOUND, UNVERIFIED
    item_type: str  # TRANSACTION, CONTRACT, ADDRESS, PRESCRIPTION, RECORD, PHARMACY
    identifier: str
    network: str = "Polygon Amoy Testnet"
    chain_id: int = 80002
    block_number: Optional[int] = None
    confirmations: Optional[int] = None
    gas_used: Optional[int] = None
    gas_price_gwei: Optional[float] = None
    from_address: Optional[str] = None
    to_address: Optional[str] = None
    contract_name: Optional[str] = None
    contract_address: Optional[str] = None
    explorer_url: Optional[str] = None
    contract_explorer_url: Optional[str] = None
    timestamp: Optional[str] = None
    title: Optional[str] = None
    subtitle: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None

class SmartContractSummary(BaseModel):
    name: str
    address: str
    version: str = "1.0.0"
    health: str = "DEPLOYED"
    explorer_url: Optional[str] = None

    model_config = ConfigDict(use_enum_values=True)

class TransactionSyncResponse(BaseModel):
    synced_count: int
    message: str

    model_config = ConfigDict(use_enum_values=True)


class BlockchainContractMetric(BaseModel):
    contract_name: str
    tx_count: int
    percentage: float
    total_gas_used: int
    avg_gas_used: float
    min_gas: int
    max_gas: int

    model_config = ConfigDict(use_enum_values=True)


class BlockchainDailyMetric(BaseModel):
    date: str
    tx_count: int
    gas_used: int

    model_config = ConfigDict(use_enum_values=True)


class BlockchainWalletMetric(BaseModel):
    address: str
    tx_count: int
    gas_used: int

    model_config = ConfigDict(use_enum_values=True)


class BlockchainRecentTx(BaseModel):
    hash: str
    short_hash: str
    contract_name: str
    gas_used: int
    block_number: Optional[int] = None
    status: str
    created_at: Optional[str] = None
    explorer_url: str

    model_config = ConfigDict(use_enum_values=True)


class BlockchainNetworkStats(BaseModel):
    name: str = "Polygon Amoy Testnet"
    chain_id: int = 80002
    connected: bool = False
    rpc_url: Optional[str] = None
    latest_block: int = 0
    gas_price_gwei: float = 0.0
    wallet_address: Optional[str] = None
    wallet_balance_pol: float = 0.0
    wallet_balance_wei: int = 0
    explorer_base_url: str = "https://amoy.polygonscan.com"

    model_config = ConfigDict(use_enum_values=True)


class BlockchainGasStats(BaseModel):
    total_gas_used: int = 0
    avg_gas_per_tx: float = 0.0
    min_gas_used: int = 0
    max_gas_used: int = 0
    current_gas_price_gwei: float = 0.0

    model_config = ConfigDict(use_enum_values=True)


class BlockchainSyncTaskStats(BaseModel):
    total_tasks: int = 0
    by_status: dict[str, int] = {}
    by_entity_type: dict[str, int] = {}

    model_config = ConfigDict(use_enum_values=True)


class BlockchainSmartContractInfo(BaseModel):
    name: str
    address: str
    status: str
    tx_count: int = 0
    total_gas: int = 0
    explorer_url: str = ""

    model_config = ConfigDict(use_enum_values=True)


class BlockchainAnalyticsData(BaseModel):
    transactions: dict[str, int] = {}
    events: dict[str, int] = {}
    total_transactions: int = 0
    total_events: int = 0
    network: BlockchainNetworkStats
    gas: BlockchainGasStats
    contracts: list[BlockchainContractMetric] = []
    daily_timeline: list[BlockchainDailyMetric] = []
    top_wallets: list[BlockchainWalletMetric] = []
    sync_tasks: BlockchainSyncTaskStats
    smart_contracts: list[BlockchainSmartContractInfo] = []
    recent_transactions: list[BlockchainRecentTx] = []

    model_config = ConfigDict(use_enum_values=True)




