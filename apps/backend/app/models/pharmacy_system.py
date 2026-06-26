import uuid
import enum
from datetime import date
from sqlalchemy import String, Integer, Float, ForeignKey, Text, Date
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

class Medicine(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "medicines"
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("medicine_categories.id"), nullable=False)
    manufacturer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    dosage_form: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

class MedicineInventory(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "medicine_inventory"
    pharmacy_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    medicine_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("medicines.id"), nullable=False)
    batch_number: Mapped[str] = mapped_column(String(100), nullable=False)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0)
    unit_price: Mapped[float] = mapped_column(Float, default=0.0)

class MedicineOrder(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "medicine_orders"
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    pharmacy_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    prescription_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("prescriptions.id"), nullable=True)
    status: Mapped[OrderStatus] = mapped_column(String(50), default=OrderStatus.PENDING)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    delivery_address: Mapped[str | None] = mapped_column(Text, nullable=True)

class MedicineOrderItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "medicine_order_items"
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("medicine_orders.id"), nullable=False)
    inventory_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("medicine_inventory.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    price_at_purchase: Mapped[float] = mapped_column(Float, nullable=False)

class DeliveryTracking(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "delivery_tracking"
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("medicine_orders.id"), unique=True, nullable=False)
    tracking_number: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    current_status: Mapped[str] = mapped_column(String(100), nullable=False)
    delivery_partner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    estimated_delivery: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
