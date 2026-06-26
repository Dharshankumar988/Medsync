from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.repositories.pharmacy_system import order_repo, inventory_repo
from app.schemas.pharmacy_system import MedicineOrderCreate
from app.models.pharmacy_system import OrderStatus

class PharmacyService:
    @staticmethod
    async def place_order(db: AsyncSession, patient_id: uuid.UUID, req: MedicineOrderCreate):
        total_amount = 0.0
        # In a real app, calculate total_amount by fetching unit prices from inventory_repo
        
        order_in = {
            "patient_id": patient_id,
            "pharmacy_id": req.pharmacy_id,
            "prescription_id": req.prescription_id,
            "delivery_address": req.delivery_address,
            "status": OrderStatus.PENDING,
            "total_amount": total_amount
        }
        order = await order_repo.create(db, obj_in=order_in)
        # We would also create MedicineOrderItem records here
        
        return order
