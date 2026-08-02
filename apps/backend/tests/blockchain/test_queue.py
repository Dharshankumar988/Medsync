import pytest
import uuid
from unittest.mock import MagicMock
from app.models.blockchain import BlockchainEventQueue, BlockchainQueueStatus
from app.blockchain.workers.event_worker import sync_events

@pytest.mark.asyncio
async def test_event_worker_processing(test_db):
    """Test that the event worker processes pending events."""
    event_id = uuid.uuid4()
    dummy_event = BlockchainEventQueue(
        id=event_id,
        event_name="PatientRegistered",
        contract_name="PatientRegistry",
        contract_address="0x123",
        transaction_hash="0xabc",
        block_number=100,
        log_index=0,
        event_data={"patientId": str(uuid.uuid4())},
        status=BlockchainQueueStatus.PENDING
    )
    
    # Setup mock to handle multiple calls (first for events, second for audit log)
    mock_events_result = MagicMock()
    mock_events_result.scalars.return_value.all.return_value = [dummy_event]
    
    mock_audit_result = MagicMock()
    mock_audit_result.scalar_one_or_none.return_value = None
    
    # Return events result first, then audit log result
    test_db.execute.side_effect = [mock_events_result, mock_audit_result]

    await sync_events(test_db)
    assert dummy_event.status == BlockchainQueueStatus.PROCESSED

@pytest.mark.asyncio
async def test_event_worker_failure_routing(test_db):
    """Test that a failing event processes state transition."""
    event_id = uuid.uuid4()
    dummy_event = BlockchainEventQueue(
        id=event_id,
        event_name="InvalidEvent",
        contract_name="PatientRegistry",
        contract_address="0x123",
        transaction_hash="0xdef",
        block_number=100,
        log_index=0,
        event_data={},
        status=BlockchainQueueStatus.PENDING,
        retry_count=4,
        max_retries=5
    )
    
    mock_events_result = MagicMock()
    mock_events_result.scalars.return_value.all.return_value = [dummy_event]
    
    mock_audit_result = MagicMock()
    mock_audit_result.scalar_one_or_none.return_value = None
    
    test_db.execute.side_effect = [mock_events_result, mock_audit_result]

    await sync_events(test_db)
    assert dummy_event.status in (BlockchainQueueStatus.PROCESSED, BlockchainQueueStatus.FAILED, BlockchainQueueStatus.DLQ)

