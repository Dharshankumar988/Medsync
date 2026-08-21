import uuid
import enum
from datetime import date, datetime
from sqlalchemy import String, Integer, Float, ForeignKey, Text, Date, Boolean, Numeric, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base_class import Base
from app.models.mixins import UUIDMixin, TimestampMixin

class OrderStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    PACKED = "PACKED"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"
    RETURNED = "RETURNED"

class MedicineCategory(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "medicine_categories"
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

class Supplier(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "suppliers"
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_person: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    license_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    gst_number: Mapped[str | None] = mapped_column(String(100), nullable=True)

class Medicine(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "medicines"
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    generic_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    brand_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("medicine_categories.id"), index=True, nullable=False)
    manufacturer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    strength: Mapped[str | None] = mapped_column(String(100), nullable=True)
    dosage_form: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pack_size: Mapped[str | None] = mapped_column(String(100), nullable=True)
    price: Mapped[float | None] = mapped_column(Float, nullable=True)
    storage_requirements: Mapped[str | None] = mapped_column(String(255), nullable=True)
    prescription_required: Mapped[bool] = mapped_column(Boolean, default=False)
    controlled_drug: Mapped[bool] = mapped_column(Boolean, default=False)
    barcode: Mapped[str | None] = mapped_column(String(255), nullable=True)
    qr_code: Mapped[str | None] = mapped_column(String(255), nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

class MedicineInventory(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "medicine_inventory"
    pharmacy_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    medicine_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("medicines.id"), index=True, nullable=False)
    supplier_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("suppliers.id"), index=True, nullable=True)
    batch_number: Mapped[str] = mapped_column(String(100), nullable=False)
    manufacturing_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0)
    minimum_stock: Mapped[int] = mapped_column(Integer, default=10)
    maximum_stock: Mapped[int] = mapped_column(Integer, default=1000)
    unit_price: Mapped[float] = mapped_column(Float, default=0.0)
    purchase_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    selling_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    gst: Mapped[float | None] = mapped_column(Float, nullable=True)

class MedicineOrder(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "medicine_orders"
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    pharmacy_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    prescription_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("prescriptions.id"), index=True, nullable=True)
    status: Mapped[OrderStatus] = mapped_column(String(50), default=OrderStatus.PENDING, index=True)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    delivery_address: Mapped[str | None] = mapped_column(Text, nullable=True)

class MedicineOrderItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "medicine_order_items"
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("medicine_orders.id"), index=True, nullable=False)
    inventory_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("medicine_inventory.id"), index=True, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    price_at_purchase: Mapped[float] = mapped_column(Float, nullable=False)

class DeliveryTracking(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "delivery_tracking"
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("medicine_orders.id"), index=True, unique=True, nullable=False)
    tracking_number: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    current_status: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    delivery_partner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    estimated_delivery: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Simulation fields
    delivery_started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    delivery_completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    delivery_eta: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    delivery_progress: Mapped[int] = mapped_column(Integer, default=0)
    delivery_code_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    delivery_code_expiry: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    delivery_simulation: Mapped[str | None] = mapped_column(Text, nullable=True)
    driver_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    driver_avatar: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    vehicle_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    vehicle_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    delivery_speed: Mapped[int] = mapped_column(Integer, default=40)
    current_latitude: Mapped[float | None] = mapped_column(Numeric(10, 8), nullable=True)
    current_longitude: Mapped[float | None] = mapped_column(Numeric(11, 8), nullable=True)
    start_latitude: Mapped[float | None] = mapped_column(Numeric(10, 8), nullable=True)
    start_longitude: Mapped[float | None] = mapped_column(Numeric(11, 8), nullable=True)
    end_latitude: Mapped[float | None] = mapped_column(Numeric(10, 8), nullable=True)
    end_longitude: Mapped[float | None] = mapped_column(Numeric(11, 8), nullable=True)
