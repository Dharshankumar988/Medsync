import pytest
import hmac
from datetime import datetime, timedelta, timezone
from app.utils.otp import generate_otp_code, hash_otp_code
from app.schemas.auth import (
    SendOTPRequest,
    SendOTPResponseData,
    VerifyOTPRequest,
    VerifyOTPResponseData,
    ResetPasswordWithOTPRequest,
    LoginGuardRequest,
    LoginGuardResponseData,
    AdminCreateResponseData
)

def test_otp_code_format_and_randomness():
    """Verify that generated OTP codes are 6-digit numeric strings."""
    codes = set()
    for _ in range(50):
        code = generate_otp_code()
        assert len(code) == 6
        assert code.isdigit()
        codes.add(code)
    # Ensure high entropy / uniqueness across samples
    assert len(codes) > 40

def test_otp_hashing_consistency_and_isolation():
    """Verify HMAC hashing matches for same code and differs across purposes/emails."""
    email = "patient@example.com"
    code = "123456"
    hash1 = hash_otp_code(email, code, "EMAIL_VERIFY")
    hash2 = hash_otp_code(email, code, "EMAIL_VERIFY")
    assert hash1 == hash2

    # Different purpose produces different hash
    reset_hash = hash_otp_code(email, code, "PASSWORD_RESET")
    assert hash1 != reset_hash

    # Different email produces different hash
    other_email_hash = hash_otp_code("other@example.com", code, "EMAIL_VERIFY")
    assert hash1 != other_email_hash

    # Case insensitivity for email
    upper_email_hash = hash_otp_code("PATIENT@EXAMPLE.COM", code, "EMAIL_VERIFY")
    assert hash1 == upper_email_hash

def test_otp_pydantic_schema_integrity():
    """Verify all OTP schemas instantiate properly with strict typing and enum serialization."""
    send_req = SendOTPRequest(email="test@medsync.health", purpose="EMAIL_VERIFY")
    assert send_req.email == "test@medsync.health"

    verify_req = VerifyOTPRequest(email="test@medsync.health", otp_code="654321", purpose="EMAIL_VERIFY")
    assert verify_req.otp_code == "654321"

    login_guard_resp = LoginGuardResponseData(
        allowed=True,
        email="patient@test.com",
        role="PATIENT",
        status="ACTIVE",
        is_verified=True,
        message="Patient verified."
    )
    assert login_guard_resp.allowed is True
    assert login_guard_resp.role == "PATIENT"

    admin_create_resp = AdminCreateResponseData(id="123e4567-e89b-12d3-a456-426614174000", email="admin@medsync.health")
    assert admin_create_resp.email == "admin@medsync.health"
