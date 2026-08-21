import uuid
import bcrypt
import os
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from cryptography.fernet import Fernet
from app.models.security import PatientSecurityCredential, PatientBiometricProfile, PrescriptionDownloadAuthorization
from app.models.audit_log import AuditLog
from fastapi import HTTPException

# Security configuration
MAX_PIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15
AUTHORIZATION_EXPIRY_MINUTES = 10

# Initialize encryption key for biometric templates
ENCRYPTION_KEY = os.getenv("BIOMETRIC_ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    ENCRYPTION_KEY = Fernet.generate_key().decode()
fernet = Fernet(ENCRYPTION_KEY.encode())

def hash_pin(pin: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pin.encode('utf-8'), salt).decode('utf-8')

def verify_pin(pin: str, hashed_pin: str) -> bool:
    return bcrypt.checkpw(pin.encode('utf-8'), hashed_pin.encode('utf-8'))

def encrypt_template(template: str) -> str:
    return fernet.encrypt(template.encode('utf-8')).decode('utf-8')

def decrypt_template(encrypted_template: str) -> str:
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
    pin_result = await db.execute(select(PatientSecurityCredential).where(PatientSecurityCredential.patient_id == patient_id))
    has_pin = pin_result.scalar_one_or_none() is not None
    
    face_result = await db.execute(select(PatientBiometricProfile).where(PatientBiometricProfile.patient_id == patient_id))
    has_face = face_result.scalar_one_or_none() is not None
    
    if has_pin and has_face:
        return "COMPLETED"
    elif has_pin:
        return "PIN_CREATED"
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
