import hmac
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.otp import OTPVerification

def generate_otp_code() -> str:
    """Generates a secure, cryptographically random 6-digit OTP."""
    return f"{secrets.randbelow(1000000):06d}"

def hash_otp_code(email: str, code: str, purpose: str) -> str:
    """Computes HMAC-SHA256 hash of the OTP tied to the email and purpose."""
    normalized_key = f"{email.strip().lower()}:{purpose.upper()}:{code.strip()}"
    return hmac.new(
        settings.SECRET_KEY.encode('utf-8'),
        normalized_key.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

async def create_and_store_otp(
    db: AsyncSession,
    email: str,
    purpose: str = "EMAIL_VERIFY"
) -> Tuple[str, int]:
    """
    Generates a 6-digit OTP, stores its HMAC hash in the database,
    and returns (plain_otp_code, expires_in_seconds).
    Applies strict rate limiting (max requests per 10 minutes).
    """
    normalized_email = email.strip().lower()
    normalized_purpose = purpose.upper()
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    # 1. Rate limiting check: max OTPs created in the last 10 minutes
    ten_minutes_ago = now_utc - timedelta(minutes=10)
    rate_stmt = select(func.count(OTPVerification.id)).where(
        and_(
            OTPVerification.email == normalized_email,
            OTPVerification.created_at >= ten_minutes_ago
        )
    )
    rate_res = await db.execute(rate_stmt)
    count = rate_res.scalar() or 0
    if count >= settings.OTP_RATE_LIMIT_PER_10_MIN:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification requests. Please wait a few minutes before trying again."
        )

    # 2. Invalidate any existing unconsumed OTPs for this email & purpose
    existing_stmt = select(OTPVerification).where(
        and_(
            OTPVerification.email == normalized_email,
            OTPVerification.purpose == normalized_purpose,
            OTPVerification.consumed_at.is_(None)
        )
    )
    existing_res = await db.execute(existing_stmt)
    for old_otp in existing_res.scalars().all():
        old_otp.consumed_at = now_utc

    # 3. Generate new 6-digit code
    code = generate_otp_code()
    code_hash = hash_otp_code(normalized_email, code, normalized_purpose)
    expires_at = now_utc + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    new_otp = OTPVerification(
        email=normalized_email,
        otp_code_hash=code_hash,
        purpose=normalized_purpose,
        expires_at=expires_at,
        attempts=0
    )
    db.add(new_otp)
    await db.commit()

    expires_in_seconds = settings.OTP_EXPIRE_MINUTES * 60
    return code, expires_in_seconds

async def verify_and_consume_otp(
    db: AsyncSession,
    email: str,
    code: str,
    purpose: str = "EMAIL_VERIFY"
) -> Tuple[bool, str]:
    """
    Verifies a 6-digit OTP against active records for the email and purpose.
    Marks the OTP as consumed upon successful verification.
    Limits invalid attempts to 5 before permanently invalidating the code.
    Returns (success: bool, message: str).
    """
    normalized_email = email.strip().lower()
    normalized_purpose = purpose.upper()
    cleaned_code = code.strip()
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    if len(cleaned_code) != 6 or not cleaned_code.isdigit():
        return False, "Invalid OTP format. Please enter a valid 6-digit code."

    # Find the most recent active OTP for this email and purpose
    stmt = (
        select(OTPVerification)
        .where(
            and_(
                OTPVerification.email == normalized_email,
                OTPVerification.purpose == normalized_purpose,
                OTPVerification.consumed_at.is_(None)
            )
        )
        .order_by(OTPVerification.created_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    otp_record = result.scalar_one_or_none()

    if not otp_record:
        return False, "No active verification code found for this email. Please request a new code."

    # Check expiration
    if otp_record.expires_at < now_utc:
        otp_record.consumed_at = now_utc
        await db.commit()
        return False, "Verification code has expired. Please request a new one."

    # Check attempt limit
    if otp_record.attempts >= 5:
        otp_record.consumed_at = now_utc
        await db.commit()
        return False, "Too many failed attempts. This code has been invalidated. Please request a new code."

    # Compare hashes securely using constant-time comparison
    expected_hash = hash_otp_code(normalized_email, cleaned_code, normalized_purpose)
    if not hmac.compare_digest(otp_record.otp_code_hash, expected_hash):
        otp_record.attempts += 1
        await db.commit()
        remaining = 5 - otp_record.attempts
        return False, f"Incorrect verification code. {remaining} attempt{'s' if remaining != 1 else ''} remaining."

    # Successfully verified -> consume OTP
    otp_record.consumed_at = now_utc
    await db.commit()
    return True, "Verification successful."
