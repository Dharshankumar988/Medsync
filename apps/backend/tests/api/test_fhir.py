import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from main import app
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.schemas.session import AuthenticatedPrincipal
from app.models.patient import Patient

client = TestClient(app)

@pytest.fixture
def mock_user():
    return AuthenticatedPrincipal(
        id=uuid.uuid4(),
        email="test@patient.com",
        role="patient",
        status="ACTIVE",
        full_name="Test Patient"
    )

def test_get_fhir_patient(mock_user):
    mock_db = AsyncMock()
    
    # Mocking the database response for Patient
    mock_patient = Patient(
        id=uuid.uuid4(),
        user_id=mock_user.id,
        full_name="Test Patient",
        gender="MALE",
        date_of_birth="1990-01-01"
    )
    
    class MockUser:
        email = "test@patient.com"

    mock_result_patient = MagicMock()
    mock_result_patient.scalars.return_value.first.return_value = mock_patient

    mock_result_user = MagicMock()
    mock_result_user.scalars.return_value.first.return_value = MockUser()
    
    mock_db.execute.side_effect = [mock_result_patient, mock_result_user]
    
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_user
    
    response = client.get(f"/api/v1/fhir/Patient/{mock_user.id}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["resourceType"] == "Patient"
    assert data["gender"] == "male"
    assert data["birthDate"] == "1990-01-01"
    
    # Cleanup overrides
    app.dependency_overrides.clear()

def test_get_fhir_patient_unauthorized(mock_user):
    mock_db = AsyncMock()
    
    other_patient_id = uuid.uuid4()
    
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_user
    
    response = client.get(f"/api/v1/fhir/Patient/{other_patient_id}")
    
    assert response.status_code == 403
    assert "Not authorized" in response.json()["detail"]
    
    # Cleanup overrides
    app.dependency_overrides.clear()
