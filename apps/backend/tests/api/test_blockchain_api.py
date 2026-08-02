import pytest
from httpx import AsyncClient
from main import app
from app.dependencies.db import get_db
import uuid

async def mock_get_db():
    # Yield a mock or just None if we don't hit the DB in 403 checks
    yield None

app.dependency_overrides[get_db] = mock_get_db

@pytest.mark.asyncio
async def test_blockchain_status():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/v1/blockchain/status")
        # Unauthenticated users get 403 from RoleChecker or get_current_user
        assert response.status_code == 403

@pytest.mark.asyncio
async def test_patient_register():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        patient_id = str(uuid.uuid4())
        response = await ac.post(f"/api/v1/blockchain/patient/register?patient_id={patient_id}")
        assert response.status_code == 403

@pytest.mark.asyncio
async def test_transactions_pagination():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/v1/blockchain/transactions?page=1&size=10")
        assert response.status_code == 403

