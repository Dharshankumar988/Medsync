import uuid
from sqlalchemy import Column, String, Integer, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.models.mixins import TimestampMixin
from app.database.base_class import Base

class KnowledgeDocument(Base, TimestampMixin):
    __tablename__ = "knowledge_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    source = Column(String(255), nullable=True)
    file_name = Column(String(255), nullable=False)
    storage_path = Column(String(500), nullable=False)
    mime_type = Column(String(100), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    status = Column(String(50), index=True, nullable=False, default="UPLOADING") # UPLOADING, PROCESSING, READY, FAILED
    error_message = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    owner_type = Column(String(50), nullable=False, default='system')
    owner_id = Column(UUID(as_uuid=True), nullable=True)
    visibility = Column(String(50), nullable=False, default='internal')
    classification = Column(String(50), nullable=False, default='internal')
    allowed_roles = Column(JSON, nullable=False, default=[])

    chunks = relationship("KnowledgeChunk", back_populates="document", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])


class KnowledgeChunk(Base, TimestampMixin):
    __tablename__ = "knowledge_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("knowledge_documents.id"), index=True, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    # Using sentence-transformers/all-MiniLM-L6-v2 which has dimension 384
    embedding = Column(Vector(384))
    token_count = Column(Integer, nullable=True)
    metadata_json = Column(JSON, nullable=True)

    document = relationship("KnowledgeDocument", back_populates="chunks")
