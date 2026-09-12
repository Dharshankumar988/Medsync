import uuid
import datetime
import random

# Fixed UUIDs from dummy_values.sql
ADMIN_USER_ID = '1a000000-0000-0000-0000-000000000001'

DOC_USER_ID = '1b000000-0000-0000-0000-000000000001'
DOC_PROFILE_ID = '3b000000-0000-0000-0000-000000000001'
DOC_LOC_ID = '4a000000-0000-0000-0000-000000000001'
HOSPITAL_ID = '2a000000-0000-0000-0000-000000000001'

PAT_USER_ID = '1c000000-0000-0000-0000-000000000001'
PAT_PROFILE_ID = '3c000000-0000-0000-0000-000000000001'

PHARM_USER_ID = '1d000000-0000-0000-0000-000000000001'
PHARM_PROFILE_ID = '3d000000-0000-0000-0000-000000000001'
PHARM_LOC_ID = '4b000000-0000-0000-0000-000000000001'

PHARM2_USER_ID = '1d000000-0000-0000-0000-000000000002' # Pharmacy 2 (Unverified)
PHARM2_PROFILE_ID = '3d000000-0000-0000-0000-000000000002'

def gen_uuid():
    return str(uuid.uuid4())

def main():
    sql = ["BEGIN;"]
    
    now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    today = datetime.datetime.now().strftime('%Y-%m-%d')
    tomorrow = (datetime.datetime.now() + datetime.timedelta(days=1)).strftime('%Y-%m-%d')
    yesterday = (datetime.datetime.now() - datetime.timedelta(days=1)).strftime('%Y-%m-%d')

    # 1. Update primary patient with missing fields if needed (dummy_values already inserts patient)
    # 2. Update pharmacy with new QR Architecture data
    sql.append(f"""
-- Update Pharmacy 1 to ensure it has the correct QR Identifier and Status
UPDATE public.pharmacies 
SET qr_identifier = 'PHARM_QR_{PHARM_PROFILE_ID}', qr_status = 'ACTIVE', is_24x7 = TRUE
WHERE id = '{PHARM_PROFILE_ID}';

-- Update Pharmacy 2 (Unverified for map testing)
UPDATE public.pharmacies
SET qr_identifier = 'PHARM_QR_{PHARM2_PROFILE_ID}', qr_status = 'ACTIVE'
WHERE id = '{PHARM2_PROFILE_ID}';
    """)

    # 3. Appointments
    apt1_id = gen_uuid()
    apt2_id = gen_uuid()
    sql.append(f"""
-- APPOINTMENTS (Doctor 1 <-> Patient 1)
INSERT INTO public.appointments (id, patient_id, doctor_id, location_id, appointment_date, start_time, end_time, status, created_at, updated_at) VALUES
('{apt1_id}', '{PAT_USER_ID}', '{DOC_USER_ID}', '{DOC_LOC_ID}', '{yesterday}', '10:00:00', '10:30:00', 'COMPLETED', '{now}', '{now}'),
('{apt2_id}', '{PAT_USER_ID}', '{DOC_USER_ID}', '{DOC_LOC_ID}', '{tomorrow}', '14:00:00', '14:30:00', 'CONFIRMED', '{now}', '{now}');
    """)

    # 4. Consultations (For the completed appointment)
    consult1_id = gen_uuid()
    sql.append(f"""
-- CONSULTATIONS
INSERT INTO public.consultations (id, appointment_id, patient_id, doctor_id, symptoms, observations, diagnosis, treatment_plan, clinical_notes, follow_up_date, created_at, updated_at) VALUES
('{consult1_id}', '{apt1_id}', '{PAT_USER_ID}', '{DOC_USER_ID}', 'Fever, cough, mild headache', 'Temperature 101F, slightly congested throat', 'Viral Upper Respiratory Infection', 'Rest, hydration, antipyretics', 'Patient advised to monitor temperature. No signs of bacterial infection at present.', '{tomorrow}', '{now}', '{now}');
    """)

    # 5. Medical Records (For the Patient)
    cat1_id = gen_uuid()
    rec1_id = gen_uuid()
    ver1_id = gen_uuid()
    sql.append(f"""
-- MEDICAL RECORDS
INSERT INTO public.medical_record_categories (id, name, description) VALUES
('{cat1_id}', 'Lab Reports', 'Laboratory test results') ON CONFLICT (name) DO NOTHING;

INSERT INTO public.medical_records (id, patient_id, uploaded_by, category_id, title, description, created_at, updated_at) VALUES
('{rec1_id}', '{PAT_USER_ID}', '{DOC_USER_ID}', '{cat1_id}', 'Complete Blood Count (CBC)', 'Routine CBC panel ordered by Dr. Demo', '{now}', '{now}');

INSERT INTO public.medical_record_versions (id, record_id, version_number, ipfs_cid, file_type, file_size_bytes, change_description, is_current, blockchain_status, blockchain_tx_hash) VALUES
('{ver1_id}', '{rec1_id}', 1, 'QmTestCIDForLocalMockBlockchain1234567890abcdef', 'application/pdf', 102400, 'Initial upload', TRUE, 'CONFIRMED', '0xabc123mocktxhash4567890');
    """)

    # 6. Prescriptions
    presc1_id = gen_uuid()
    presc_item1 = gen_uuid()
    presc_item2 = gen_uuid()
    sql.append(f"""
-- PRESCRIPTIONS
INSERT INTO public.prescriptions (id, appointment_id, patient_id, doctor_id, diagnosis, notes, is_finalized, is_dispensed, expires_at, blockchain_status, blockchain_tx_hash, created_at, updated_at) VALUES
('{presc1_id}', '{apt1_id}', '{PAT_USER_ID}', '{DOC_USER_ID}', 'Viral URI', 'Take medicines after food', TRUE, FALSE, '{tomorrow}', 'CONFIRMED', '0xdef456mocktxhash7890123', '{now}', '{now}');

-- Link consultation to prescription
UPDATE public.consultations SET prescription_id = '{presc1_id}' WHERE id = '{consult1_id}';

INSERT INTO public.prescription_items (id, prescription_id, medicine_name, dosage, frequency, duration_days, instructions, created_at, updated_at) VALUES
('{presc_item1}', '{presc1_id}', 'Paracetamol 650mg', '1 tablet', 'Twice a day', 5, 'After meals for fever', '{now}', '{now}'),
('{presc_item2}', '{presc1_id}', 'Cetirizine 10mg', '1 tablet', 'Once a day', 5, 'At night for cold', '{now}', '{now}');
    """)

    # 7. Medicine Inventory
    cat_med_id = gen_uuid()
    med1_id = gen_uuid()
    med2_id = gen_uuid()
    med3_id = gen_uuid()
    med4_id = gen_uuid()
    
    inv1_id = gen_uuid()
    inv2_id = gen_uuid()
    inv3_id = gen_uuid()
    inv4_id = gen_uuid()
    
    sql.append(f"""
-- MEDICINES & INVENTORY
INSERT INTO public.medicine_categories (id, name, description) VALUES
('{cat_med_id}', 'General Medicines', 'Commonly prescribed medicines') ON CONFLICT (name) DO NOTHING;

INSERT INTO public.medicines (id, name, generic_name, brand_name, category_id, manufacturer, price, prescription_required, created_at, updated_at) VALUES
('{med1_id}', 'Paracetamol 650mg', 'Paracetamol', 'Dolo 650', '{cat_med_id}', 'Micro Labs', 30.0, FALSE, '{now}', '{now}'),
('{med2_id}', 'Cetirizine 10mg', 'Cetirizine', 'Zyrtec', '{cat_med_id}', 'GSK', 45.0, FALSE, '{now}', '{now}'),
('{med3_id}', 'Amoxicillin 500mg', 'Amoxicillin', 'Augmentin', '{cat_med_id}', 'GSK', 150.0, TRUE, '{now}', '{now}'),
('{med4_id}', 'Cough Syrup', 'Dextromethorphan', 'Benadryl', '{cat_med_id}', 'J&J', 85.0, FALSE, '{now}', '{now}');

INSERT INTO public.medicine_inventory (id, pharmacy_id, medicine_id, batch_number, expiry_date, stock_quantity, minimum_stock, maximum_stock, unit_price, purchase_price, selling_price, created_at, updated_at) VALUES
('{inv1_id}', '{PHARM_USER_ID}', '{med1_id}', 'BATCH_NORMAL', '2030-12-31', 100, 10, 500, 30.0, 20.0, 30.0, '{now}', '{now}'),
('{inv2_id}', '{PHARM_USER_ID}', '{med2_id}', 'BATCH_OUT', '2030-12-31', 0, 10, 200, 45.0, 30.0, 45.0, '{now}', '{now}'),
('{inv3_id}', '{PHARM_USER_ID}', '{med3_id}', 'BATCH_EXPIRING', '{(datetime.datetime.now() + datetime.timedelta(days=5)).strftime("%Y-%m-%d")}', 50, 10, 200, 150.0, 100.0, 150.0, '{now}', '{now}'),
('{inv4_id}', '{PHARM_USER_ID}', '{med4_id}', 'BATCH_LOW', '2030-12-31', 5, 20, 100, 85.0, 50.0, 85.0, '{now}', '{now}');
    """)

    # 8. Medicine Orders
    order1_id = gen_uuid()
    order_item1 = gen_uuid()
    
    order2_id = gen_uuid()
    order_item2 = gen_uuid()
    
    del1_id = gen_uuid()
    del2_id = gen_uuid()

    sql.append(f"""
-- MEDICINE ORDERS & DELIVERY
-- Order 1: Completed Online Order (Should decrement stock properly by the backend logic, but since we are seeding, we just record it. We'll leave stock as is, the stock decrement test will use a NEW order).
INSERT INTO public.medicine_orders (id, patient_id, pharmacy_id, prescription_id, status, total_amount, delivery_address, created_at, updated_at) VALUES
('{order1_id}', '{PAT_USER_ID}', '{PHARM_USER_ID}', '{presc1_id}', 'DELIVERED', 150.0, 'Patient Home, Bengaluru', '{yesterday}', '{yesterday}');

INSERT INTO public.medicine_order_items (id, order_id, inventory_id, quantity, price_at_purchase, created_at, updated_at) VALUES
('{order_item1}', '{order1_id}', '{inv1_id}', 2, 30.0, '{yesterday}', '{yesterday}');

INSERT INTO public.delivery_tracking (id, order_id, tracking_number, current_status, delivery_partner, current_latitude, current_longitude, created_at, updated_at) VALUES
('{del1_id}', '{order1_id}', 'TRK-{str(uuid.uuid4())[:8].upper()}', 'DELIVERED', 'MedSync Logistics', 12.9716, 77.5946, '{yesterday}', '{yesterday}');

-- Order 2: Pending/Active Online Order
INSERT INTO public.medicine_orders (id, patient_id, pharmacy_id, status, total_amount, delivery_address, created_at, updated_at) VALUES
('{order2_id}', '{PAT_USER_ID}', '{PHARM_USER_ID}', 'CONFIRMED', 30.0, 'Patient Home, Bengaluru', '{now}', '{now}');

INSERT INTO public.medicine_order_items (id, order_id, inventory_id, quantity, price_at_purchase, created_at, updated_at) VALUES
('{order_item2}', '{order2_id}', '{inv1_id}', 1, 30.0, '{now}', '{now}');

INSERT INTO public.delivery_tracking (id, order_id, tracking_number, current_status, delivery_partner, current_latitude, current_longitude, created_at, updated_at) VALUES
('{del2_id}', '{order2_id}', 'TRK-{str(uuid.uuid4())[:8].upper()}', 'OUT_FOR_DELIVERY', 'MedSync Logistics', 12.9716, 77.5946, '{now}', '{now}');
    """)

    # 9. Notifications
    notif1_id = gen_uuid()
    notif2_id = gen_uuid()
    sql.append(f"""
-- NOTIFICATIONS
INSERT INTO public.notifications (id, user_id, type, title, message, is_read, created_at, updated_at) VALUES
('{notif1_id}', '{PAT_USER_ID}', 'APPOINTMENT', 'Appointment Confirmed', 'Your appointment with Dr. Demo is confirmed for tomorrow.', FALSE, '{now}', '{now}'),
('{notif2_id}', '{PHARM_USER_ID}', 'ORDER', 'New Order Received', 'You have received a new order.', FALSE, '{now}', '{now}');
    """)

    sql.append("COMMIT;")
    
    with open("database/seed_dummy_data_v2.sql", "w") as f:
        f.write("\n".join(sql))
        
    print("Seed generated successfully at database/seed_dummy_data_v2.sql")

if __name__ == "__main__":
    main()
