import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, Text, Boolean, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin, SoftDeleteMixin

class FileType(str, enum.Enum):
    MRI = "MRI"
    CT_SCAN = "CT_SCAN"
    X_RAY = "X_RAY"
    ULTRASOUND = "ULTRASOUND"
    BLOOD_REPORT = "BLOOD_REPORT"
    ECG = "ECG"
    LAB_REPORT = "LAB_REPORT"
    PRESCRIPTION = "PRESCRIPTION"
    DICOM = "DICOM"
    PDF = "PDF"
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"

class MedicalRecordCategory(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "medical_record_categories"
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)

class MedicalRecordTag(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "medical_record_tags"
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

class MedicalRecord(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "medical_records"
    
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    category_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("medical_record_categories.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    
    versions = relationship("MedicalRecordVersion", back_populates="record", cascade="all, delete-orphan")
    permissions = relationship("RecordPermission", back_populates="record", cascade="all, delete-orphan")

class MedicalRecordTagMapping(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "medical_record_tag_mappings"
    record_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("medical_records.id"), nullable=False)
    tag_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("medical_record_tags.id"), nullable=False)

class MedicalRecordVersion(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "medical_record_versions"
    
    record_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("medical_records.id"), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    ipfs_cid: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    file_type: Mapped[FileType] = mapped_column(String(50), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    change_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    blockchain_tx_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    record = relationship("MedicalRecord", back_populates="versions")
    doctor_notes = relationship("DoctorNote", back_populates="version", cascade="all, delete-orphan")

class RecordPermission(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "record_permissions"
    
    record_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("medical_records.id"), nullable=False)
    granted_to: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    granted_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    access_level: Mapped[str] = mapped_column(String(50), default="READ")
    expires_at: Mapped[datetime | None] = mapped_column(nullable=True)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    
    record = relationship("MedicalRecord", back_populates="permissions")

class ConsentHistory(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "consent_history"
    
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    doctor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)  # GRANTED, REVOKED
    blockchain_tx_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)

class DoctorNote(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "doctor_notes"
    
    version_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("medical_record_versions.id"), nullable=False)
    doctor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    note_text: Mapped[str] = mapped_column(Text, nullable=False)
    
    version = relationship("MedicalRecordVersion", back_populates="doctor_notes")

class OCRResult(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "ocr_results"
    
    version_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("medical_record_versions.id"), unique=True, nullable=False)
    extracted_text: Mapped[str] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, nullable=True)
    detected_fields: Mapped[dict] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="PENDING")

class AIAnalysis(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "ai_analyses"
    
    version_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("medical_record_versions.id"), nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    analysis_status: Mapped[str] = mapped_column(String(50), default="PENDING")
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    processing_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

class FileMetadata(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "file_metadata"
    
    version_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("medical_record_versions.id"), unique=True, nullable=False)
    supabase_storage_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=True)
