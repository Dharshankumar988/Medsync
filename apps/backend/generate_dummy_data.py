import asyncio
import uuid
import sys
import os

# Add backend dir to python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from datetime import datetime, date, timedelta
from decimal import Decimal

from app.database.session import AsyncSessionLocal
from app.models.user import User, UserRole, UserStatus
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.admin import Admin
from app.models.hospital import Hospital
from app.models.pharmacy import Pharmacy
from app.models.pharmacy_system import Medicine, MedicineCategory, MedicineInventory, Supplier, MedicineOrder, MedicineOrderItem, OrderStatus
from app.models.blockchain import SyncEntityType, SyncActionType
from app.services.blockchain_sync import BlockchainSyncService

def get_uuid(index: int, prefix: str) -> str:
    h = f"{prefix}{index}".ljust(32, '0').encode('utf-8').hex()[:32]
    return f"{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"

async def seed_users():
    async with AsyncSessionLocal() as db:
        print("Starting dummy data generation...")
        
        # 1. ADMIN
        admin_email = "admin@demo.com"
        admin_id = uuid.UUID(get_uuid(1, "adm"))
        existing_admin = (await db.execute(select(User).where(User.email == admin_email))).scalar_one_or_none()
        if not existing_admin:
            print(f"Creating Admin: {admin_email}")
            user = User(
                id=admin_id, email=admin_email, password_hash="supabase-managed-account",
                role=UserRole.ADMIN, status=UserStatus.ACTIVE, is_verified=True
            )
            db.add(user)
            admin = Admin(id=admin_id, user_id=admin_id, full_name="System Admin", department="IT")
            db.add(admin)
        else:
            print("Admin exists")

        # 2. DOCTOR & HOSPITAL
        hosp_user_id = uuid.UUID(get_uuid(1, "hos"))
        existing_hosp_user = (await db.execute(select(User).where(User.id == hosp_user_id))).scalar_one_or_none()
        if not existing_hosp_user:
            user = User(
                id=hosp_user_id, email="hospital1@demo.com", password_hash="supabase",
                role=UserRole.HOSPITAL, status=UserStatus.ACTIVE, is_verified=True
            )
            db.add(user)
            hosp = Hospital(
                id=hosp_user_id, user_id=hosp_user_id, name="Apollo Hospital Bengaluru",
                address="154/11, Bannerghatta Road", city="Bengaluru", state="Karnataka", country="India",
                is_verified=True, latitude=Decimal('12.895311'), longitude=Decimal('77.599602')
            )
            db.add(hosp)

        doc_email = "doctor@demo.com"
        doc_id = uuid.UUID(get_uuid(1, "doc"))
        existing_doc = (await db.execute(select(User).where(User.email == doc_email))).scalar_one_or_none()
        if not existing_doc:
            user = User(
                id=doc_id, email=doc_email, password_hash="supabase-managed-account",
                role=UserRole.DOCTOR, status=UserStatus.ACTIVE, is_verified=True
            )
            db.add(user)
            doc = Doctor(
                id=doc_id, user_id=doc_id, full_name="Dr. Demo Specialist",
                specialization="Cardiology", license_number="DOC123456", hospital_id=hosp_user_id
            )
            db.add(doc)

        # 3. PATIENT
        pat_email = "patient@demo.com"
        pat_id = uuid.UUID(get_uuid(1, "pat"))
        existing_pat = (await db.execute(select(User).where(User.email == pat_email))).scalar_one_or_none()
        if not existing_pat:
            user = User(
                id=pat_id, email=pat_email, password_hash="supabase-managed-account",
                role=UserRole.PATIENT, status=UserStatus.ACTIVE, is_verified=True
            )
            db.add(user)
            pat = Patient(
                id=pat_id, user_id=pat_id, full_name="Patient Demo",
                date_of_birth="1990-01-01", gender="MALE", blood_group="O+"
            )
            db.add(pat)

        # 4. PHARMACIES (Verified and Unverified)
        pharmacy_email = "pharmacy@demo.com"
        pharmacy_id = uuid.UUID(get_uuid(1, "pha"))
        existing_pha = (await db.execute(select(User).where(User.email == pharmacy_email))).scalar_one_or_none()
        if not existing_pha:
            user = User(
                id=pharmacy_id, email=pharmacy_email, password_hash="supabase-managed-account",
                role=UserRole.PHARMACY, status=UserStatus.ACTIVE, is_verified=True
            )
            db.add(user)
            pha = Pharmacy(
                id=pharmacy_id, user_id=pharmacy_id, business_name="MedSync Verified Pharmacy",
                license_number="PHARM12345", address="Indiranagar, Bengaluru", city="Bengaluru",
                is_24x7=True, qr_identifier="PHARM_QR_12345", qr_status="ACTIVE",
                location={"latitude": 12.978369, "longitude": 77.640836}
            )
            db.add(pha)
        
        pharmacy2_email = "unverified_pharmacy@demo.com"
        pharmacy2_id = uuid.UUID(get_uuid(2, "pha"))
        existing_pha2 = (await db.execute(select(User).where(User.email == pharmacy2_email))).scalar_one_or_none()
        if not existing_pha2:
            user = User(
                id=pharmacy2_id, email=pharmacy2_email, password_hash="supabase-managed-account",
                role=UserRole.PHARMACY, status=UserStatus.PENDING, is_verified=False
            )
            db.add(user)
            pha = Pharmacy(
                id=pharmacy2_id, user_id=pharmacy2_id, business_name="Unverified Pharmacy",
                address="Koramangala, Bengaluru", city="Bengaluru",
                location={"latitude": 12.935192, "longitude": 77.624480}
            )
            db.add(pha)

        await db.commit() # Commit users first

        # 5. MEDICINES & INVENTORY
        cat_id = uuid.UUID(get_uuid(1, "cat"))
        existing_cat = (await db.execute(select(MedicineCategory).where(MedicineCategory.id == cat_id))).scalar_one_or_none()
        if not existing_cat:
            cat = MedicineCategory(id=cat_id, name="Antibiotics", description="Bacterial infections")
            db.add(cat)
            await db.commit()
            
        med1_id = uuid.UUID(get_uuid(1, "med"))
        existing_med = (await db.execute(select(Medicine).where(Medicine.id == med1_id))).scalar_one_or_none()
        if not existing_med:
            med1 = Medicine(id=med1_id, name="Amoxicillin 500mg", category_id=cat_id, price=120.0, prescription_required=True)
            med2 = Medicine(id=uuid.UUID(get_uuid(2, "med")), name="Paracetamol 650mg", category_id=cat_id, price=30.0, prescription_required=False)
            med3 = Medicine(id=uuid.UUID(get_uuid(3, "med")), name="Cough Syrup Expiring", category_id=cat_id, price=85.0, prescription_required=False)
            med4 = Medicine(id=uuid.UUID(get_uuid(4, "med")), name="Low Stock Vit C", category_id=cat_id, price=50.0, prescription_required=False)
            db.add_all([med1, med2, med3, med4])
            await db.commit()

            # Inventory for Verified Pharmacy
            inv1 = MedicineInventory(
                id=uuid.UUID(get_uuid(1, "inv")), pharmacy_id=pharmacy_id, medicine_id=med1.id, 
                batch_number="B001", expiry_date=date.today() + timedelta(days=365), stock_quantity=100, unit_price=120.0
            )
            inv2 = MedicineInventory(
                id=uuid.UUID(get_uuid(2, "inv")), pharmacy_id=pharmacy_id, medicine_id=med2.id, 
                batch_number="B002", expiry_date=date.today() + timedelta(days=365), stock_quantity=0, unit_price=30.0
            ) # OUT OF STOCK
            inv3 = MedicineInventory(
                id=uuid.UUID(get_uuid(3, "inv")), pharmacy_id=pharmacy_id, medicine_id=med3.id, 
                batch_number="B003", expiry_date=date.today() + timedelta(days=10), stock_quantity=50, unit_price=85.0
            ) # EXPIRING SOON
            inv4 = MedicineInventory(
                id=uuid.UUID(get_uuid(4, "inv")), pharmacy_id=pharmacy_id, medicine_id=med4.id, 
                batch_number="B004", expiry_date=date.today() + timedelta(days=365), stock_quantity=5, minimum_stock=10, unit_price=50.0
            ) # LOW STOCK
            db.add_all([inv1, inv2, inv3, inv4])
            await db.commit()
            
            # Orders
            ord1 = MedicineOrder(
                id=uuid.UUID(get_uuid(1, "ord")), patient_id=pat_id, pharmacy_id=pharmacy_id,
                status=OrderStatus.PENDING, total_amount=120.0
            )
            ord2 = MedicineOrder(
                id=uuid.UUID(get_uuid(2, "ord")), patient_id=pat_id, pharmacy_id=pharmacy_id,
                status=OrderStatus.DELIVERED, total_amount=150.0
            )
            db.add_all([ord1, ord2])
            await db.commit()
            
            # Order items
            item1 = MedicineOrderItem(id=uuid.UUID(get_uuid(1, "itm")), order_id=ord1.id, inventory_id=inv1.id, quantity=1, price_at_purchase=120.0)
            item2 = MedicineOrderItem(id=uuid.UUID(get_uuid(2, "itm")), order_id=ord2.id, inventory_id=inv1.id, quantity=1, price_at_purchase=120.0)
            item3 = MedicineOrderItem(id=uuid.UUID(get_uuid(3, "itm")), order_id=ord2.id, inventory_id=inv2.id, quantity=1, price_at_purchase=30.0)
            db.add_all([item1, item2, item3])
            await db.commit()
        
        print("Dummy data generation completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_users())
