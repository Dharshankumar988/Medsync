import pytest
import uuid
from app.schemas.security import SecurityStatusResponse, SecurityStatusData
from app.models.hospital import Hospital
from app.models.user import UserRole
from app.schemas.response import APIResponse

def test_security_status_schema_with_doctor_data():
    """Verify SecurityStatusData and SecurityStatusResponse validate correctly for doctor."""
    doctor_status_dict = {
        "has_pin": False,
        "doctor_id": str(uuid.uuid4())
    }
    
    # Construct SecurityStatusData
    has_pin = doctor_status_dict["has_pin"]
    status_str = "COMPLETED" if has_pin else "NOT_STARTED"
    data = SecurityStatusData(
        status=status_str,
        has_pin=has_pin,
        doctor_id=doctor_status_dict["doctor_id"]
    )
    
    response = SecurityStatusResponse(
        status=status_str,
        message="Security status retrieved",
        data=data
    )
    
    assert response.status == "NOT_STARTED"
    assert response.data.has_pin is False
    assert response.data.doctor_id == doctor_status_dict["doctor_id"]

def test_security_status_schema_with_enrolled_doctor():
    """Verify SecurityStatusData and SecurityStatusResponse for enrolled doctor."""
    doc_id = str(uuid.uuid4())
    data = SecurityStatusData(
        status="COMPLETED",
        has_pin=True,
        doctor_id=doc_id
    )
    response = SecurityStatusResponse(
        status="COMPLETED",
        message="Security status retrieved",
        data=data
    )
    assert response.status == "COMPLETED"
    assert response.data.has_pin is True
    assert response.data.doctor_id == doc_id

def test_hospital_doctor_submission_and_admin_verification():
    """Verify hospital entity contracts for doctor submission and admin verification."""
    doctor_user_id = uuid.uuid4()
    
    # Doctor creates a facility -> is_verified defaults to False
    hosp = Hospital(
        name="St. Mary Clinic",
        address="456 Oak Avenue",
        city="Springfield",
        type="clinic",
        user_id=doctor_user_id,
        is_verified=False
    )
    
    assert hosp.is_verified is False
    assert hosp.user_id == doctor_user_id
    assert hosp.type == "clinic"
    assert hosp.hospital_type == "clinic"
    
    # Admin verifies the facility
    hosp.is_verified = True
    assert hosp.is_verified is True
