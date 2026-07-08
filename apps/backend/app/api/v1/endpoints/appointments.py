from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import UserRole
from app.schemas.response import APIResponse
from app.schemas.session import AuthenticatedPrincipal
from app.schemas.appointment import AppointmentCreate, AppointmentResponse
from app.services.appointment import AppointmentService

router = APIRouter()
require_patient = RoleChecker([UserRole.PATIENT])

@router.post("/book", response_model=APIResponse[AppointmentResponse], status_code=status.HTTP_201_CREATED)
async def book_appointment(
    req: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_patient)
):
    appointment = await AppointmentService.book_appointment(db, current_user.id, req)
    return APIResponse(message="Appointment booked", data=appointment)
