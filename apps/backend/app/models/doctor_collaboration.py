import uuid
import enum
from sqlalchemy import String, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin


class RecordRequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ReferralStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    COMPLETED = "COMPLETED"


class RecordRequest(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "record_requests"

    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    requesting_doctor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    target_doctor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    record_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("medical_records.id"), index=True, nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default=RecordRequestStatus.PENDING, index=True)

    patient = relationship("User", foreign_keys=[patient_id])
    requesting_doctor = relationship("User", foreign_keys=[requesting_doctor_id])
    target_doctor = relationship("User", foreign_keys=[target_doctor_id])
    record = relationship("MedicalRecord")


class DoctorReferral(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "doctor_referrals"

    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    referring_doctor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    referred_to_doctor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    specialization: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default=ReferralStatus.PENDING, index=True)

    patient = relationship("User", foreign_keys=[patient_id])
    referring_doctor = relationship("User", foreign_keys=[referring_doctor_id])
    referred_to_doctor = relationship("User", foreign_keys=[referred_to_doctor_id])
