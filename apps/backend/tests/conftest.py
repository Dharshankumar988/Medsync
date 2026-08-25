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
sys.modules['cryptography'] = MagicMock()
sys.modules['cryptography.fernet'] = MagicMock()
sys.modules['cryptography.hazmat'] = MagicMock()
sys.modules['cryptography.hazmat.primitives'] = MagicMock()
sys.modules['cryptography.hazmat.primitives.ciphers'] = MagicMock()
sys.modules['cryptography.hazmat.backends'] = MagicMock()

@pytest.fixture
def test_db(patient_user, doctor_user, admin_user):
    from unittest.mock import AsyncMock, MagicMock
    mock_session = AsyncMock()
    
    class MockResult:
        def __init__(self, user):
            self.user = user
        def scalar_one_or_none(self):
            return self.user
            
    async def mock_execute(stmt, *args, **kwargs):
        stmt_str = str(stmt).lower()
        params_str = ""
        try:
            if hasattr(stmt, "compile"):
                compiled = stmt.compile()
                if hasattr(compiled, "params") and compiled.params:
                    params_str = str(compiled.params).lower()
        except Exception:
            pass
            
        combined_str = stmt_str + " " + params_str
        if "11111111" in combined_str:
            return MockResult(patient_user)
        elif "22222222" in combined_str:
            return MockResult(doctor_user)
        elif "33333333" in combined_str:
            return MockResult(admin_user)
        # default to patient to prevent privilege escalation in tests
        return MockResult(patient_user)
        
    mock_session.execute.side_effect = mock_execute
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
        role.value = "PATIENT"
        status = MagicMock()
        status.name = "ACTIVE"
        status.value = "ACTIVE"
    return MockUser()

@pytest.fixture
def doctor_user():
    class MockUser:
        id = uuid.UUID("22222222-2222-2222-2222-222222222222")
        email = "doctor@medsync.com"
        role = MagicMock()
        role.name = "DOCTOR"
        role.value = "DOCTOR"
        status = MagicMock()
        status.name = "ACTIVE"
        status.value = "ACTIVE"
    return MockUser()

@pytest.fixture
def admin_user():
    class MockUser:
        id = uuid.UUID("33333333-3333-3333-3333-333333333333")
        email = "admin@medsync.com"
        role = MagicMock()
        role.name = "ADMIN"
        role.value = "ADMIN"
        status = MagicMock()
        status.name = "ACTIVE"
        status.value = "ACTIVE"
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
async def async_client(test_db):
    from main import app
    from app.dependencies.db import get_db
    from httpx import AsyncClient, ASGITransport
    
    async def override_get_db():
        yield test_db
        
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
        
    app.dependency_overrides.clear()


