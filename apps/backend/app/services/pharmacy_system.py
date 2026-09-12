from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.repositories.pharmacy_system import order_repo, inventory_repo
from app.schemas.pharmacy_system import MedicineOrderCreate
from app.models.pharmacy_system import OrderStatus

class PharmacyService:
    @staticmethod
    async def place_order(db: AsyncSession, patient_id: uuid.UUID, req: MedicineOrderCreate):
        from sqlalchemy import select
        from app.models.pharmacy_system import MedicineOrderItem, MedicineInventory
        
        total_amount = 0.0
        inventory_ids = [item.inventory_id for item in req.items]
        
        if inventory_ids:
            stmt = select(MedicineInventory).where(MedicineInventory.id.in_(inventory_ids))
            res = await db.execute(stmt)
            inventories = {inv.id: inv for inv in res.scalars().all()}
        else:
            inventories = {}
            
        for item in req.items:
            inv = inventories.get(item.inventory_id)
            if inv:
                if item.quantity > inv.stock_quantity:
                    from fastapi import HTTPException
                    raise HTTPException(status_code=400, detail=f"Cannot order {item.quantity}. Only {inv.stock_quantity} in stock for {inv.batch_number}.")
                total_amount += (inv.selling_price or inv.unit_price) * item.quantity
        
        order_in = {
            "patient_id": patient_id,
            "pharmacy_id": req.pharmacy_id,
            "prescription_id": req.prescription_id,
            "delivery_address": req.delivery_address,
            "status": OrderStatus.PENDING,
            "total_amount": total_amount
        }
        order = await order_repo.create(db, obj_in=order_in)
        
        for item in req.items:
            inv = inventories.get(item.inventory_id)
            if inv:
                order_item = MedicineOrderItem(
                    order_id=order.id,
                    inventory_id=item.inventory_id,
                    quantity=item.quantity,
                    price_at_purchase=inv.selling_price or inv.unit_price
                )
                db.add(order_item)
                
        await db.commit()
        return order
