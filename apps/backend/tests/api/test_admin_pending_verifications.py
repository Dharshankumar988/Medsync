import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from main import app
from app.api.v1.endpoints.admin import require_admin
from app.dependencies.db import get_db
from app.models.pharmacy import Pharmacy
from app.models.user import User, UserRole, UserStatus
from app.models.verification import RoleType, VerificationRequest, VerificationStatus
from app.schemas.session import AuthenticatedPrincipal


@pytest.fixture
def admin_principal():
    return AuthenticatedPrincipal(
        id=uuid.uuid4(),
        email="admin@medsync.io",
        role="ADMIN",
        status="ACTIVE",
        full_name="System Admin",
    )


def _make_result(all_rows=None, scalar=None, first_val=None):
    res = MagicMock()
    res.all.return_value = all_rows or []
    res.scalar_one_or_none.return_value = scalar
    res.scalars.return_value.first.return_value = first_val
    res.scalars.return_value.all.return_value = all_rows or []
    return res


@pytest.mark.asyncio
async def test_pending_verifications_includes_unverified_pharmacy_without_verification_request(admin_principal):
    """Unverified pharmacies without a VerificationRequest row must still appear in pending verifications."""
    phm_user_id = uuid.uuid4()
    phm_user = User(
        id=phm_user_id,
        email="pharmacy100@gmail.com",
        role=UserRole.PHARMACY,
        status=UserStatus.PENDING,
        is_verified=False,
        created_at=datetime(2026, 11, 12, 10, 0, 0),
    )
    pharmacy = Pharmacy(
        id=uuid.uuid4(),
        user_id=phm_user_id,
        business_name="Dharshan Medicals",
        contact_number="8197332300",
        license_number="LIC-PHM-05A5",
    )

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(
        side_effect=[
            _make_result(all_rows=[]),                          # 1. VerificationRequest PENDING rows
            _make_result(all_rows=[(phm_user, None, pharmacy)]), # 2. Orphaned unverified Doctor/Pharmacy users
            _make_result(all_rows=[]),                          # 3. DoctorLocation PENDING rows
        ]
    )

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[require_admin] = lambda: admin_principal
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
            resp = await client.get("/api/v1/admin/verifications/pending")
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200, resp.text
    items = resp.json()["data"]
    assert len(items) == 1
    assert items[0]["request_id"] == str(phm_user_id)
    assert items[0]["user_id"] == str(phm_user_id)
    assert items[0]["email"] == "pharmacy100@gmail.com"
    assert items[0]["role"] == "PHARMACY"
    assert items[0]["profile"]["business_name"] == "Dharshan Medicals"
    assert items[0]["profile"]["contact_number"] == "8197332300"


@pytest.mark.asyncio
async def test_approve_reconciled_pharmacy_without_verification_request(admin_principal):
    """Approving a reconciled unverified pharmacy by user_id creates/approves VerificationRequest and activates user."""
    phm_user_id = uuid.uuid4()
    phm_user = User(
        id=phm_user_id,
        email="pharmacy100@gmail.com",
        role=UserRole.PHARMACY,
        status=UserStatus.PENDING,
        is_verified=False,
    )
    pharmacy = Pharmacy(
        id=uuid.uuid4(),
        user_id=phm_user_id,
        business_name="Dharshan Medicals",
        contact_number="8197332300",
        license_number="LIC-PHM-05A5",
    )

    added_objects = []
    mock_db = AsyncMock()
    mock_db.add = MagicMock(side_effect=lambda obj: added_objects.append(obj))

    def fake_flush():
        for obj in added_objects:
            if isinstance(obj, VerificationRequest) and obj.id is None:
                obj.id = uuid.uuid4()

    mock_db.flush = AsyncMock(side_effect=fake_flush)

    async def fake_execute(stmt, *args, **kwargs):
        sql_str = str(stmt)
        if "FROM verification_requests" in sql_str:
            # First lookup by request_id returns None; lookup inside approve_request returns created req
            created_req = next((o for o in added_objects if isinstance(o, VerificationRequest)), None)
            return _make_result(scalar=created_req, first_val=created_req)
        if "FROM doctor_locations" in sql_str:
            return _make_result(scalar=None)
        if "FROM users" in sql_str:
            return _make_result(scalar=phm_user)
        if "FROM admins" in sql_str:
            return _make_result(scalar=None)
        if "FROM pharmacies" in sql_str:
            return _make_result(scalar=pharmacy)
        return _make_result()

    mock_db.execute = AsyncMock(side_effect=fake_execute)

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[require_admin] = lambda: admin_principal
    with patch("app.services.blockchain_sync.trigger_background_sync"):
        try:
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
                resp = await client.post(f"/api/v1/admin/verifications/{phm_user_id}/approve")
        finally:
            app.dependency_overrides.clear()

    assert resp.status_code == 200, resp.text
    assert phm_user.is_verified is True
    assert phm_user.status == UserStatus.ACTIVE
    assert pharmacy.qr_status == "ACTIVE"
    assert pharmacy.qr_identifier is not None
    vreqs = [o for o in added_objects if isinstance(o, VerificationRequest)]
    assert len(vreqs) == 1
    assert vreqs[0].status == VerificationStatus.APPROVED
    assert vreqs[0].role_type == RoleType.PHARMACY


@pytest.mark.asyncio
async def test_reject_reconciled_pharmacy_without_verification_request(admin_principal):
    """Rejecting a reconciled unverified pharmacy by user_id creates/rejects VerificationRequest cleanly."""
    phm_user_id = uuid.uuid4()
    phm_user = User(
        id=phm_user_id,
        email="pharmacy100@gmail.com",
        role=UserRole.PHARMACY,
        status=UserStatus.PENDING,
        is_verified=False,
    )

    added_objects = []
    mock_db = AsyncMock()
    mock_db.add = MagicMock(side_effect=lambda obj: added_objects.append(obj))

    def fake_flush():
        for obj in added_objects:
            if isinstance(obj, VerificationRequest) and obj.id is None:
                obj.id = uuid.uuid4()

    mock_db.flush = AsyncMock(side_effect=fake_flush)

    async def fake_execute(stmt, *args, **kwargs):
        sql_str = str(stmt)
        if "FROM verification_requests" in sql_str:
            created_req = next((o for o in added_objects if isinstance(o, VerificationRequest)), None)
            return _make_result(scalar=created_req, first_val=created_req)
        if "FROM doctor_locations" in sql_str:
            return _make_result(scalar=None)
        if "FROM users" in sql_str:
            return _make_result(scalar=phm_user)
        if "FROM admins" in sql_str:
            return _make_result(scalar=None)
        return _make_result()

    mock_db.execute = AsyncMock(side_effect=fake_execute)

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[require_admin] = lambda: admin_principal
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
            resp = await client.post(f"/api/v1/admin/verifications/{phm_user_id}/reject")
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200, resp.text
    vreqs = [o for o in added_objects if isinstance(o, VerificationRequest)]
    assert len(vreqs) == 1
    assert vreqs[0].status == VerificationStatus.REJECTED
    assert vreqs[0].role_type == RoleType.PHARMACY


@pytest.mark.asyncio
async def test_sync_existing_unverified_pharmacy_creates_verification_request():
    """Calling /api/v1/auth/sync for an existing unverified pharmacy backfills a PENDING VerificationRequest."""
    phm_user_id = uuid.uuid4()
    existing_user = User(
        id=phm_user_id,
        email="pharmacy100@gmail.com",
        role=UserRole.PHARMACY,
        status=UserStatus.PENDING,
        is_verified=False,
    )
    existing_pharmacy = Pharmacy(
        id=uuid.uuid4(),
        user_id=phm_user_id,
        business_name="Dharshan Medicals",
        contact_number="8197332300",
    )

    added_objects = []
    mock_db = AsyncMock()
    mock_db.add = MagicMock(side_effect=lambda obj: added_objects.append(obj))
    mock_db.execute = AsyncMock(
        side_effect=[
            _make_result(scalar=existing_user),      # User by id
            _make_result(scalar=existing_pharmacy),  # Pharmacy by user_id
            _make_result(first_val=None),            # Existing VerificationRequest lookup
        ]
    )

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
            resp = await client.post(
                "/api/v1/auth/sync",
                json={
                    "id": str(phm_user_id),
                    "email": "pharmacy100@gmail.com",
                    "role": "PHARMACY",
                    "full_name": "Dharshan",
                    "business_name": "Dharshan Medicals",
                    "contact_number": "8197332300",
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200, resp.text
    vreqs = [o for o in added_objects if isinstance(o, VerificationRequest)]
    assert len(vreqs) == 1
    assert vreqs[0].user_id == phm_user_id
    assert vreqs[0].role_type == RoleType.PHARMACY
    assert vreqs[0].status == VerificationStatus.PENDING

