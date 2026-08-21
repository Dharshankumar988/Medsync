import uuid
from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import UserRole
from app.schemas.response import APIResponse
from app.schemas.session import AuthenticatedPrincipal
from app.schemas.appointment import (
    AppointmentCreate, AppointmentResponse, AppointmentListResponse,
    AppointmentStatusUpdate, AppointmentReschedule,
)
from app.services.appointment import AppointmentService

router = APIRouter()
require_patient = RoleChecker([UserRole.PATIENT])
require_doctor = RoleChecker([UserRole.DOCTOR])
require_patient_or_doctor = RoleChecker([UserRole.PATIENT, UserRole.DOCTOR])


@router.post("/book", response_model=APIResponse[AppointmentResponse], status_code=status.HTTP_201_CREATED)
async def book_appointment(
    req: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_patient),
):
    appointment = await AppointmentService.book_appointment(db, current_user.id, req)
    return APIResponse(message="Appointment booked", data=appointment)


@router.get("/", response_model=APIResponse[AppointmentListResponse])
async def list_appointments(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, alias="status"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    result = await AppointmentService.list_appointments(
        db,
        user_id=current_user.id,
        role=current_user.role,
        status_filter=status_filter,
        date_from=date_from,
        date_to=date_to,
        skip=skip,
        limit=limit,
    )
    return APIResponse(message="Appointments fetched", data=result)


@router.get("/{appointment_id}", response_model=APIResponse[AppointmentResponse])
async def get_appointment(
    appointment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
):
    result = await AppointmentService.get_appointment(
        db, appointment_id, current_user.id, current_user.role
    )
    return APIResponse(message="Appointment details", data=result)


@router.patch("/{appointment_id}/status", response_model=APIResponse[AppointmentResponse])
async def update_appointment_status(
    appointment_id: uuid.UUID,
    req: AppointmentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
):
    appointment = await AppointmentService.update_status(
        db,
        appointment_id=appointment_id,
        user_id=current_user.id,
        role=current_user.role,
        new_status=req.status,
        reason=req.reason,
    )
    return APIResponse(message=f"Appointment status updated to {req.status}", data=appointment)


@router.put("/{appointment_id}/reschedule", response_model=APIResponse[AppointmentResponse])
async def reschedule_appointment(
    appointment_id: uuid.UUID,
    req: AppointmentReschedule,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_patient_or_doctor),
):
    appointment = await AppointmentService.reschedule(
        db,
        appointment_id=appointment_id,
        user_id=current_user.id,
        new_date=req.appointment_date,
        new_start_time=req.start_time,
        new_end_time=req.end_time,
        reason=req.reason,
    )
    return APIResponse(message="Appointment rescheduled", data=appointment)
