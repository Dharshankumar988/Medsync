import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, Text, Boolean, Date, Time, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin

class AppointmentStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"
    RESCHEDULED = "RESCHEDULED"
    REJECTED = "REJECTED"

class DoctorAvailability(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "doctor_availability"
    doctor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False) # 0=Mon, 6=Sun
    start_time: Mapped[Time] = mapped_column(Time, nullable=False, index=True)
    end_time: Mapped[Time] = mapped_column(Time, nullable=False, index=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)

class Appointment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "appointments"
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    doctor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    appointment_date: Mapped[Date] = mapped_column(Date, index=True, nullable=False)
    start_time: Mapped[Time] = mapped_column(Time, nullable=False, index=True)
    end_time: Mapped[Time] = mapped_column(Time, nullable=False, index=True)
    status: Mapped[AppointmentStatus] = mapped_column(String(50), index=True, default=AppointmentStatus.PENDING)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # New fields for location and cancellation tracking
    location_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("doctor_locations.id"), index=True, nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

class AppointmentStatusHistory(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "appointment_status_history"
    appointment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("appointments.id"), index=True, nullable=False)
    status: Mapped[AppointmentStatus] = mapped_column(String(50), nullable=False, index=True)
    changed_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
