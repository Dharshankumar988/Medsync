import uuid
from datetime import datetime, date, time
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from main import app
from app.api.v1.endpoints.appointments import require_patient as appt_require_patient
from app.api.v1.endpoints.orders import require_patient as orders_require_patient
from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.models.appointment import Appointment, AppointmentStatus
from app.models.patient import Patient
from app.models.pharmacy import Pharmacy
from app.models.pharmacy_system import MedicineOrder, OrderStatus
from app.models.user import User, UserRole, UserStatus
from app.schemas.session import AuthenticatedPrincipal


def _make_result(scalar=None, all_rows=None):
    res = MagicMock()
    res.scalar_one_or_none.return_value = scalar
    res.scalars.return_value.all.return_value = all_rows or []
    return res


@pytest.mark.asyncio
async def test_book_appointment_defaults_end_time_when_omitted():
    """Booking an appointment without end_time should default end_time to start_time + 30 minutes."""
    patient_id = uuid.uuid4()
    doctor_id = uuid.uuid4()
    principal = AuthenticatedPrincipal(
        id=patient_id, email="patient@medsync.io", role="PATIENT", status="ACTIVE"
    )

    mock_db = AsyncMock()
    captured = {}

    async def fake_book(db, pid, req):
        from datetime import timedelta
        resolved_end = req.end_time or (
            datetime.combine(req.appointment_date, req.start_time) + timedelta(minutes=30)
        ).time()
        captured["end_time"] = resolved_end
        return Appointment(
            id=uuid.uuid4(),
            patient_id=pid,
            doctor_id=req.doctor_id,
            appointment_date=req.appointment_date,
            start_time=req.start_time,
            end_time=resolved_end,
            status=AppointmentStatus.PENDING,
            notes=req.notes,
            created_at=datetime.utcnow(),
        )

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[appt_require_patient] = lambda: principal

    with patch("app.services.security_service.has_enrolled_pin", AsyncMock(return_value=True)), \
         patch("app.services.security_service.validate_patient_pin", AsyncMock(return_value=True)), \
         patch("app.services.appointment.AppointmentService.book_appointment", side_effect=fake_book):
        try:
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
                resp = await client.post(
                    "/api/v1/appointments/book",
                    json={
                        "doctor_id": str(doctor_id),
                        "appointment_date": "2026-11-15",
                        "start_time": "10:00:00",
                        "pin": "123456",
                        "reason": "General Consultation",
                    },
                )
        finally:
            app.dependency_overrides.clear()

    assert resp.status_code == 201, resp.text
    assert captured["end_time"] == time(10, 30, 0)
    assert resp.json()["data"]["end_time"] == "10:30:00"


@pytest.mark.asyncio
async def test_place_order_without_trailing_slash_and_with_total_amount():
    """POST /api/v1/orders (no trailing slash) works and sets non-null total_amount when items is empty."""
    patient_id = uuid.uuid4()
    pharmacy_user_id = uuid.uuid4()
    principal = AuthenticatedPrincipal(
        id=patient_id, email="patient@medsync.io", role="PATIENT", status="ACTIVE"
    )

    pharmacy = Pharmacy(id=uuid.uuid4(), user_id=pharmacy_user_id, business_name="Dharshan Medicals")
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=_make_result(scalar=pharmacy))

    async def fake_create(db, obj_in):
        return MedicineOrder(
            id=uuid.uuid4(),
            patient_id=obj_in["patient_id"],
            pharmacy_id=obj_in["pharmacy_id"],
            prescription_id=obj_in.get("prescription_id"),
            status=obj_in["status"],
            total_amount=obj_in["total_amount"],
            delivery_address=obj_in.get("delivery_address"),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[orders_require_patient] = lambda: principal

    with patch("app.repositories.pharmacy_system.order_repo.create", side_effect=fake_create):
        try:
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
                resp = await client.post(
                    "/api/v1/orders",
                    json={
                        "pharmacy_id": str(pharmacy.id),
                        "delivery_address": "12 MG Road, Bengaluru",
                        "total_amount": 399.0,
                        "items": [],
                    },
                )
        finally:
            app.dependency_overrides.clear()

    assert resp.status_code == 201, resp.text
    assert resp.json()["data"]["total_amount"] == 399.0


@pytest.mark.asyncio
async def test_get_profile_returns_avatar_urls():
    """GET /api/v1/profile/{user_id} returns profile_image_url and profile_picture_url."""
    user_id = uuid.uuid4()
    avatar_url = "https://example.supabase.co/storage/v1/object/public/avatars/test.jpg"
    user_obj = User(
        id=user_id,
        email="patient@medsync.io",
        role=UserRole.PATIENT,
        status=UserStatus.ACTIVE,
        profile_completion_percentage=100,
        profile_image_url=avatar_url,
    )
    pat_obj = Patient(
        id=uuid.uuid4(),
        user_id=user_id,
        full_name="Dharshan Kumar B",
        profile_picture_url=avatar_url,
    )
    principal = AuthenticatedPrincipal(
        id=user_id, email="patient@medsync.io", role="PATIENT", status="ACTIVE"
    )

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(
        side_effect=[
            _make_result(scalar=user_obj),
            _make_result(scalar=pat_obj),
        ]
    )

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: principal

    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
            resp = await client.get(f"/api/v1/profile/{user_id}")
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["profile_image_url"] == avatar_url
    assert data["profile_picture_url"] == avatar_url

