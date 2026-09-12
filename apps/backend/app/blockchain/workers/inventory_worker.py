import logging
import datetime
from sqlalchemy.future import select
from app.database.session import AsyncSessionLocal
from app.models.pharmacy_system import PharmacyRestockOrder, MedicineInventory

logger = logging.getLogger("inventory.worker")

async def process_restock_orders():
    """
    Checks for pending restock orders whose 2-minute expected delivery timer has passed,
    marks them as DELIVERED, and safely increments inventory stock.
    """
    async with AsyncSessionLocal() as db:
        try:
            # Find all pending restock orders that should be delivered by now
            now = datetime.datetime.now()
            query = select(PharmacyRestockOrder).where(
                PharmacyRestockOrder.status == "PENDING",
                PharmacyRestockOrder.expected_delivery <= now
            )
            result = await db.execute(query)
            pending_orders = result.scalars().all()
            
            for order in pending_orders:
                logger.info(f"Fulfilling restock order {order.id} for pharmacy {order.pharmacy_id}")
                
                # Check if inventory item already exists
                inv_query = select(MedicineInventory).where(
                    MedicineInventory.pharmacy_id == order.pharmacy_id,
                    MedicineInventory.medicine_id == order.medicine_id
                )
                inv_result = await db.execute(inv_query)
                inv = inv_result.scalar_one_or_none()
                
                if inv:
                    # Update stock
                    inv.stock_quantity += order.quantity
                else:
                    # Create new inventory item
                    import uuid
                    # Usually we would need batch and expiry, let's set some defaults
                    new_inv = MedicineInventory(
                        pharmacy_id=order.pharmacy_id,
                        medicine_id=order.medicine_id,
                        batch_number=str(uuid.uuid4())[:8].upper(),
                        manufacturing_date=datetime.date.today(),
                        expiry_date=datetime.date.today() + datetime.timedelta(days=365*2), # 2 years expiry default
                        stock_quantity=order.quantity,
                        unit_price=10.0 # Default fallback
                    )
                    db.add(new_inv)
                
                # Mark as DELIVERED
                order.status = "DELIVERED"
                
            await db.commit()
            
        except Exception as e:
            logger.error(f"Error processing restock orders: {e}")
            await db.rollback()
