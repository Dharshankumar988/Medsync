from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID
from app.models.blockchain import BlockchainQueueStatus

class QueueEventCreate(BaseModel):
    event_name: str
    contract_name: str
    contract_address: str
    transaction_hash: str
    block_number: int
    log_index: int
    event_data: Dict[str, Any]

class QueueEventResponse(QueueEventCreate):
    id: UUID
    status: BlockchainQueueStatus
    retry_count: int
    max_retries: int
    next_retry_time: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class QueueMetricsResponse(BaseModel):
    total_pending: int
    total_processing: int
    total_processed: int
    total_failed: int
    total_dlq: int
    recent_errors: List[str] = []
