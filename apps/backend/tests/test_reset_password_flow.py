import time
import pytest
from app.utils.reset_token import (
    create_patient_reset_token,
    verify_patient_reset_token,
    consume_patient_reset_token,
)
from app.services.email_service import email_service

def test_patient_reset_token_creation_and_verification():
    email = "patient.test@example.com"
    token = create_patient_reset_token(email, expire_minutes=5)
    
    assert token is not None
    assert "." in token
    
    # Verify valid token
    valid, token_email, error, remaining_secs = verify_patient_reset_token(token)
    assert valid is True
    assert token_email == email
    assert error is None
    assert remaining_secs > 0 and remaining_secs <= 300

def test_patient_reset_token_tampering_rejected():
    email = "patient.tamper@example.com"
    token = create_patient_reset_token(email, expire_minutes=5)
    
    # Tamper with signature
    parts = token.split(".")
    tampered_token = f"{parts[0]}.invalid_signature"
    
    valid, token_email, error, _ = verify_patient_reset_token(tampered_token)
    assert valid is False
    assert "Invalid token signature" in error

def test_patient_reset_token_nonce_consumption():
    email = "patient.singleuse@example.com"
    token = create_patient_reset_token(email, expire_minutes=5)
    
    # First verification passes
    valid, _, _, _ = verify_patient_reset_token(token)
    assert valid is True
    
    # Consume token
    consumed = consume_patient_reset_token(token)
    assert consumed is True
    
    # Second verification fails
    valid_again, _, error, _ = verify_patient_reset_token(token)
    assert valid_again is False
    assert "already been used" in error

def test_patient_reset_token_expired():
    email = "patient.expired@example.com"
    # Create with negative expire_minutes so it is immediately expired
    token = create_patient_reset_token(email, expire_minutes=-1)
    
    valid, _, error, _ = verify_patient_reset_token(token)
    assert valid is False
    assert "expired" in error.lower()

def test_python_smtp_email_service_dispatch():
    res = email_service.send_patient_password_reset_email(
        to_email="test.patient@medsync.health",
        patient_name="Alex River",
        reset_link="http://localhost:3000/patient/reset-password?token=mock_token&email=test.patient@medsync.health"
    )
    assert res["success"] is True
    assert res["recipient"] == "test.patient@medsync.health"
    assert "preview_link" in res
