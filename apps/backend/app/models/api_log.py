import uuid
from sqlalchemy import String, Integer, ForeignKey, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin

class ApiRequestLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "api_request_logs"
    
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    endpoint: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    method: Mapped[str] = mapped_column(String(10), nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    execution_time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    request_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
