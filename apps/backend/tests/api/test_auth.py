import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock
from httpx import AsyncClient, ASGITransport
from main import app
from app.dependencies.db import get_db
from app.models.user import User, UserRole, UserStatus
from sqlalchemy.exc import IntegrityError

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "1.0.0"
    assert "services" in data

@pytest.mark.asyncio
async def test_sync_user_already_exists_by_id():
    test_id = str(uuid.uuid4())
    mock_db = AsyncMock()

    existing_user = User(id=uuid.UUID(test_id), email="patient@medsync.io", role=UserRole.PATIENT, status=UserStatus.ACTIVE)
    res_mock = MagicMock()
    res_mock.scalar_one_or_none.return_value = existing_user
    mock_db.execute.return_value = res_mock

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/api/v1/auth/sync", json={
                "id": test_id,
                "email": "patient@medsync.io",
                "role": "PATIENT",
                "full_name": "Test User"
            })
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "User already synced"
        assert data["data"]["id"] == test_id
    finally:
        app.dependency_overrides.pop(get_db, None)

@pytest.mark.asyncio
async def test_sync_user_duplicate_email_conflict():
    test_id = str(uuid.uuid4())
    existing_other_id = uuid.uuid4()
    mock_db = AsyncMock()

    # Query by ID returns None
    res_id_mock = MagicMock()
    res_id_mock.scalar_one_or_none.return_value = None

    # Query by Email returns existing user with DIFFERENT id
    existing_user = User(id=existing_other_id, email="dharshan@medsync.io", role=UserRole.PATIENT, status=UserStatus.ACTIVE)
    res_email_mock = MagicMock()
    res_email_mock.scalar_one_or_none.return_value = existing_user

    # Query auth.users returns None (not authorized in auth.users)
    res_auth_mock = MagicMock()
    res_auth_mock.scalar_one_or_none.return_value = None

    mock_db.execute.side_effect = [res_id_mock, res_email_mock, res_auth_mock]

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/api/v1/auth/sync", json={
                "id": test_id,
                "email": "dharshan@medsync.io",
                "role": "PATIENT",
                "full_name": "Dharshan Kumar"
            })
        assert response.status_code == 409
        data = response.json()
        assert "already exists" in data["detail"].lower()
    finally:
        app.dependency_overrides.pop(get_db, None)

@pytest.mark.asyncio
async def test_sync_user_integrity_error_handled_as_409():
    test_id = str(uuid.uuid4())
    mock_db = AsyncMock()
    mock_db.add = MagicMock()

    # Query by ID and email both return None (e.g. concurrent race condition)
    res_none = MagicMock()
    res_none.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = res_none

    # flush raises IntegrityError for unique constraint on users_email_key
    mock_db.flush.side_effect = IntegrityError(
        "duplicate key value violates unique constraint \"users_email_key\"",
        params=(),
        orig=Exception("duplicate key value violates unique constraint \"users_email_key\"")
    )

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/api/v1/auth/sync", json={
                "id": test_id,
                "email": "dharshan@medsync.io",
                "role": "PATIENT",
                "full_name": "Dharshan Kumar"
            })
        assert response.status_code == 409
        data = response.json()
        assert "already exists" in data["detail"].lower()
    finally:
        app.dependency_overrides.pop(get_db, None)

