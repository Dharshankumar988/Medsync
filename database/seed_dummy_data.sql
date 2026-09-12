-- ==============================================================================
-- MEDSYNC DUMMY DATA SEED SCRIPT (CONNECTED E2E TEST DATA)
-- ==============================================================================
-- This script relies on dummy_values.sql having already been run.
-- It ADDS relational data for:
--   admin@medsync.com (User: 1a...001)
--   doctor1@medsync.com (User: 1b...001)
--   patient1@medsync.com (User: 1c...001)
--   pharmacy1@medsync.com (User: 1d...001, verified)
--   pharmacy2@medsync.com (User: 1d...002, unverified)
--
-- No fake blockchain or IPFS values are provided, they are left NULL/PENDING.
-- ==============================================================================

BEGIN;

-- 1. Modify pharmacy2 to be unverified for map testing
UPDATE public.users 
SET is_verified = FALSE, status = 'PENDING'
WHERE id = '1d000000-0000-0000-0000-000000000002';

UPDATE public.pharmacy_locations
SET verification_status = 'PENDING'
WHERE pharmacy_id = '1d000000-0000-0000-0000-000000000002';

-- 2. Doctor Availability
INSERT INTO public.doctor_availability (id, doctor_id, day_of_week, start_time, end_time, is_available) VALUES
('5b000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000002', '1b000000-0000-0000-0000-000000000001', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000003', '1b000000-0000-0000-0000-000000000001', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000004', '1b000000-0000-0000-0000-000000000001', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000005', '1b000000-0000-0000-0000-000000000001', 5, '09:00:00', '17:00:00', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. Appointments (Doctor 1 <-> Patient 1)
INSERT INTO public.appointments (id, patient_id, doctor_id, location_id, appointment_date, start_time, end_time, status, notes) VALUES
('6a000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', NULL, CURRENT_DATE - INTERVAL '1 day', '10:00:00', '10:30:00', 'COMPLETED', 'Patient reports high fever'),
('6a000000-0000-0000-0000-000000000002', '1c000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', NULL, CURRENT_DATE + INTERVAL '2 days', '14:00:00', '14:30:00', 'CONFIRMED', 'Regular checkup'),
('6a000000-0000-0000-0000-000000000003', '1c000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', NULL, CURRENT_DATE + INTERVAL '10 days', '11:00:00', '11:30:00', 'PENDING', 'None')
ON CONFLICT (id) DO NOTHING;

-- 4. Consultations (Linked to COMPLETED appointment)
INSERT INTO public.consultations (id, appointment_id, doctor_id, patient_id, diagnosis, symptoms, clinical_notes, treatment_plan, follow_up_date) VALUES
('7a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000001', 'Viral Infection', 'Fever 102F, chills, body ache', 'Prescribed paracetamol and antibiotics.', 'Rest for 3 days, complete antibiotic course.', CURRENT_DATE + INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- 5. Medical Record Categories
INSERT INTO public.medical_record_categories (id, name, description) VALUES
('8c000000-0000-0000-0000-000000000001', 'Lab Reports', 'Laboratory test results'),
('8c000000-0000-0000-0000-000000000002', 'Imaging', 'X-Rays, MRIs, CT Scans')
ON CONFLICT (name) DO NOTHING;

-- 6. Medical Records (Linked to Consultation)
INSERT INTO public.medical_records (id, patient_id, uploaded_by, category_id, title, description) VALUES
('9a000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', (SELECT id FROM public.medical_record_categories WHERE name = 'Lab Reports' LIMIT 1), 'Complete Blood Count', 'Blood test results showing slightly elevated WBC.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.medical_record_versions (id, record_id, version_number, ipfs_cid, file_type, file_size_bytes, is_current) VALUES
('9b000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000001', 1, 'mock_ipfs_cid_123', 'LAB_REPORT', 102400, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 7. Prescriptions (Linked to Appointment)
INSERT INTO public.prescriptions (id, appointment_id, doctor_id, patient_id, diagnosis, notes, pdf_url, expires_at) VALUES
('1e000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000001', 'Viral Infection', 'Rest for 3 days', '/downloads/prescriptions/mock_1.pdf', '2026-10-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- 8. Prescription Items
INSERT INTO public.prescription_items (id, prescription_id, medicine_name, dosage, frequency, duration_days, instructions) VALUES
('2e000000-0000-0000-0000-000000000001', '1e000000-0000-0000-0000-000000000001', 'Paracetamol 500mg', '1 tablet', 'Twice daily', 3, 'After meals'),
('2e000000-0000-0000-0000-000000000002', '1e000000-0000-0000-0000-000000000001', 'Amoxicillin 250mg', '1 capsule', 'Thrice daily', 5, 'Complete full course')
ON CONFLICT (id) DO NOTHING;

-- 9. Medicine Categories
INSERT INTO public.medicine_categories (id, name, description) VALUES
('3f000000-0000-0000-0000-000000000001', 'Antibiotics', 'Antibacterial medications'),
('3f000000-0000-0000-0000-000000000002', 'Analgesics', 'Pain relievers and fever reducers'),
('3f000000-0000-0000-0000-000000000003', 'Vitamins', 'Dietary supplements')
ON CONFLICT (name) DO NOTHING;

-- 10. Medicines
INSERT INTO public.medicines (id, name, generic_name, category_id, manufacturer, price, prescription_required) VALUES
('4f000000-0000-0000-0000-000000000001', 'AmoxCure 500', 'Amoxicillin 500mg', '3f000000-0000-0000-0000-000000000001', 'PharmaCorp', 150.0, TRUE),
('4f000000-0000-0000-0000-000000000002', 'ParaRelief 650', 'Paracetamol 650mg', '3f000000-0000-0000-0000-000000000002', 'HealthMakers', 45.0, FALSE),
('4f000000-0000-0000-0000-000000000003', 'VitaBoost C', 'Vitamin C 500mg', '3f000000-0000-0000-0000-000000000003', 'WellnessInc', 80.0, FALSE),
('4f000000-0000-0000-0000-000000000004', 'CoughAway', 'Dextromethorphan', '3f000000-0000-0000-0000-000000000002', 'HealthMakers', 110.0, FALSE)
ON CONFLICT (id) DO NOTHING;

-- 11. Pharmacy Inventory (For Pharmacy 1)
INSERT INTO public.medicine_inventory (id, pharmacy_id, medicine_id, batch_number, expiry_date, stock_quantity, minimum_stock, unit_price, selling_price) VALUES
('5f000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000001', '4f000000-0000-0000-0000-000000000001', 'BATCH-001', CURRENT_DATE + INTERVAL '365 days', 100, 10, 100.0, 150.0), -- High stock
('5f000000-0000-0000-0000-000000000002', '1d000000-0000-0000-0000-000000000001', '4f000000-0000-0000-0000-000000000002', 'BATCH-002', CURRENT_DATE + INTERVAL '365 days', 0, 10, 30.0, 45.0), -- Out of stock
('5f000000-0000-0000-0000-000000000003', '1d000000-0000-0000-0000-000000000001', '4f000000-0000-0000-0000-000000000003', 'BATCH-003', CURRENT_DATE + INTERVAL '10 days', 50, 10, 60.0, 80.0), -- Expiring soon
('5f000000-0000-0000-0000-000000000004', '1d000000-0000-0000-0000-000000000001', '4f000000-0000-0000-0000-000000000004', 'BATCH-004', CURRENT_DATE + INTERVAL '365 days', 5, 10, 90.0, 110.0) -- Low stock
ON CONFLICT (id) DO NOTHING;

-- 12. Medicine Orders (Patient 1 -> Pharmacy 1)
INSERT INTO public.medicine_orders (id, patient_id, pharmacy_id, prescription_id, status, order_type, total_amount, delivery_address) VALUES
('6f000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000001', '1e000000-0000-0000-0000-000000000001', 'DELIVERED', 'ONLINE_DELIVERY', 150.0, 'Patient Home, Bengaluru'),
('6f000000-0000-0000-0000-000000000002', '1c000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000001', NULL, 'PENDING', 'STORE_PICKUP', 110.0, NULL)
ON CONFLICT (id) DO NOTHING;

-- 13. Medicine Order Items
INSERT INTO public.medicine_order_items (id, order_id, inventory_id, quantity, price_at_purchase) VALUES
('7f000000-0000-0000-0000-000000000001', '6f000000-0000-0000-0000-000000000001', '5f000000-0000-0000-0000-000000000001', 1, 150.0),
('7f000000-0000-0000-0000-000000000002', '6f000000-0000-0000-0000-000000000002', '5f000000-0000-0000-0000-000000000004', 1, 110.0)
ON CONFLICT (id) DO NOTHING;

-- 14. Delivery Tracking (For DELIVERED order)
INSERT INTO public.delivery_tracking (id, order_id, tracking_number, current_status, delivery_partner, delivery_started_at, delivery_completed_at, delivery_progress) VALUES
('8f000000-0000-0000-0000-000000000001', '6f000000-0000-0000-0000-000000000001', 'TRK-BLR-0001', 'DELIVERED', 'MedSync Logistics', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', 100)
ON CONFLICT (id) DO NOTHING;

-- 15. Notifications
INSERT INTO public.notifications (id, user_id, title, message, type, is_read) VALUES
('9f000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000001', 'New Prescription', 'Dr. Demo 1 has created a new prescription for you.', 'INFO', FALSE),
('9f000000-0000-0000-0000-000000000002', '1d000000-0000-0000-0000-000000000001', 'New Order Received', 'A new order has been placed for store pickup.', 'ORDER', FALSE)
ON CONFLICT (id) DO NOTHING;

COMMIT;
