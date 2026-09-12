BEGIN;

-- Update Pharmacy 1 to ensure it has the correct QR Identifier and Status
UPDATE public.pharmacies 
SET qr_identifier = 'PHARM_QR_3d000000-0000-0000-0000-000000000001', qr_status = 'ACTIVE', is_24x7 = TRUE
WHERE id = '3d000000-0000-0000-0000-000000000001';

-- Update Pharmacy 2 (Unverified for map testing)
UPDATE public.pharmacies
SET qr_identifier = 'PHARM_QR_3d000000-0000-0000-0000-000000000002', qr_status = 'ACTIVE'
WHERE id = '3d000000-0000-0000-0000-000000000002';
    

-- APPOINTMENTS (Doctor 1 <-> Patient 1)
INSERT INTO public.appointments (id, patient_id, doctor_id, location_id, appointment_date, start_time, end_time, status, created_at, updated_at) VALUES
('6d39054e-e0d4-4f46-ba24-3d6916d9c970', '1c000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', '4a000000-0000-0000-0000-000000000001', '2026-09-11', '10:00:00', '10:30:00', 'COMPLETED', '2026-09-12 12:32:40', '2026-09-12 12:32:40'),
('897189b3-f6f6-4876-9b8d-848b094582f8', '1c000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', '4a000000-0000-0000-0000-000000000001', '2026-09-13', '14:00:00', '14:30:00', 'CONFIRMED', '2026-09-12 12:32:40', '2026-09-12 12:32:40');
    

-- CONSULTATIONS
INSERT INTO public.consultations (id, appointment_id, patient_id, doctor_id, symptoms, observations, diagnosis, treatment_plan, clinical_notes, follow_up_date, created_at, updated_at) VALUES
('422a5372-5471-4781-9af5-e02a7d1c6280', '6d39054e-e0d4-4f46-ba24-3d6916d9c970', '1c000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', 'Fever, cough, mild headache', 'Temperature 101F, slightly congested throat', 'Viral Upper Respiratory Infection', 'Rest, hydration, antipyretics', 'Patient advised to monitor temperature. No signs of bacterial infection at present.', '2026-09-13', '2026-09-12 12:32:40', '2026-09-12 12:32:40');
    

-- MEDICAL RECORDS
INSERT INTO public.medical_record_categories (id, name, description) VALUES
('2a988ac7-411b-4bf2-9a86-9213e92e0b8b', 'Lab Reports', 'Laboratory test results') ON CONFLICT (name) DO NOTHING;

INSERT INTO public.medical_records (id, patient_id, uploaded_by, category_id, title, description, created_at, updated_at) VALUES
('3edad050-ca2f-4e19-83f3-97bab710443a', '1c000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', '2a988ac7-411b-4bf2-9a86-9213e92e0b8b', 'Complete Blood Count (CBC)', 'Routine CBC panel ordered by Dr. Demo', '2026-09-12 12:32:40', '2026-09-12 12:32:40');

INSERT INTO public.medical_record_versions (id, record_id, version_number, ipfs_cid, file_type, file_size_bytes, change_description, is_current, blockchain_status, blockchain_tx_hash) VALUES
('a4e2d557-4888-46ac-930c-83a5ef241f3c', '3edad050-ca2f-4e19-83f3-97bab710443a', 1, 'QmTestCIDForLocalMockBlockchain1234567890abcdef', 'application/pdf', 102400, 'Initial upload', TRUE, 'CONFIRMED', '0xabc123mocktxhash4567890');
    

-- PRESCRIPTIONS
INSERT INTO public.prescriptions (id, appointment_id, patient_id, doctor_id, diagnosis, notes, is_finalized, is_dispensed, expires_at, blockchain_status, blockchain_tx_hash, created_at, updated_at) VALUES
('d8088fdd-0fca-4a6c-8217-fd97944b7bf2', '6d39054e-e0d4-4f46-ba24-3d6916d9c970', '1c000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', 'Viral URI', 'Take medicines after food', TRUE, FALSE, '2026-09-13', 'CONFIRMED', '0xdef456mocktxhash7890123', '2026-09-12 12:32:40', '2026-09-12 12:32:40');

-- Link consultation to prescription
UPDATE public.consultations SET prescription_id = 'd8088fdd-0fca-4a6c-8217-fd97944b7bf2' WHERE id = '422a5372-5471-4781-9af5-e02a7d1c6280';

INSERT INTO public.prescription_items (id, prescription_id, medicine_name, dosage, frequency, duration_days, instructions, created_at, updated_at) VALUES
('111cd980-5d71-41ec-98bf-93343a1d4e87', 'd8088fdd-0fca-4a6c-8217-fd97944b7bf2', 'Paracetamol 650mg', '1 tablet', 'Twice a day', 5, 'After meals for fever', '2026-09-12 12:32:40', '2026-09-12 12:32:40'),
('7ee4e8a8-16ab-48a9-94ea-bb5966b7ecc2', 'd8088fdd-0fca-4a6c-8217-fd97944b7bf2', 'Cetirizine 10mg', '1 tablet', 'Once a day', 5, 'At night for cold', '2026-09-12 12:32:40', '2026-09-12 12:32:40');
    

-- MEDICINES & INVENTORY
INSERT INTO public.medicine_categories (id, name, description) VALUES
('bf18167c-52da-4093-bbda-4667402fb665', 'General Medicines', 'Commonly prescribed medicines') ON CONFLICT (name) DO NOTHING;

INSERT INTO public.medicines (id, name, generic_name, brand_name, category_id, manufacturer, price, prescription_required, created_at, updated_at) VALUES
('ac812d7b-67ad-402f-9dd2-a70c1c49a02d', 'Paracetamol 650mg', 'Paracetamol', 'Dolo 650', 'bf18167c-52da-4093-bbda-4667402fb665', 'Micro Labs', 30.0, FALSE, '2026-09-12 12:32:40', '2026-09-12 12:32:40'),
('21d71d50-803f-42fb-8ce3-2dd92db07a6e', 'Cetirizine 10mg', 'Cetirizine', 'Zyrtec', 'bf18167c-52da-4093-bbda-4667402fb665', 'GSK', 45.0, FALSE, '2026-09-12 12:32:40', '2026-09-12 12:32:40'),
('69c01357-1540-4424-8581-760ebc3503b3', 'Amoxicillin 500mg', 'Amoxicillin', 'Augmentin', 'bf18167c-52da-4093-bbda-4667402fb665', 'GSK', 150.0, TRUE, '2026-09-12 12:32:40', '2026-09-12 12:32:40'),
('4ef0fb61-0eca-42dc-9b2e-4561c47d0631', 'Cough Syrup', 'Dextromethorphan', 'Benadryl', 'bf18167c-52da-4093-bbda-4667402fb665', 'J&J', 85.0, FALSE, '2026-09-12 12:32:40', '2026-09-12 12:32:40');

INSERT INTO public.medicine_inventory (id, pharmacy_id, medicine_id, batch_number, expiry_date, stock_quantity, minimum_stock, maximum_stock, unit_price, purchase_price, selling_price, created_at, updated_at) VALUES
('929310f0-dec3-4154-8532-b07072bb6fb1', '1d000000-0000-0000-0000-000000000001', 'ac812d7b-67ad-402f-9dd2-a70c1c49a02d', 'BATCH_NORMAL', '2030-12-31', 100, 10, 500, 30.0, 20.0, 30.0, '2026-09-12 12:32:40', '2026-09-12 12:32:40'),
('01edd366-18a8-4cdb-b40b-f2a6f9b8dd95', '1d000000-0000-0000-0000-000000000001', '21d71d50-803f-42fb-8ce3-2dd92db07a6e', 'BATCH_OUT', '2030-12-31', 0, 10, 200, 45.0, 30.0, 45.0, '2026-09-12 12:32:40', '2026-09-12 12:32:40'),
('e9bc44b4-190b-4f9d-88d7-7b1571af4020', '1d000000-0000-0000-0000-000000000001', '69c01357-1540-4424-8581-760ebc3503b3', 'BATCH_EXPIRING', '2026-09-17', 50, 10, 200, 150.0, 100.0, 150.0, '2026-09-12 12:32:40', '2026-09-12 12:32:40'),
('287fdf33-cf0b-4a1d-82f9-703fc74956f6', '1d000000-0000-0000-0000-000000000001', '4ef0fb61-0eca-42dc-9b2e-4561c47d0631', 'BATCH_LOW', '2030-12-31', 5, 20, 100, 85.0, 50.0, 85.0, '2026-09-12 12:32:40', '2026-09-12 12:32:40');
    

-- MEDICINE ORDERS & DELIVERY
-- Order 1: Completed Online Order (Should decrement stock properly by the backend logic, but since we are seeding, we just record it. We'll leave stock as is, the stock decrement test will use a NEW order).
INSERT INTO public.medicine_orders (id, patient_id, pharmacy_id, prescription_id, status, total_amount, delivery_address, created_at, updated_at) VALUES
('43ce3401-b06e-41ab-82d4-537b7e15d0a4', '1c000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000001', 'd8088fdd-0fca-4a6c-8217-fd97944b7bf2', 'DELIVERED', 150.0, 'Patient Home, Bengaluru', '2026-09-11', '2026-09-11');

INSERT INTO public.medicine_order_items (id, order_id, inventory_id, quantity, price_at_purchase, created_at, updated_at) VALUES
('4f819685-41a5-4ba5-9b64-c5602753f2a8', '43ce3401-b06e-41ab-82d4-537b7e15d0a4', '929310f0-dec3-4154-8532-b07072bb6fb1', 2, 30.0, '2026-09-11', '2026-09-11');

INSERT INTO public.delivery_tracking (id, order_id, tracking_number, current_status, delivery_partner, current_latitude, current_longitude, created_at, updated_at) VALUES
('0fde76d8-c680-43c5-888d-957beeabeb23', '43ce3401-b06e-41ab-82d4-537b7e15d0a4', 'TRK-4B323F5E', 'DELIVERED', 'MedSync Logistics', 12.9716, 77.5946, '2026-09-11', '2026-09-11');

-- Order 2: Pending/Active Online Order
INSERT INTO public.medicine_orders (id, patient_id, pharmacy_id, status, total_amount, delivery_address, created_at, updated_at) VALUES
('8c81cb0a-72bb-4528-afe9-cfa46e05a830', '1c000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000001', 'CONFIRMED', 30.0, 'Patient Home, Bengaluru', '2026-09-12 12:32:40', '2026-09-12 12:32:40');

INSERT INTO public.medicine_order_items (id, order_id, inventory_id, quantity, price_at_purchase, created_at, updated_at) VALUES
('360711e5-e6c3-4a46-ab7f-6e7d556413fd', '8c81cb0a-72bb-4528-afe9-cfa46e05a830', '929310f0-dec3-4154-8532-b07072bb6fb1', 1, 30.0, '2026-09-12 12:32:40', '2026-09-12 12:32:40');

INSERT INTO public.delivery_tracking (id, order_id, tracking_number, current_status, delivery_partner, current_latitude, current_longitude, created_at, updated_at) VALUES
('71110429-dd25-49b3-b577-ec5d324ac003', '8c81cb0a-72bb-4528-afe9-cfa46e05a830', 'TRK-2402B5FE', 'OUT_FOR_DELIVERY', 'MedSync Logistics', 12.9716, 77.5946, '2026-09-12 12:32:40', '2026-09-12 12:32:40');
    

-- NOTIFICATIONS
INSERT INTO public.notifications (id, user_id, type, title, message, is_read, created_at, updated_at) VALUES
('8ca47067-e58a-4378-b5b4-5d152b1f0347', '1c000000-0000-0000-0000-000000000001', 'APPOINTMENT', 'Appointment Confirmed', 'Your appointment with Dr. Demo is confirmed for tomorrow.', FALSE, '2026-09-12 12:32:40', '2026-09-12 12:32:40'),
('ddd949f3-d78a-4c08-ab63-6c58c00acc84', '1d000000-0000-0000-0000-000000000001', 'ORDER', 'New Order Received', 'You have received a new order.', FALSE, '2026-09-12 12:32:40', '2026-09-12 12:32:40');
    
COMMIT;