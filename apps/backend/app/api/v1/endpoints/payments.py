from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user
from app.schemas.response import APIResponse
from app.schemas.payment import PaymentCreate, PaymentResponse
from app.schemas.session import AuthenticatedPrincipal
from app.services.payment import PaymentService
from app.models.pharmacy_system import MedicineOrder, OrderStatus
from sqlalchemy import select

router = APIRouter()

@router.post("/process")
async def process_payment(
    req: PaymentCreate,
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(MedicineOrder).where(MedicineOrder.id == req.order_id).with_for_update()
    result = await db.execute(stmt)
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to pay for this order")
        
    if order.status != OrderStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Cannot process payment for order in status {order.status}")
        
    payment_result = await PaymentService.process_payment(req.method.value, req.amount)
    
    if payment_result["status"] == "success":
        order.status = OrderStatus.PROCESSING
        await db.commit()
        return APIResponse(message="Payment processed and order updated", data=payment_result)
    else:
        raise HTTPException(status_code=400, detail="Payment failed")
