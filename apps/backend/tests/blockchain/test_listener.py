import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from app.blockchain.monitoring.listener import _is_rate_limit_error, fetch_and_enqueue_batch

def test_is_rate_limit_error():
    assert _is_rate_limit_error(Exception("429 Client Error: Too Many Requests for url: https://polygon-amoy.g.alchemy.com/v2/xxx")) is True
    assert _is_rate_limit_error(Exception("Monthly capacity limit exceeded. Visit https://dashboard.alchemy.com")) is True
    assert _is_rate_limit_error(Exception("Your app has exceeded its compute units")) is True
    assert _is_rate_limit_error(Exception("Connection refused")) is False

@pytest.mark.asyncio
async def test_fetch_and_enqueue_batch_empty():
    db = AsyncMock()
    with patch("app.blockchain.monitoring.listener.blockchain_client") as mock_client, \
         patch("app.blockchain.monitoring.listener.contract_loader") as mock_loader:
        
        mock_contract = MagicMock()
        mock_contract.address = "0x9Dcd620f006555ffFA072d2280ef47506C5Da2A3"
        mock_loader.get_contract.return_value = mock_contract
        
        mock_client.w3 = MagicMock()
        mock_client.w3.eth.get_logs.return_value = []
        
        success = await fetch_and_enqueue_batch(100, 110, db)
        assert success is True
        # Verify get_logs was called only ONCE for all contracts, not per-event!
        assert mock_client.w3.eth.get_logs.call_count == 1
        db.add.assert_not_called()

@pytest.mark.asyncio
async def test_fetch_and_enqueue_batch_decodes_locally():
    db = AsyncMock()
    with patch("app.blockchain.monitoring.listener.blockchain_client") as mock_client, \
         patch("app.blockchain.monitoring.listener.contract_loader") as mock_loader:
        
        contract_addr = "0x9Dcd620f006555ffFA072d2280ef47506C5Da2A3"
        mock_contract = MagicMock()
        mock_contract.address = contract_addr
        
        mock_events = MagicMock()
        mock_event_abi = MagicMock()
        mock_event_abi.event_name = "PatientRegistered"
        mock_events.__iter__.return_value = [mock_event_abi]

        mock_event_type = MagicMock()
        mock_decoded = MagicMock()
        mock_decoded.args = {"patientId": "p123"}
        mock_event_type.return_value.process_log.return_value = mock_decoded
        setattr(mock_events, "PatientRegistered", mock_event_type)
        mock_contract.events = mock_events
        
        mock_loader.get_contract.return_value = mock_contract
        
        mock_client.w3 = MagicMock()
        mock_client.w3.eth.get_logs.return_value = [
            {
                "address": contract_addr,
                "transactionHash": "0xabc",
                "blockNumber": 105,
                "logIndex": 1
            }
        ]
        
        success = await fetch_and_enqueue_batch(100, 110, db)
        assert success is True
        assert db.add.call_count == 1
        assert db.commit.call_count == 1
