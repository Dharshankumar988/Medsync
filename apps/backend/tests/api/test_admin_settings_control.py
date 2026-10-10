import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from main import app
from app.dependencies.db import get_db
from app.schemas.session import AuthenticatedPrincipal
from app.api.v1.endpoints.admin import require_admin
from app.models.system import SystemSetting
from app.services.rag_service import rag_service

client = TestClient(app)

@pytest.fixture
def mock_admin():
    return AuthenticatedPrincipal(
        id=uuid.uuid4(),
        email="admin@medsync.io",
        role="ADMIN",
        status="ACTIVE",
        full_name="System Admin"
    )

def test_public_system_config_endpoint():
    """Verify that any client can fetch public system configuration without credentials."""
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [
        SystemSetting(key="active_backend_mode", value_str="render"),
        SystemSetting(key="portable_tunnel_url", value_str="https://entangled-dealmaker-storable.ngrok-free.dev"),
        SystemSetting(key="auto_failover", value_bool=True)
    ]
    mock_db.execute.return_value = mock_result

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        response = client.get("/api/v1/health/system-config")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        config = data["data"]
        assert config["active_backend_mode"] == "render"
        assert "entangled-dealmaker-storable.ngrok-free.dev" in config["portable_tunnel_url"]
        assert config["auto_failover"] is True
    finally:
        app.dependency_overrides.pop(get_db, None)

def test_admin_settings_requires_admin():
    """Verify non-admin or unauthenticated requests to /admin/settings are rejected."""
    app.dependency_overrides.pop(require_admin, None)
    response = client.get("/api/v1/admin/settings")
    assert response.status_code in (401, 403)

def test_admin_settings_update_persists(mock_admin):
    """Verify Admin can update active_backend_mode, RAG worker URL, and auto_failover."""
    mock_db = AsyncMock()
    
    # Mock lookup
    mock_query_res = MagicMock()
    mock_query_res.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_query_res

    # Mock subsequent fetch
    mock_scalars = MagicMock()
    mock_scalars.scalars.return_value.all.return_value = [
        SystemSetting(key="active_backend_mode", value_str="portable"),
        SystemSetting(key="rag_worker_url", value_str="https://custom-worker.ngrok-free.dev"),
        SystemSetting(key="auto_failover", value_bool=True)
    ]
    mock_db.execute.side_effect = [mock_query_res, mock_query_res, mock_query_res, mock_scalars]

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[require_admin] = lambda: mock_admin

    try:
        payload = {
            "active_backend_mode": "portable",
            "rag_worker_url": "https://custom-worker.ngrok-free.dev",
            "auto_failover": True
        }
        response = client.post("/api/v1/admin/settings", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        settings = data["data"]
        assert settings["active_backend_mode"] == "portable"
        assert settings["rag_worker_url"] == "https://custom-worker.ngrok-free.dev"
        assert settings["auto_failover"] is True

        # Verify dynamic RAG service was updated
        assert rag_service._worker_url == "https://custom-worker.ngrok-free.dev"
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(require_admin, None)
