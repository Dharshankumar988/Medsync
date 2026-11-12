import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from main import app
from app.blockchain.services.sync_service import BlockchainSyncService
from app.dependencies.auth import RoleChecker
from app.dependencies.db import get_db
from app.models.blockchain import BlockchainSyncTask, SyncActionType, SyncEntityType, SyncStatus
from app.models.doctor import Doctor
from app.models.hospital import Hospital
from app.models.pharmacy import Pharmacy
from app.models.user import User, UserRole, UserStatus
from app.schemas.session import AuthenticatedPrincipal


@pytest.mark.asyncio
async def test_admin_register_uses_cast_jsonb_syntax():
    """Ensure /api/v1/auth/admin-register uses CAST(:param AS jsonb) instead of :param::jsonb."""
    executed_sql = []

    class FakeResult:
        def scalar_one_or_none(self):
            return None

    class FakeBeginNested:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

    mock_db = AsyncMock()
    mock_db.begin_nested = MagicMock(return_value=FakeBeginNested())

    async def fake_execute(stmt, params=None):
        sql_text = str(stmt)
        executed_sql.append(sql_text)
        return FakeResult()

    mock_db.execute = AsyncMock(side_effect=fake_execute)
    app.dependency_overrides[get_db] = lambda: mock_db

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            resp = await client.post(
                "/api/v1/auth/admin-register",
                json={"email": "pharm.test@example.com", "password": "Password123", "role": "PHARMACY"},
            )
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200, resp.text
    insert_queries = [q for q in executed_sql if "INSERT INTO auth.users" in q]
    assert insert_queries, "Expected INSERT INTO auth.users SQL query"
    for q in insert_queries:
        assert ":app_meta::jsonb" not in q
        assert ":user_meta::jsonb" not in q
        assert "CAST(:app_meta AS jsonb)" in q
        assert "CAST(:user_meta AS jsonb)" in q


@pytest.mark.asyncio
async def test_pharmacy_sync_inherits_hospital_address_and_enqueues_registry():
    """Affiliated hospital pharmacy inherits Hospital address/coords and queues PharmacyRegistry CREATE."""
    hosp_id = uuid.uuid4()
    user_id = uuid.uuid4()
    hospital = Hospital(
        id=hosp_id,
        name="City Care Hospital",
        type="hospital",
        address="42 MG Road, Indiranagar",
        city="Bengaluru",
        state="Karnataka",
        country="India",
        pincode="560038",
        latitude=12.9784,
        longitude=77.6408,
        google_maps_url="https://maps.google.com/?q=12.9784,77.6408",
        is_verified=True,
        is_active=True,
    )

    added_objects = []

    class ScalarResult:
        def __init__(self, obj):
            self._obj = obj

        def scalar_one_or_none(self):
            return self._obj

    mock_db = AsyncMock()
    mock_db.add = MagicMock(side_effect=lambda o: added_objects.append(o))
    mock_db.execute = AsyncMock(
        side_effect=[
            ScalarResult(None),      # User by id
            ScalarResult(None),      # User by email
            ScalarResult(hospital),  # Hospital lookup for pharmacy
        ]
    )

    app.dependency_overrides[get_db] = lambda: mock_db

    with patch("app.services.blockchain_sync.trigger_background_sync") as mock_trigger:
        try:
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
                resp = await client.post(
                    "/api/v1/auth/sync",
                    json={
                        "id": str(user_id),
                        "email": "inside.pharm@example.com",
                        "role": "PHARMACY",
                        "full_name": "Manager One",
                        "business_name": "City Care In-House Pharmacy",
                        "license_number": "KA-PH-9988",
                        "contact_number": "9876543210",
                        "hospital_id": str(hosp_id),
                    },
                )
        finally:
            app.dependency_overrides.clear()

    assert resp.status_code == 200, resp.text
    pharm_objs = [o for o in added_objects if isinstance(o, Pharmacy)]
    assert len(pharm_objs) == 1
    pharm = pharm_objs[0]
    assert pharm.address == "42 MG Road, Indiranagar"
    assert pharm.city == "Bengaluru"
    assert pharm.state == "Karnataka"
    assert pharm.location["lat"] == pytest.approx(12.9784)
    assert pharm.location["lng"] == pytest.approx(77.6408)

    sync_tasks = [o for o in added_objects if isinstance(o, BlockchainSyncTask)]
    assert len(sync_tasks) == 1
    assert sync_tasks[0].entity_type == SyncEntityType.PHARMACY
    assert sync_tasks[0].action_type == SyncActionType.CREATE
    assert mock_trigger.called


@pytest.mark.asyncio
async def test_independent_pharmacy_sync_uses_own_address():
    """Independent pharmacy uses its own entered address and coordinates."""
    user_id = uuid.uuid4()
    added_objects = []

    class ScalarResult:
        def __init__(self, obj):
            self._obj = obj

        def scalar_one_or_none(self):
            return self._obj

    mock_db = AsyncMock()
    mock_db.add = MagicMock(side_effect=lambda o: added_objects.append(o))
    mock_db.execute = AsyncMock(side_effect=[ScalarResult(None), ScalarResult(None)])
    app.dependency_overrides[get_db] = lambda: mock_db

    with patch("app.services.blockchain_sync.trigger_background_sync"):
        try:
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
                resp = await client.post(
                    "/api/v1/auth/sync",
                    json={
                        "id": str(user_id),
                        "email": "indie.pharm@example.com",
                        "role": "PHARMACY",
                        "full_name": "Indie Owner",
                        "business_name": "Cornerstone Pharmacy",
                        "license_number": "KA-IND-1122",
                        "contact_number": "9988776655",
                        "address": "101 12th Main, HAL 2nd Stage",
                        "latitude": 12.9716,
                        "longitude": 77.6412,
                    },
                )
        finally:
            app.dependency_overrides.clear()

    assert resp.status_code == 200, resp.text
    pharm = [o for o in added_objects if isinstance(o, Pharmacy)][0]
    assert pharm.address == "101 12th Main, HAL 2nd Stage"
    assert pharm.hospital_id is None
    assert pharm.location["lat"] == pytest.approx(12.9716)


@pytest.mark.asyncio
async def test_sync_service_adheres_to_pharmacy_and_doctor_contracts():
    """Verify BlockchainSyncService invokes exact PharmacyRegistry and DoctorRegistry contract functions."""
    phm_user_id = uuid.uuid4()
    doc_user_id = uuid.uuid4()
    hosp_id = uuid.uuid4()

    phm_task = BlockchainSyncTask(
        id=uuid.uuid4(),
        entity_type=SyncEntityType.PHARMACY,
        entity_id=phm_user_id,
        action_type=SyncActionType.VERIFY,
        status=SyncStatus.PENDING,
        payload={},  # Empty payload tests DB fallback enrichment
    )
    doc_task = BlockchainSyncTask(
        id=uuid.uuid4(),
        entity_type=SyncEntityType.DOCTOR,
        entity_id=doc_user_id,
        action_type=SyncActionType.UPDATE,
        status=SyncStatus.PENDING,
        payload={},  # Empty payload tests DB fallback enrichment
    )

    phm_obj = Pharmacy(id=uuid.uuid4(), user_id=phm_user_id, business_name="Apollo", license_number="PH-001")
    doc_obj = Doctor(id=uuid.uuid4(), user_id=doc_user_id, full_name="Dr. Jane", license_number="MD-001", hospital_id=hosp_id)

    def make_scalar_res(val):
        m = MagicMock()
        m.scalar_one_or_none.return_value = val
        m.scalars.return_value.first.return_value = val
        return m

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(
        side_effect=[
            make_scalar_res(phm_task),   # task lookup
            make_scalar_res(phm_obj),    # Pharmacy DB fallback
            make_scalar_res(None),       # existing BlockchainTransaction check
            make_scalar_res(phm_obj),    # _update_entity_blockchain_status
            make_scalar_res(doc_task),   # task lookup
            make_scalar_res(doc_obj),    # Doctor DB fallback
            make_scalar_res(None),       # existing BlockchainTransaction check
            make_scalar_res(doc_obj),    # _update_entity_blockchain_status
        ]
    )

    fake_receipt = {
        "transactionHash": "0x" + "ab" * 32,
        "blockNumber": 123456,
        "gasUsed": 55000,
        "status": 1,
        "fromAddress": "0x6EC559064e5BfAE4a98d1879c717139aceE49822",
        "toAddress": "0x50dc448bf7260f736A0A3a10151Ccb1a495d3BE9",
    }

    service = BlockchainSyncService(mock_db)

    with patch("app.blockchain.services.sync_service.blockchain_gateway") as mock_gw, \
         patch("app.blockchain.client.blockchain_client") as mock_client:
        mock_client.wallet_address = "0x6EC559064e5BfAE4a98d1879c717139aceE49822"
        mock_client.w3.is_address.return_value = True
        mock_client.w3.to_checksum_address.side_effect = lambda a: a
        mock_gw.read_contract.side_effect = [
            # Pharmacy not registered yet -> calls registerPharmacy + verifyPharmacy
            (b"\x00" * 32, "0x0000000000000000000000000000000000000000", 0, 0, False, False),
            # Doctor already registered -> calls updateAffiliation
            (b"\x00" * 32, b"\x00" * 32, "0x6EC559064e5BfAE4a98d1879c717139aceE49822", 100, 100, True, True),
        ]
        mock_gw.write_contract.return_value = fake_receipt

        await service.execute_sync_task(phm_task.id)
        await service.execute_sync_task(doc_task.id)

        calls = [c.args for c in mock_gw.write_contract.call_args_list]
        assert calls[0][0] == "PharmacyRegistry" and calls[0][1] == "registerPharmacy"
        assert len(calls[0][2]) == 32 and len(calls[0][3]) == 32
        assert calls[1][0] == "PharmacyRegistry" and calls[1][1] == "verifyPharmacy"
        assert calls[2][0] == "DoctorRegistry" and calls[2][1] == "updateAffiliation"
        assert len(calls[2][2]) == 32 and len(calls[2][3]) == 32

    assert phm_task.status == SyncStatus.CONFIRMED
    assert doc_task.status == SyncStatus.CONFIRMED


@pytest.mark.asyncio
async def test_contract_detail_endpoints_for_pharmacy_and_doctor_registries():
    """Ensure /api/v1/blockchain/contracts/{name} works without NameError for both registries."""
    mock_admin = AuthenticatedPrincipal(
        id=uuid.uuid4(),
        email="admin@medsync.io",
        role="ADMIN",
        status="ACTIVE",
        full_name="System Admin",
    )

    class ScalarResult:
        def __init__(self, val):
            self._val = val

        def scalars(self):
            m = MagicMock()
            m.all.return_value = self._val
            return m

    mock_db = AsyncMock()
    mock_db.scalar = AsyncMock(return_value=0)
    mock_db.execute = AsyncMock(return_value=ScalarResult([]))

    app.dependency_overrides[get_db] = lambda: mock_db
    for route in app.routes:
        if getattr(route, "path", "") == "/api/v1/blockchain/contracts/{name}":
            for dep in route.dependant.dependencies:
                if isinstance(dep.call, RoleChecker):
                    app.dependency_overrides[dep.call] = lambda: mock_admin

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            phm_resp = await client.get("/api/v1/blockchain/contracts/PharmacyRegistry")
            doc_resp = await client.get("/api/v1/blockchain/contracts/DoctorRegistry")
    finally:
        app.dependency_overrides.clear()

    assert phm_resp.status_code == 200, phm_resp.text
    assert doc_resp.status_code == 200, doc_resp.text
    phm_fns = phm_resp.json()["data"]["functions"]
    doc_fns = doc_resp.json()["data"]["functions"]
    assert any("registerPharmacy(" in f for f in phm_fns)
    assert any("verifyPharmacy(" in f for f in phm_fns)
    assert any("registerDoctor(" in f for f in doc_fns)
    assert any("updateAffiliation(" in f for f in doc_fns)

