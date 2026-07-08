BEGIN;

-- 1. users (2 admins, 2 doctors, 2 patients, 2 pharmacies)
INSERT INTO users (id, email, password_hash, role, status, created_at, updated_at) VALUES 
('a1000000-0000-0000-0000-000000000000', 'admin1@medsync.com', 'admin', 'ADMIN', 'ACTIVE', NOW(), NOW()),
('a2000000-0000-0000-0000-000000000000', 'admin2@medsync.com', 'admin', 'ADMIN', 'ACTIVE', NOW(), NOW()),
('b1000000-0000-0000-0000-000000000000', 'doctor1@medsync.com', 'doctor', 'DOCTOR', 'ACTIVE', NOW(), NOW()),
('b2000000-0000-0000-0000-000000000000', 'doctor2@medsync.com', 'doctor', 'DOCTOR', 'ACTIVE', NOW(), NOW()),
('c1000000-0000-0000-0000-000000000000', 'patient1@medsync.com', 'patient', 'PATIENT', 'ACTIVE', NOW(), NOW()),
('c2000000-0000-0000-0000-000000000000', 'patient2@medsync.com', 'patient', 'PATIENT', 'ACTIVE', NOW(), NOW()),
('d1000000-0000-0000-0000-000000000000', 'pharmacy1@medsync.com', 'pharma', 'PHARMACY', 'ACTIVE', NOW(), NOW()),
('d2000000-0000-0000-0000-000000000000', 'pharmacy2@medsync.com', 'pharma', 'PHARMACY', 'ACTIVE', NOW(), NOW());

-- 2. admins
INSERT INTO admins (id, user_id, full_name, department, created_at, updated_at) VALUES 
('a1111111-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'Admin One', 'IT Support', NOW(), NOW()),
('a2222222-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000000', 'Admin Two', 'Operations', NOW(), NOW());

-- 3. doctors
INSERT INTO doctors (id, user_id, full_name, specialization, license_number, experience_years, bio, consultation_fee, created_at, updated_at) VALUES 
('b1111111-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000', 'Dr. Alice', 'Cardiology', 'LIC-DOC-001', 10, 'Experienced cardiologist', 500, NOW(), NOW()),
('b2222222-0000-0000-0000-000000000000', 'b2000000-0000-0000-0000-000000000000', 'Dr. Bob', 'Neurology', 'LIC-DOC-002', 8, 'Expert in neurology', 600, NOW(), NOW());

-- 4. patients
INSERT INTO patients (id, user_id, full_name, date_of_birth, gender, blood_group, phone_number, address, created_at, updated_at) VALUES 
('c1111111-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'Patient Charlie', '1990-01-01', 'Male', 'O+', '1234567890', '123 Main St', NOW(), NOW()),
('c2222222-0000-0000-0000-000000000000', 'c2000000-0000-0000-0000-000000000000', 'Patient Diana', '1995-05-05', 'Female', 'A+', '0987654321', '456 Oak St', NOW(), NOW());

-- 5. pharmacies
INSERT INTO pharmacies (id, user_id, business_name, license_number, gst_number, address, contact_number, created_at, updated_at) VALUES 
('d1111111-0000-0000-0000-000000000000', 'd1000000-0000-0000-0000-000000000000', 'Pharma Plus', 'LIC-PHM-001', 'GST001', '789 Pine St', '1122334455', NOW(), NOW()),
('d2222222-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 'Health Meds', 'LIC-PHM-002', 'GST002', '321 Elm St', '5544332211', NOW(), NOW());

-- 6. medical_record_categories
INSERT INTO medical_record_categories (id, name, description, created_at, updated_at) VALUES 
('e1000000-0000-0000-0000-000000000000', 'General Checkup', 'Routine general checkups', NOW(), NOW());

-- 7. medical_record_tags
INSERT INTO medical_record_tags (id, name, created_at, updated_at) VALUES 
('e2000000-0000-0000-0000-000000000000', 'Urgent', NOW(), NOW());

-- 8. medicine_categories
INSERT INTO medicine_categories (id, name, description, created_at, updated_at) VALUES 
('e3000000-0000-0000-0000-000000000000', 'Antibiotics', 'Antibacterial medication', NOW(), NOW());

-- 9. ai_chat_sessions
INSERT INTO ai_chat_sessions (id, user_id, title, is_doctor_mode, is_pinned, created_at, updated_at) VALUES 
('e4000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'Headache Discussion', FALSE, FALSE, NOW(), NOW());

-- 10. appointments
INSERT INTO appointments (id, patient_id, doctor_id, appointment_date, start_time, end_time, status, notes, created_at, updated_at) VALUES 
('e5000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000', '2025-01-01', '10:00:00', '10:30:00', 'SCHEDULED', 'First visit', NOW(), NOW());

-- 11. consent_history
INSERT INTO consent_history (id, patient_id, doctor_id, action, blockchain_tx_hash, created_at, updated_at) VALUES 
('e6000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000', 'GRANTED', '0xabc123', NOW(), NOW());

-- 12. doctor_availability
INSERT INTO doctor_availability (id, doctor_id, day_of_week, start_time, end_time, is_available, created_at, updated_at) VALUES 
('e7000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000', 1, '09:00:00', '17:00:00', TRUE, NOW(), NOW());

-- 13. medical_records
INSERT INTO medical_records (id, patient_id, uploaded_by, category_id, title, description, is_archived, created_at, updated_at) VALUES 
('e8000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000000', 'Blood Test', 'Routine blood test results', FALSE, NOW(), NOW());

-- 14. medicines
INSERT INTO medicines (id, name, category_id, manufacturer, dosage_form, description, created_at, updated_at) VALUES 
('e9000000-0000-0000-0000-000000000000', 'Amoxicillin', 'e3000000-0000-0000-0000-000000000000', 'PharmaCorp', 'Tablet', 'Used for bacterial infections', NOW(), NOW());

-- 15. notification_preferences
INSERT INTO notification_preferences (id, user_id, email_enabled, push_enabled, in_app_enabled, created_at, updated_at) VALUES 
('ea000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', TRUE, TRUE, TRUE, NOW(), NOW());

-- 16. notifications
INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at, updated_at) VALUES 
('eb000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'Welcome', 'Welcome to MedSync', 'SYSTEM', FALSE, NOW(), NOW());

-- 17. ai_chat_messages
INSERT INTO ai_chat_messages (id, session_id, role, content, model_used, inference_time_ms, created_at, updated_at) VALUES 
('ec000000-0000-0000-0000-000000000000', 'e4000000-0000-0000-0000-000000000000', 'USER', 'I have a headache', 'gpt-4', 1200, NOW(), NOW());

-- 18. appointment_status_history
INSERT INTO appointment_status_history (id, appointment_id, status, changed_by, reason, created_at, updated_at) VALUES 
('ed000000-0000-0000-0000-000000000000', 'e5000000-0000-0000-0000-000000000000', 'SCHEDULED', 'c1000000-0000-0000-0000-000000000000', 'Initial booking', NOW(), NOW());

-- 19. medical_record_tag_mappings
INSERT INTO medical_record_tag_mappings (id, record_id, tag_id, created_at, updated_at) VALUES 
('ee000000-0000-0000-0000-000000000000', 'e8000000-0000-0000-0000-000000000000', 'e2000000-0000-0000-0000-000000000000', NOW(), NOW());

-- 20. medical_record_versions
INSERT INTO medical_record_versions (id, record_id, version_number, ipfs_cid, file_type, file_size_bytes, change_description, is_current, blockchain_tx_hash, created_at, updated_at) VALUES 
('ef000000-0000-0000-0000-000000000000', 'e8000000-0000-0000-0000-000000000000', 1, 'QmTestCid123', 'application/pdf', 1024, 'Initial upload', TRUE, '0xdef456', NOW(), NOW());

-- 21. medicine_inventory
INSERT INTO medicine_inventory (id, pharmacy_id, medicine_id, batch_number, expiry_date, stock_quantity, unit_price, created_at, updated_at) VALUES 
('f0000000-0000-0000-0000-000000000000', 'd1000000-0000-0000-0000-000000000000', 'e9000000-0000-0000-0000-000000000000', 'BATCH-001', '2026-12-31', 100, 10.5, NOW(), NOW());

-- 22. prescriptions
INSERT INTO prescriptions (id, appointment_id, patient_id, doctor_id, diagnosis, notes, is_finalized, is_dispensed, created_at, updated_at) VALUES 
('f1000000-0000-0000-0000-000000000000', 'e5000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000', 'Common Cold', 'Rest and drink fluids', TRUE, FALSE, NOW(), NOW());

-- 23. record_permissions
INSERT INTO record_permissions (id, record_id, granted_to, granted_by, access_level, expires_at, is_revoked, created_at, updated_at) VALUES 
('f2000000-0000-0000-0000-000000000000', 'e8000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'READ', NULL, FALSE, NOW(), NOW());

-- 24. verification_requests
INSERT INTO verification_requests (id, user_id, role_type, status, reviewer_id, review_date, approval_date, rejection_reason, blockchain_tx_hash, created_at, updated_at) VALUES 
('f3000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000', 'DOCTOR', 'APPROVED', 'a1111111-0000-0000-0000-000000000000', NOW(), NOW(), NULL, '0xverify123', NOW(), NOW());

-- 25. ai_analyses
INSERT INTO ai_analyses (id, version_id, model_name, analysis_status, summary, confidence_score, processing_time_ms, created_at, updated_at) VALUES 
('f4000000-0000-0000-0000-000000000000', 'ef000000-0000-0000-0000-000000000000', 'med-ai-v1', 'COMPLETED', 'Patient seems healthy based on blood test', 0.95, 5000, NOW(), NOW());

-- 26. doctor_notes
INSERT INTO doctor_notes (id, version_id, doctor_id, note_text, created_at, updated_at) VALUES 
('f5000000-0000-0000-0000-000000000000', 'ef000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000', 'Everything looks normal.', NOW(), NOW());

-- 27. file_metadata
INSERT INTO file_metadata (id, version_id, supabase_storage_path, mime_type, created_at, updated_at) VALUES 
('f6000000-0000-0000-0000-000000000000', 'ef000000-0000-0000-0000-000000000000', '/storage/records/e8000000-0000-0000-0000-000000000000', 'application/pdf', NOW(), NOW());

-- 28. medicine_orders
INSERT INTO medicine_orders (id, patient_id, pharmacy_id, prescription_id, status, total_amount, delivery_address, created_at, updated_at) VALUES 
('f7000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'd1000000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000000', 'PENDING', 21.0, '123 Main St', NOW(), NOW());

-- 29. ocr_results
INSERT INTO ocr_results (id, version_id, extracted_text, confidence, detected_fields, status, created_at, updated_at) VALUES 
('f8000000-0000-0000-0000-000000000000', 'ef000000-0000-0000-0000-000000000000', 'Blood Test Results...', 0.98, '{"WBC": "normal"}', 'COMPLETED', NOW(), NOW());

-- 30. prescription_items
INSERT INTO prescription_items (id, prescription_id, medicine_name, dosage, frequency, duration_days, instructions, created_at, updated_at) VALUES 
('f9000000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000000', 'Amoxicillin', '500mg', 'Twice a day', 5, 'Take after meals', NOW(), NOW());

-- 31. delivery_tracking
INSERT INTO delivery_tracking (id, order_id, tracking_number, current_status, delivery_partner, estimated_delivery, notes, created_at, updated_at) VALUES 
('fa000000-0000-0000-0000-000000000000', 'f7000000-0000-0000-0000-000000000000', 'TRK-001', 'DISPATCHED', 'FastDelivery', '2025-01-02', 'Handle with care', NOW(), NOW());

-- 32. medicine_order_items
INSERT INTO medicine_order_items (id, order_id, inventory_id, quantity, price_at_purchase, created_at, updated_at) VALUES 
('fb000000-0000-0000-0000-000000000000', 'f7000000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000000', 2, 10.5, NOW(), NOW());

-- 33. payments
INSERT INTO payments (id, user_id, order_id, appointment_id, amount, status, method, transaction_id, created_at, updated_at) VALUES 
('fc000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'f7000000-0000-0000-0000-000000000000', 'e5000000-0000-0000-0000-000000000000', 21.0, 'COMPLETED', 'CREDIT_CARD', 'TXN-001', NOW(), NOW());

-- 34. invoices
INSERT INTO invoices (id, payment_id, invoice_number, invoice_url, created_at, updated_at) VALUES 
('fd000000-0000-0000-0000-000000000000', 'fc000000-0000-0000-0000-000000000000', 'INV-001', 'https://example.com/invoice/INV-001.pdf', NOW(), NOW());


COMMIT;
