from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import UserRole
from app.schemas.response import APIResponse
from app.schemas.session import AuthenticatedPrincipal
from app.services.verification import VerificationService
import uuid

router = APIRouter()
require_admin = RoleChecker([UserRole.ADMIN])

@router.post("/verifications/{request_id}/approve", response_model=APIResponse[dict])
async def approve_verification(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedPrincipal = Depends(require_admin)
):
    req = await VerificationService.approve_request(db, request_id, current_admin.id)
    return APIResponse(message="Approved successfully", data={"request_id": str(req.id)})
