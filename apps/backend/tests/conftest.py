import sys
import uuid
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

@pytest.fixture
def db(test_db):
    return test_db

@pytest.fixture
def patient_user():
    class MockUser:
        id = uuid.UUID("11111111-1111-1111-1111-111111111111")
        email = "patient@medsync.com"
        role = MagicMock()
        role.name = "PATIENT"
        status = "ACTIVE"
    return MockUser()

@pytest.fixture
def doctor_user():
    class MockUser:
        id = uuid.UUID("22222222-2222-2222-2222-222222222222")
        email = "doctor@medsync.com"
        role = MagicMock()
        role.name = "DOCTOR"
        status = "ACTIVE"
    return MockUser()

@pytest.fixture
def admin_user():
    class MockUser:
        id = uuid.UUID("33333333-3333-3333-3333-333333333333")
        email = "admin@medsync.com"
        role = MagicMock()
        role.name = "ADMIN"
        status = "ACTIVE"
    return MockUser()

@pytest.fixture
def patient_token(patient_user):
    from jose import jwt
    from app.core.config import settings
    secret = settings.SUPABASE_JWT_SECRET or "test_secret_for_unit_tests_12345"
    settings.SUPABASE_JWT_SECRET = secret
    return jwt.encode({"sub": str(patient_user.id), "email": patient_user.email, "role": "patient", "user_metadata": {"role": "patient", "status": "ACTIVE"}}, secret, algorithm="HS256")

@pytest.fixture
def doctor_token(doctor_user):
    from jose import jwt
    from app.core.config import settings
    secret = settings.SUPABASE_JWT_SECRET or "test_secret_for_unit_tests_12345"
    settings.SUPABASE_JWT_SECRET = secret
    return jwt.encode({"sub": str(doctor_user.id), "email": doctor_user.email, "role": "doctor", "user_metadata": {"role": "doctor", "status": "ACTIVE"}}, secret, algorithm="HS256")

@pytest.fixture
def admin_token(admin_user):
    from jose import jwt
    from app.core.config import settings
    secret = settings.SUPABASE_JWT_SECRET or "test_secret_for_unit_tests_12345"
    settings.SUPABASE_JWT_SECRET = secret
    return jwt.encode({"sub": str(admin_user.id), "email": admin_user.email, "role": "admin", "user_metadata": {"role": "admin", "status": "ACTIVE"}}, secret, algorithm="HS256")

import pytest_asyncio

@pytest_asyncio.fixture
async def async_client():
    from main import app
    from httpx import AsyncClient, ASGITransport
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


