from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import UserRole
from app.schemas.response import APIResponse
from app.schemas.session import AuthenticatedPrincipal
from app.schemas.prescription import PrescriptionCreate, PrescriptionResponse
from app.services.prescription import PrescriptionService

router = APIRouter()
require_doctor = RoleChecker([UserRole.DOCTOR])

@router.post("/", response_model=APIResponse[PrescriptionResponse], status_code=status.HTTP_201_CREATED)
async def create_prescription(
    req: PrescriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor)
):
    rx = await PrescriptionService.create_prescription(db, current_user.id, req)
    return APIResponse(message="Prescription finalized", data=rx)

@router.get("/{id}/download", response_model=APIResponse[str])
async def download_prescription(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user)
):
    from sqlalchemy import select
    from app.models.prescription import Prescription
    from app.services.storage import StorageService
    from fastapi import HTTPException
    
    stmt = select(Prescription).where(Prescription.id == id)
    result = await db.execute(stmt)
    rx = result.scalar_one_or_none()
    
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
        
    if rx.patient_id != current_user.id and rx.doctor_id != current_user.id and current_user.role not in [UserRole.ADMIN, UserRole.PHARMACY]:
        raise HTTPException(status_code=403, detail="Unauthorized to download this prescription")
        
    if not rx.pdf_url:
        raise HTTPException(status_code=404, detail="PDF not generated for this prescription")
        
    # Generate signed URL valid for 1 hour
    signed_url = await StorageService.create_signed_download_url(rx.pdf_url, expires_in=3600)
    
    return APIResponse(message="Download URL generated", data=signed_url)
