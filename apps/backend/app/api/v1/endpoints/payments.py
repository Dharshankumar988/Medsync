from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.response import APIResponse
from app.schemas.payment import PaymentCreate, PaymentResponse
from app.services.payment import PaymentService

router = APIRouter()

@router.post("/process")
async def process_payment(
    req: PaymentCreate,
    current_user: User = Depends(get_current_user)
):
    result = await PaymentService.process_payment(req.method.value, req.amount)
    return APIResponse(message="Payment processed", data=result)
