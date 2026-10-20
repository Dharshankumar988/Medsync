import uuid
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin


class DoctorPharmacyAffiliation(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "doctor_pharmacy_affiliations"

    doctor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    pharmacy_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    clinic_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False)

    doctor_user = relationship("User", foreign_keys=[doctor_id])
    pharmacy_user = relationship("User", foreign_keys=[pharmacy_id])
