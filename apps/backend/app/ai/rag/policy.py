from typing import Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, cast
from sqlalchemy.dialects.postgresql import JSONB

from app.models.rag import KnowledgeDocument
from app.models.user import UserRole
import uuid

class RAGPolicyEngine:
    """
    Enforces role-based access control (RBAC) and tenancy boundaries for RAG retrieval.
    This guarantees that the LLM is not used as an authorization layer.
    """

    @staticmethod
    async def get_retrieval_filters(
        db: AsyncSession, 
        user_id: uuid.UUID, 
        role: str, 
        scope_id: Optional[uuid.UUID] = None
    ) -> List[Any]:
        """
        Returns SQLAlchemy filter conditions based on the user's role and authorization.
        """
        role = role.lower()
        filters = [KnowledgeDocument.status == "READY"]

        if role == "patient":
            # Patient can only retrieve their own documents
            filters.append(
                and_(
                    KnowledgeDocument.owner_type == "patient",
                    KnowledgeDocument.owner_id == user_id
                )
            )

        elif role == "pharmacy":
            # Pharmacy can retrieve their own inventory/docs, plus general public/internal medicine info
            pharmacy_id = scope_id or user_id
            filters.append(
                or_(
                    and_(
                        KnowledgeDocument.owner_type == "pharmacy",
                        KnowledgeDocument.owner_id == pharmacy_id
                    ),
                    and_(
                        KnowledgeDocument.owner_type == "medicine",
                        KnowledgeDocument.visibility.in_(["public", "internal"])
                    )
                )
            )

        elif role == "doctor":
            # Doctor can retrieve authorized patients' documents and medicine info
            # We fetch authorized patients via PermissionService
            from app.services.permission import PermissionService
            authorized_patients = await PermissionService.get_authorized_patients_for_doctor(db, user_id)
            patient_ids = [p.id for p in authorized_patients] if authorized_patients else []
            
            # Optionally filter to a specific patient if scope_id is provided
            if scope_id and scope_id in patient_ids:
                patient_ids = [scope_id]
            elif scope_id:
                # Doctor requested a patient they don't have access to
                patient_ids = []

            filters.append(
                or_(
                    and_(
                        KnowledgeDocument.owner_type == "patient",
                        KnowledgeDocument.owner_id.in_(patient_ids)
                    ),
                    and_(
                        KnowledgeDocument.owner_type == "medicine",
                        KnowledgeDocument.visibility.in_(["public", "internal"])
                    )
                )
            )

        elif role == "admin":
            # Admin can retrieve system docs, but explicitly excludes highly_sensitive secrets
            # Admin AI uses structured tools for specific DB objects, RAG is for docs
            filters.append(
                and_(
                    KnowledgeDocument.owner_type.in_(["system", "policy", "guideline"]),
                    KnowledgeDocument.classification != "highly_sensitive"
                )
            )

        else:
            # Fallback: No access
            filters.append(KnowledgeDocument.id == uuid.uuid4()) # Unmatchable condition

        return filters
