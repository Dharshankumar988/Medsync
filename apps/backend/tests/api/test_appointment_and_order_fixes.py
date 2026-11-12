import uuid
from datetime import datetime, date, time
from types import SimpleNamespace
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


@pytest.mark.asyncio
async def test_upload_record_requires_enrolled_pin_first():
    """Uploading a record without an enrolled PIN returns a clear 400 prompt instead of 401."""
    from app.api.v1.endpoints.records import require_patient as records_require_patient

    patient_id = uuid.uuid4()
    principal = AuthenticatedPrincipal(
        id=patient_id, email="patient@medsync.io", role="PATIENT", status="ACTIVE"
    )
    mock_db = AsyncMock()
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[records_require_patient] = lambda: principal

    with patch("app.services.security_service.has_enrolled_pin", AsyncMock(return_value=False)):
        try:
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
                resp = await client.post(
                    "/api/v1/records",
                    data={"title": "Blood Test", "pin": "123456"},
                    files={"file": ("report.pdf", b"%PDF-1.4 test", "application/pdf")},
                )
        finally:
            app.dependency_overrides.clear()

    assert resp.status_code == 400, resp.text
    assert "not set up" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_book_appointment_resolves_doctor_table_id_to_user_id():
    """Passing doctors.id instead of doctors.user_id must store doctor.user_id to satisfy appointments_doctor_id_fkey."""
    from datetime import date, time
    from app.services.appointment import AppointmentService
    from app.schemas.appointment import AppointmentCreate

    patient_id = uuid.uuid4()
    doctor_table_id = uuid.UUID("3b000000-0000-0000-0000-000000000001")
    doctor_user_id = uuid.UUID("1b000000-0000-0000-0000-000000000001")

    user_obj = SimpleNamespace(id=patient_id, profile_completion_percentage=100)
    doctor_obj = SimpleNamespace(
        id=doctor_table_id,
        user_id=doctor_user_id,
        full_name="Aadhya Patel",
        is_accepting_appointments=True,
    )
    patient_obj = SimpleNamespace(full_name="Dharshan")

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(
        side_effect=[
            _make_result(scalar=user_obj),
            _make_result(scalar=doctor_obj),
            _make_result(scalar=doctor_user_id),
            _make_result(scalar=patient_obj),
        ]
    )

    req = AppointmentCreate(
        doctor_id=doctor_table_id,
        appointment_date=date(2026, 11, 13),
        start_time=time(11, 0),
        notes="Fever & Flu",
        pin="123456",
    )

    mock_conflict = AsyncMock(return_value=False)
    mock_create = AsyncMock(side_effect=lambda db, obj_in: SimpleNamespace(**obj_in))
    mock_notify = AsyncMock()

    with patch("app.services.appointment.appointment_repo.check_conflict", mock_conflict), \
         patch("app.services.appointment.appointment_repo.create", mock_create), \
         patch("app.services.appointment.NotificationService.send_notification", mock_notify):
        appt = await AppointmentService.book_appointment(mock_db, patient_id, req)

    assert appt.doctor_id == doctor_user_id
    assert mock_conflict.call_args.args[1] == doctor_user_id
    assert mock_create.call_args.kwargs["obj_in"]["doctor_id"] == doctor_user_id
    assert mock_notify.call_args_list[0].kwargs["user_id"] == doctor_user_id


@pytest.mark.asyncio
async def test_book_appointment_raises_404_for_missing_doctor():
    """Booking with a nonexistent doctor UUID raises NotFoundException rather than triggering a Postgres FK error."""
    from datetime import date, time
    from app.services.appointment import AppointmentService
    from app.schemas.appointment import AppointmentCreate
    from app.core.exceptions import NotFoundException

    patient_id = uuid.uuid4()
    missing_doctor_id = uuid.uuid4()
    user_obj = SimpleNamespace(id=patient_id, profile_completion_percentage=100)

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(
        side_effect=[
            _make_result(scalar=user_obj),
            _make_result(scalar=None),
            _make_result(scalar=None),
        ]
    )

    req = AppointmentCreate(
        doctor_id=missing_doctor_id,
        appointment_date=date(2026, 11, 13),
        start_time=time(11, 0),
        pin="123456",
    )

    with pytest.raises(NotFoundException):
        await AppointmentService.book_appointment(mock_db, patient_id, req)


def test_contract_loader_abis_match_deployed_contracts():
    """All 6 core smart contracts resolve canonical addresses and ABIs including ConsentManagement & grantAccess."""
    from app.blockchain.contracts.loader import contract_loader

    required_methods = {
        "ConsentManagement": {"grantConsent", "revokeConsent", "checkConsent", "getConsentId"},
        "PatientRegistry": {"registerPatient", "verifyPatient", "updateWallet", "deactivatePatient", "getPatient"},
        "DoctorRegistry": {"registerDoctor", "verifyDoctor", "suspendDoctor", "updateAffiliation", "getDoctor"},
        "PharmacyRegistry": {"registerPharmacy", "verifyPharmacy", "suspendPharmacy", "getPharmacy"},
        "MedicalRecordRegistry": {"registerRecord", "verifyRecord", "grantAccess", "revokeAccess", "getRecord"},
        "PrescriptionRegistry": {"createPrescription", "verifyPrescription", "revokePrescription", "getPrescription"},
    }

    for contract_name, expected_fns in required_methods.items():
        assert contract_name in contract_loader.addresses
        abi = contract_loader.get_abi(contract_name)
        fn_names = {item["name"] for item in abi if isinstance(item, dict) and item.get("type") == "function"}
        missing = expected_fns - fn_names
        assert not missing, f"{contract_name} ABI missing methods: {missing}"

    # Verify alias fallback works too
    assert contract_loader.get_abi("ConsentManager") == contract_loader.get_abi("ConsentManagement")


