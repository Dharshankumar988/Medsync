import uuid
from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime
from app.models.pharmacy_system import OrderStatus

class MedicineCreate(BaseModel):
    name: str
    category_id: uuid.UUID
    manufacturer: Optional[str] = None
    dosage_form: Optional[str] = None
    description: Optional[str] = None

class MedicineInventoryCreate(BaseModel):
    medicine_id: uuid.UUID
    batch_number: str
    expiry_date: date
    stock_quantity: int
    unit_price: float

class OrderItemCreate(BaseModel):
    inventory_id: uuid.UUID
    quantity: int

class MedicineOrderCreate(BaseModel):
    pharmacy_id: uuid.UUID
    prescription_id: Optional[uuid.UUID] = None
    delivery_address: str
    items: List[OrderItemCreate]

class MedicineOrderResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    pharmacy_id: uuid.UUID
    status: OrderStatus
    total_amount: float
    created_at: datetime
    model_config = {"from_attributes": True}
