from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import User, UserRole
from app.schemas.response import APIResponse
from app.schemas.prescription import PrescriptionCreate, PrescriptionResponse
from app.services.prescription import PrescriptionService

router = APIRouter()
require_doctor = RoleChecker([UserRole.DOCTOR])

@router.post("/", response_model=APIResponse[PrescriptionResponse], status_code=status.HTTP_201_CREATED)
async def create_prescription(
    req: PrescriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    rx = await PrescriptionService.create_prescription(db, current_user.id, req)
    return APIResponse(message="Prescription finalized", data=rx)
