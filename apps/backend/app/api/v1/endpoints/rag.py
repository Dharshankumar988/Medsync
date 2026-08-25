from typing import Any, List, Dict
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user
from app.schemas.session import AuthenticatedPrincipal
from app.models.user import User
from app.models.rag import KnowledgeDocument
from app.services.rag_service import rag_service
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class QueryRequest(BaseModel):
    query: str

class DocumentResponse(BaseModel):
    id: uuid.UUID
    title: str
    status: str
    created_at: datetime
    error_message: str | None = None

@router.get("/documents", response_model=List[DocumentResponse])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
) -> Any:
    if current_user.role.upper() != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can view knowledge documents")
        
    result = await db.execute(select(KnowledgeDocument))
    docs = result.scalars().all()
    return docs

@router.post("/documents", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
) -> Any:
    if current_user.role.upper() != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can upload documents")
    
    doc = await rag_service.ingest_document(db, file, current_user)
    return doc

@router.delete("/documents/{id}")
async def delete_document(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
) -> Any:
    if current_user.role.upper() != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can delete documents")
        
    result = await db.execute(select(KnowledgeDocument).where(KnowledgeDocument.id == id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    await db.delete(doc)
    await db.commit()
    return {"message": "Document and associated chunks deleted successfully"}

@router.post("/query")
async def query_knowledge_base(
    req: QueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
) -> Any:
    if current_user.role.upper() != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can query the knowledge base")
        
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
        
    result = await rag_service.query(db, req.query, current_user)
    return result
