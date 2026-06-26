import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_upload_record_requires_auth():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/api/v1/records/", data={"title": "Test"}, files={"file": ("test.pdf", b"mock")})
    assert response.status_code == 403  # Not authenticated (FastAPI HTTPBearer)
