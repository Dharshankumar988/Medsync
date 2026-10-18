from sqlalchemy import String, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional
from datetime import datetime
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin

class OTPVerification(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "otp_verifications"

    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    otp_code_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    purpose: Mapped[str] = mapped_column(String(50), nullable=False, default="EMAIL_VERIFY")
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    consumed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
