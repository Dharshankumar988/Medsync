from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import User, UserRole
from app.schemas.response import APIResponse
from app.schemas.pharmacy_system import MedicineOrderCreate, MedicineOrderResponse
from app.services.pharmacy_system import PharmacyService

router = APIRouter()
require_patient = RoleChecker([UserRole.PATIENT])

@router.post("/", response_model=APIResponse[MedicineOrderResponse], status_code=status.HTTP_201_CREATED)
async def place_order(
    req: MedicineOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_patient)
):
    order = await PharmacyService.place_order(db, current_user.id, req)
    return APIResponse(message="Order placed successfully", data=order)
