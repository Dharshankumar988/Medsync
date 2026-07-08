from fastapi import APIRouter, Depends
from app.dependencies.auth import get_current_user
from app.schemas.response import APIResponse
from app.schemas.payment import PaymentCreate, PaymentResponse
from app.schemas.session import AuthenticatedPrincipal
from app.services.payment import PaymentService

router = APIRouter()

@router.post("/process")
async def process_payment(
    req: PaymentCreate,
    current_user: AuthenticatedPrincipal = Depends(get_current_user)
):
    result = await PaymentService.process_payment(req.method.value, req.amount)
    return APIResponse(message="Payment processed", data=result)
