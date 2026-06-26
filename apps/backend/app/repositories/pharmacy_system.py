from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from typing import List
from app.repositories.base import BaseRepository
from app.models.pharmacy_system import MedicineOrder, MedicineInventory

class MedicineOrderRepository(BaseRepository[MedicineOrder, dict, dict]):
    async def get_by_pharmacy(self, db: AsyncSession, pharmacy_id: uuid.UUID) -> List[MedicineOrder]:
        result = await db.execute(select(MedicineOrder).filter(MedicineOrder.pharmacy_id == pharmacy_id))
        return list(result.scalars().all())

order_repo = MedicineOrderRepository(MedicineOrder)

class InventoryRepository(BaseRepository[MedicineInventory, dict, dict]):
    pass

inventory_repo = InventoryRepository(MedicineInventory)
