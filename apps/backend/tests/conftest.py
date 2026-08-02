import sys
from unittest.mock import AsyncMock, MagicMock
import os
import pytest

# Set required environment variables for tests
os.environ['BACKEND_PRIVATE_KEY'] = '0x1234567890123456789012345678901234567890123456789012345678901234'
os.environ['BLOCKCHAIN_RPC_URL'] = 'http://localhost:8545'
os.environ['BLOCKCHAIN_MODE'] = 'mock'

# Mock native packages that cannot be installed on Windows ARM64 for local dev testing
sys.modules['web3'] = MagicMock()
sys.modules['web3.contract'] = MagicMock()
sys.modules['web3.exceptions'] = MagicMock()
sys.modules['eth_account'] = MagicMock()
sys.modules['eth_account.messages'] = MagicMock()
sys.modules['eth_utils'] = MagicMock()

@pytest.fixture
def test_db():
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock()
    mock_session.refresh = AsyncMock()
    mock_session.delete = MagicMock()
    return mock_session


