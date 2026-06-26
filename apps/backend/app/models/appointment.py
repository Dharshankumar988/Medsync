import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, Text, Boolean, Date, Time
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

class DoctorAvailability(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "doctor_availability"
    doctor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False) # 0=Mon, 6=Sun
    start_time: Mapped[Time] = mapped_column(Time, nullable=False)
    end_time: Mapped[Time] = mapped_column(Time, nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)

class Appointment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "appointments"
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    doctor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    appointment_date: Mapped[Date] = mapped_column(Date, nullable=False)
    start_time: Mapped[Time] = mapped_column(Time, nullable=False)
    end_time: Mapped[Time] = mapped_column(Time, nullable=False)
    status: Mapped[AppointmentStatus] = mapped_column(String(50), default=AppointmentStatus.PENDING)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

class AppointmentStatusHistory(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "appointment_status_history"
    appointment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("appointments.id"), nullable=False)
    status: Mapped[AppointmentStatus] = mapped_column(String(50), nullable=False)
    changed_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
