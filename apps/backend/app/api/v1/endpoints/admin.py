from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import User, UserRole
from app.schemas.response import APIResponse

router = APIRouter()
require_admin = RoleChecker([UserRole.ADMIN])

@router.post("/verifications/{request_id}/approve", response_model=APIResponse[dict])
async def approve_verification(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    # In a full implementation, call VerificationService to update VerificationRequest and User status
    return APIResponse(message="Approved successfully", data={"request_id": request_id})
