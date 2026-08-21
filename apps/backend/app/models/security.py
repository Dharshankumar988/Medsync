import uuid
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, Boolean, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin

class PatientSecurityCredential(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "patient_security_credentials"
    
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, unique=True, nullable=False)
    authorization_pin_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class PatientBiometricProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "patient_biometric_profiles"
    
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, unique=True, nullable=False)
    encrypted_template: Mapped[str] = mapped_column(Text, nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    model_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    embedding_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    enrollment_status: Mapped[str] = mapped_column(String(50), default="COMPLETED")

class PrescriptionDownloadAuthorization(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "prescription_download_authorizations"
    
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    prescription_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("prescriptions.id"), index=True, nullable=False)
    authorization_reference: Mapped[str] = mapped_column(String(255), index=True, unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    password_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    pin_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    face_verified: Mapped[bool] = mapped_column(Boolean, default=False)
