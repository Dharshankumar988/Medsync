import uuid
import bcrypt
import os
import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

logger = logging.getLogger("medsync.security")

# Lazy-load cryptography (fails to build on Windows ARM64 without Rust toolchain)
try:
    from cryptography.fernet import Fernet
    _CRYPTO_AVAILABLE = True
except ImportError:
    Fernet = None
    _CRYPTO_AVAILABLE = False
    logger.warning("cryptography package not available — biometric encryption will be disabled.")

from app.models.security import PatientSecurityCredential, PatientBiometricProfile, PrescriptionDownloadAuthorization
from app.models.audit_log import AuditLog
from fastapi import HTTPException

# Security configuration
MAX_PIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15
AUTHORIZATION_EXPIRY_MINUTES = 10

# Initialize encryption key for biometric templates
ENCRYPTION_KEY = os.getenv("BIOMETRIC_ENCRYPTION_KEY")
if _CRYPTO_AVAILABLE:
    if not ENCRYPTION_KEY:
        raise ValueError("BIOMETRIC_ENCRYPTION_KEY environment variable is not set. Biometric encryption cannot proceed safely without a persistent key.")
    fernet = Fernet(ENCRYPTION_KEY.encode())
else:
    fernet = None

def hash_pin(pin: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pin.encode('utf-8'), salt).decode('utf-8')

def verify_pin(pin: str, hashed_pin: str) -> bool:
    return bcrypt.checkpw(pin.encode('utf-8'), hashed_pin.encode('utf-8'))

def encrypt_template(template: str) -> str:
    if fernet is None:
        raise HTTPException(status_code=503, detail="Biometric encryption is unavailable (cryptography package not installed).")
    return fernet.encrypt(template.encode('utf-8')).decode('utf-8')

def decrypt_template(encrypted_template: str) -> str:
    if fernet is None:
        raise HTTPException(status_code=503, detail="Biometric decryption is unavailable (cryptography package not installed).")
    return fernet.decrypt(encrypted_template.encode('utf-8')).decode('utf-8')

async def log_audit_event(db: AsyncSession, user_id: uuid.UUID, action: str, entity_type: str = None, entity_id: uuid.UUID = None, details: dict = None, ip_address: str = None):
    audit_log = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        ip_address=ip_address
    )
    db.add(audit_log)
    await db.commit()

async def enroll_patient_pin(db: AsyncSession, patient_id: uuid.UUID, pin: str):
    if len(pin) != 6 or not pin.isdigit():
        raise ValueError("PIN must be exactly 6 digits.")
        
    result = await db.execute(select(PatientSecurityCredential).where(PatientSecurityCredential.patient_id == patient_id))
    existing_cred = result.scalar_one_or_none()
    
    if existing_cred:
        existing_cred.authorization_pin_hash = hash_pin(pin)
        existing_cred.failed_attempts = 0
        existing_cred.locked_until = None
    else:
        new_cred = PatientSecurityCredential(
            patient_id=patient_id,
            authorization_pin_hash=hash_pin(pin)
        )
        db.add(new_cred)
    
    await db.commit()
    await log_audit_event(db, patient_id, "PIN_CREATED", "PatientSecurityCredential", patient_id)

async def validate_patient_pin(db: AsyncSession, patient_id: uuid.UUID, pin: str) -> bool:
    result = await db.execute(select(PatientSecurityCredential).where(PatientSecurityCredential.patient_id == patient_id))
    cred = result.scalar_one_or_none()
    
    if not cred:
        await log_audit_event(db, patient_id, "PIN_VERIFICATION_FAILURE", details={"reason": "No PIN enrolled"})
        return False
        
    if cred.locked_until and cred.locked_until > datetime.utcnow():
        await log_audit_event(db, patient_id, "PIN_VERIFICATION_FAILURE", details={"reason": "Account locked"})
        raise HTTPException(status_code=403, detail="Too many failed attempts. Try again later.")
        
    if verify_pin(pin, cred.authorization_pin_hash):
        if cred.failed_attempts > 0:
            cred.failed_attempts = 0
            cred.locked_until = None
            await db.commit()
        await log_audit_event(db, patient_id, "PIN_VERIFICATION_SUCCESS")
        return True
    else:
        cred.failed_attempts += 1
        if cred.failed_attempts >= MAX_PIN_ATTEMPTS:
            cred.locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
        await db.commit()
        await log_audit_event(db, patient_id, "PIN_VERIFICATION_FAILURE", details={"attempts": cred.failed_attempts})
        return False

async def get_security_status(db: AsyncSession, patient_id: uuid.UUID) -> str:
    """Check if patient has enrolled a PIN (face authentication removed)."""
    pin_result = await db.execute(select(PatientSecurityCredential).where(PatientSecurityCredential.patient_id == patient_id))
    pin_obj = pin_result.scalars().first()
    has_pin = pin_obj is not None and getattr(pin_obj, 'is_active', True)

    if has_pin:
        return "COMPLETED"
    else:
        return "NOT_STARTED"

async def create_download_authorization(db: AsyncSession, patient_id: uuid.UUID, prescription_id: uuid.UUID, password_verified: bool, pin_verified: bool, face_verified: bool) -> str:
    auth_ref = str(uuid.uuid4())
    auth = PrescriptionDownloadAuthorization(
        patient_id=patient_id,
        prescription_id=prescription_id,
        authorization_reference=auth_ref,
        expires_at=datetime.utcnow() + timedelta(minutes=AUTHORIZATION_EXPIRY_MINUTES),
        password_verified=password_verified,
        pin_verified=pin_verified,
        face_verified=face_verified
    )
    db.add(auth)
    await db.commit()
    await log_audit_event(db, patient_id, "PRESCRIPTION_DOWNLOAD_AUTHORIZED", "Prescription", prescription_id)
    return auth_ref

async def enroll_doctor_pin(db: AsyncSession, doctor_user_id: uuid.UUID, pin: str):
    """Enroll a doctor's authorization PIN for signing prescriptions."""
    if len(pin) != 6 or not pin.isdigit():
        raise ValueError("PIN must be exactly 6 digits.")
    
    from app.models.doctor import Doctor
    result = await db.execute(select(Doctor).where(Doctor.user_id == doctor_user_id))
    doctor = result.scalar_one_or_none()
    
    if not doctor:
        raise ValueError("Doctor profile not found.")
    
    doctor.security_pin_hash = hash_pin(pin)
    await db.commit()
    await log_audit_event(db, doctor_user_id, "DOCTOR_PIN_CREATED", "Doctor", doctor.id)

async def validate_doctor_pin(db: AsyncSession, doctor_user_id: uuid.UUID, pin: str) -> bool:
    """Validate a doctor's authorization PIN."""
    from app.models.doctor import Doctor
    result = await db.execute(select(Doctor).where(Doctor.user_id == doctor_user_id))
    doctor = result.scalar_one_or_none()
    
    if not doctor or not doctor.security_pin_hash:
        await log_audit_event(db, doctor_user_id, "DOCTOR_PIN_VERIFICATION_FAILURE", details={"reason": "No PIN enrolled"})
        return False
    
    if verify_pin(pin, doctor.security_pin_hash):
        await log_audit_event(db, doctor_user_id, "DOCTOR_PIN_VERIFICATION_SUCCESS")
        return True
    else:
        await log_audit_event(db, doctor_user_id, "DOCTOR_PIN_VERIFICATION_FAILURE")
        return False

async def get_doctor_security_status(db: AsyncSession, doctor_user_id: uuid.UUID) -> dict:
    """Check if doctor has enrolled a PIN."""
    from app.models.doctor import Doctor
    result = await db.execute(select(Doctor).where(Doctor.user_id == doctor_user_id))
    doctor = result.scalar_one_or_none()
    
    if not doctor:
        return {"has_pin": False, "error": "Doctor profile not found"}
    
    return {
        "has_pin": bool(doctor.security_pin_hash),
        "doctor_id": str(doctor.id)
    }

async def enroll_pharmacy_pin(db: AsyncSession, pharmacy_user_id: uuid.UUID, pin: str):
    """Enroll a pharmacy's authorization PIN."""
    if len(pin) != 6 or not pin.isdigit():
        raise ValueError("PIN must be exactly 6 digits.")
    
    from app.models.pharmacy import Pharmacy
    result = await db.execute(select(Pharmacy).where(Pharmacy.user_id == pharmacy_user_id))
    pharmacy = result.scalar_one_or_none()
    
    if not pharmacy:
        raise ValueError("Pharmacy profile not found.")
    
    pharmacy.security_pin_hash = hash_pin(pin)
    await db.commit()
    await log_audit_event(db, pharmacy_user_id, "PHARMACY_PIN_CREATED", "Pharmacy", pharmacy.id)

async def validate_pharmacy_pin(db: AsyncSession, pharmacy_user_id: uuid.UUID, pin: str) -> bool:
    """Validate a pharmacy's authorization PIN."""
    from app.models.pharmacy import Pharmacy
    result = await db.execute(select(Pharmacy).where(Pharmacy.user_id == pharmacy_user_id))
    pharmacy = result.scalar_one_or_none()
    
    if not pharmacy or not pharmacy.security_pin_hash:
        await log_audit_event(db, pharmacy_user_id, "PHARMACY_PIN_VERIFICATION_FAILURE", details={"reason": "No PIN enrolled"})
        return False
    
    if verify_pin(pin, pharmacy.security_pin_hash):
        await log_audit_event(db, pharmacy_user_id, "PHARMACY_PIN_VERIFICATION_SUCCESS")
        return True
    else:
        await log_audit_event(db, pharmacy_user_id, "PHARMACY_PIN_VERIFICATION_FAILURE")
        return False

async def get_pharmacy_security_status(db: AsyncSession, pharmacy_user_id: uuid.UUID) -> dict:
    """Check if pharmacy has enrolled a PIN."""
    from app.models.pharmacy import Pharmacy
    result = await db.execute(select(Pharmacy).where(Pharmacy.user_id == pharmacy_user_id))
    pharmacy = result.scalar_one_or_none()
    
    if not pharmacy:
        return {"has_pin": False, "error": "Pharmacy profile not found"}
    
    return {
        "has_pin": bool(pharmacy.security_pin_hash),
        "pharmacy_id": str(pharmacy.id)
    }
