import uuid
from sqlalchemy import String, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin

class SystemSetting(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "system_settings"
    
    key: Mapped[str] = mapped_column(String(50), primary_key=True)
    value_bool: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    value_str: Mapped[str | None] = mapped_column(String(255), nullable=True)
    value_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
