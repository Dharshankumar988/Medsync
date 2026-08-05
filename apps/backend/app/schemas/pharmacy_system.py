import uuid
from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime
from app.models.pharmacy_system import OrderStatus

class SupplierCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    license_number: Optional[str] = None
    gst_number: Optional[str] = None

class SupplierResponse(SupplierCreate):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

class MedicineCreate(BaseModel):
    name: str
    generic_name: Optional[str] = None
    brand_name: Optional[str] = None
    category_id: uuid.UUID
    manufacturer: Optional[str] = None
    strength: Optional[str] = None
    dosage_form: Optional[str] = None
    pack_size: Optional[str] = None
    price: Optional[float] = None
    storage_requirements: Optional[str] = None
    prescription_required: bool = False
    controlled_drug: bool = False
    barcode: Optional[str] = None
    qr_code: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None

class MedicineResponse(MedicineCreate):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

class MedicineInventoryCreate(BaseModel):
    medicine_id: uuid.UUID
    supplier_id: Optional[uuid.UUID] = None
    batch_number: str
    manufacturing_date: Optional[date] = None
    expiry_date: date
    stock_quantity: int
    minimum_stock: int = 10
    maximum_stock: int = 1000
    unit_price: float
    purchase_price: Optional[float] = None
    selling_price: Optional[float] = None
    gst: Optional[float] = None

class MedicineInventoryResponse(MedicineInventoryCreate):
    id: uuid.UUID
    pharmacy_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

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
