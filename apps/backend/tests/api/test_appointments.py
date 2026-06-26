import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_book_appointment_requires_auth():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/api/v1/appointments/book", json={"doctor_id": "123e4567-e89b-12d3-a456-426614174000", "appointment_date": "2026-07-01", "start_time": "10:00", "end_time": "10:30"})
    assert response.status_code == 403
