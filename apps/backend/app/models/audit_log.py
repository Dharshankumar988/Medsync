import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import JSON
from app.database.base_class import Base
from app.models.mixins import UUIDMixin


class AuditLog(Base, UUIDMixin):
    __tablename__ = "audit_logs"

    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    details: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB, 'postgresql'), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)

class AdminAIAuditLog(Base, UUIDMixin):
    __tablename__ = "admin_ai_audit_logs"

    admin_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    session_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    action: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    resource_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    resource_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    fields_accessed: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB, 'postgresql'), nullable=True)
    details: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
