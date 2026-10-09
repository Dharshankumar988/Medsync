import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from main import app
from app.dependencies.db import get_db
from app.dependencies.auth import RoleChecker
from app.schemas.session import AuthenticatedPrincipal
from app.models.user import User, UserRole, UserStatus
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.hospital import Hospital
from app.models.pharmacy import Pharmacy
from app.api.v1.endpoints.admin import require_admin

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

def test_admin_graph_success(mock_admin):
    """Test /api/v1/admin/graph endpoint returns typed RelationshipGraphResponse with all entity nodes."""
    mock_db = AsyncMock()

    # 1. Mock Patient
    user_p = User(id=uuid.uuid4(), email="patient@medsync.io", role=UserRole.PATIENT, status=UserStatus.ACTIVE)
    patient = Patient(
        id=uuid.uuid4(),
        user_id=user_p.id,
        full_name="Alice Patient",
        phone_number="111-222-3333",
        city="Boston",
        state="MA"
    )
    result_patients = MagicMock()
    result_patients.all.return_value = [(patient, user_p)]

    # 2. Mock Doctor
    user_d = User(id=uuid.uuid4(), email="doctor@medsync.io", role=UserRole.DOCTOR, status=UserStatus.ACTIVE)
    doctor = Doctor(
        id=uuid.uuid4(),
        user_id=user_d.id,
        full_name="Dr. Bob",
        specialization="Cardiology",
        clinic_phone="222-333-4444",
        doctor_status="VERIFIED"
    )
    result_doctors = MagicMock()
    result_doctors.all.return_value = [(doctor, user_d)]

    # 3. Mock Pharmacy
    user_ph = User(id=uuid.uuid4(), email="pharmacy@medsync.io", role=UserRole.PHARMACY, status=UserStatus.ACTIVE)
    pharmacy = Pharmacy(
        id=uuid.uuid4(),
        user_id=user_ph.id,
        business_name="Metro Pharmacy",
        contact_number="333-444-5555",
        city="Boston"
    )
    result_pharmacies = MagicMock()
    result_pharmacies.all.return_value = [(pharmacy, user_ph)]

    # 4. Mock Hospital
    hospital = Hospital(
        id=uuid.uuid4(),
        name="General Hospital",
        phone_number="444-555-6666",
        type="general",
        city="Boston"
    )
    result_hospitals = MagicMock()
    result_hospitals.scalars.return_value.all.return_value = [hospital]

    # 5. Mock Admin User
    admin_user = User(
        id=uuid.uuid4(),
        email="admin2@medsync.io",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        is_verified=True
    )
    result_admins = MagicMock()
    result_admins.scalars.return_value.all.return_value = [admin_user]

    # Assign DB execution side effects
    mock_db.execute.side_effect = [
        result_patients,
        result_doctors,
        result_pharmacies,
        result_hospitals,
        result_admins
    ]

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[require_admin] = lambda: mock_admin

    response = client.get("/api/v1/admin/graph")

    assert response.status_code == 200, f"Expected 200 but got {response.status_code}: {response.text}"
    body = response.json()
    assert body["status"] == "success"
    assert "data" in body
    data = body["data"]

    assert "nodes" in data
    assert "links" in data

    nodes = data["nodes"]
    # 1 central + 1 patient + 1 doctor + 1 pharmacy + 1 hospital + 1 admin = 6
    assert len(nodes) == 6

    # Verify central node
    assert nodes[0]["id"] == "MEDSYNC"
    assert nodes[0]["label"] == "MedSync"
    assert nodes[0]["isCentral"] is True

    # Verify hospital node attributes
    hospital_node = next(n for n in nodes if n["type"] == "Hospital")
    assert hospital_node["entityData"]["name"] == "General Hospital"
    assert hospital_node["entityData"]["phone"] == "444-555-6666"
    assert hospital_node["entityData"]["type"] == "general"

    # Verify admin node enum serialization
    admin_node = next(n for n in nodes if n["type"] == "Admin")
    assert admin_node["entityData"]["role"] == "ADMIN"
    assert admin_node["entityData"]["status"] == "ACTIVE"

    # Cleanup overrides
    app.dependency_overrides.clear()
