import uuid
from typing import Optional
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import UserRole
from app.schemas.response import APIResponse
from app.schemas.session import AuthenticatedPrincipal
from app.schemas.consultation import ConsultationCreate, ConsultationResponse
from app.services.consultation_service import ConsultationService
from datetime import date

router = APIRouter()
require_doctor = RoleChecker([UserRole.DOCTOR])


class ConsultationUpdate(BaseModel):
    symptoms: Optional[str] = None
    observations: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment_plan: Optional[str] = None
    clinical_notes: Optional[str] = None
    follow_up_date: Optional[date] = None
    follow_up_notes: Optional[str] = None


class ConsultationCompleteRequest(BaseModel):
    diagnosis: Optional[str] = None
    treatment_plan: Optional[str] = None
    clinical_notes: Optional[str] = None
    follow_up_date: Optional[date] = None
    follow_up_notes: Optional[str] = None


@router.post("/", response_model=APIResponse[ConsultationResponse], status_code=status.HTTP_201_CREATED)
async def create_consultation(
    req: ConsultationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor),
):
    consultation = await ConsultationService.create_consultation(db, current_user.id, req)
    return APIResponse(message="Consultation created", data=consultation)


@router.get("/{consultation_id}", response_model=APIResponse[ConsultationResponse])
async def get_consultation(
    consultation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
):
    consultation = await ConsultationService.get_consultation(db, consultation_id)
    return APIResponse(message="Consultation details", data=consultation)


@router.get("/appointment/{appointment_id}", response_model=APIResponse[ConsultationResponse])
async def get_consultation_by_appointment(
    appointment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
):
    consultation = await ConsultationService.get_by_appointment(db, appointment_id)
    if not consultation:
        return APIResponse(message="No consultation found for this appointment", data=None)
    return APIResponse(message="Consultation details", data=consultation)


@router.patch("/{consultation_id}", response_model=APIResponse[ConsultationResponse])
async def update_consultation(
    consultation_id: uuid.UUID,
    req: ConsultationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor),
):
    update_data = req.model_dump(exclude_unset=True)
    consultation = await ConsultationService.update_consultation(
        db, consultation_id, current_user.id, update_data
    )
    return APIResponse(message="Consultation updated", data=consultation)


@router.patch("/{consultation_id}/complete", response_model=APIResponse[ConsultationResponse])
async def complete_consultation(
    consultation_id: uuid.UUID,
    req: ConsultationCompleteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor),
):
    consultation = await ConsultationService.complete_consultation(
        db,
        consultation_id=consultation_id,
        doctor_id=current_user.id,
        diagnosis=req.diagnosis,
        treatment_plan=req.treatment_plan,
        clinical_notes=req.clinical_notes,
        follow_up_date=req.follow_up_date,
        follow_up_notes=req.follow_up_notes,
    )
    return APIResponse(message="Consultation completed", data=consultation)
