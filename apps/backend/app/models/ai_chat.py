import uuid
import enum
from sqlalchemy import String, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin

class AIChatRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class AIChatSession(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "ai_chat_sessions"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), default="New Conversation")
    is_doctor_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    
    messages = relationship("AIChatMessage", back_populates="session", cascade="all, delete-orphan")

class AIChatMessage(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "ai_chat_messages"
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ai_chat_sessions.id"), nullable=False)
    role: Mapped[AIChatRole] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Metadata for AI tracing
    model_used: Mapped[str | None] = mapped_column(String(100), nullable=True)
    inference_time_ms: Mapped[int | None] = mapped_column(nullable=True)
    
    session = relationship("AIChatSession", back_populates="messages")
