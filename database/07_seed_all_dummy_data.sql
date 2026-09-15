BEGIN;

SET session_replication_role = 'replica';

TRUNCATE TABLE prescription_dispensing_log, prescription_download_authorizations, patient_biometric_profiles, patient_security_credentials, prescription_transfers, download_audit_logs, audit_logs, api_request_logs, consultations, medical_history_shares, consent_history, invoices, payments, delivery_tracking, medicine_order_items, medicine_orders, prescription_items, prescriptions, appointment_status_history, appointments, medicine_inventory, medicines, suppliers, medicine_categories, doctor_locations, pharmacy_locations, doctor_availability, verification_requests, ai_chat_messages, ai_chat_sessions, doctor_notes, ai_analyses, ocr_results, file_metadata, medical_record_versions, medical_record_tag_mappings, medical_records, medical_record_tags, medical_record_categories, notifications, notification_preferences, patients, doctors, pharmacies, admins, users, hospitals, knowledge_chunks, knowledge_documents, admin_ai_audit_logs CASCADE;

DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@medsync.com');
DELETE FROM auth.users WHERE email LIKE '%@medsync.com';

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change) VALUES
('00000000-0000-0000-0000-000000000000', '1a000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin@medsync.com', crypt('admin', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "ADMIN", "full_name": "Super Admin"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'doctor1@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 1"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'doctor2@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 2"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'doctor3@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 3"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'doctor4@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 4"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'doctor5@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 5"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'doctor6@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 6"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'doctor7@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 7"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000008', 'authenticated', 'authenticated', 'doctor8@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 8"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000009', 'authenticated', 'authenticated', 'doctor9@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 9"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000010', 'authenticated', 'authenticated', 'doctor10@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 10"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000011', 'authenticated', 'authenticated', 'doctor11@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 11"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000012', 'authenticated', 'authenticated', 'doctor12@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 12"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000013', 'authenticated', 'authenticated', 'doctor13@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 13"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000014', 'authenticated', 'authenticated', 'doctor14@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 14"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000015', 'authenticated', 'authenticated', 'doctor15@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 15"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000016', 'authenticated', 'authenticated', 'doctor16@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 16"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000017', 'authenticated', 'authenticated', 'doctor17@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 17"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000018', 'authenticated', 'authenticated', 'doctor18@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 18"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000019', 'authenticated', 'authenticated', 'doctor19@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 19"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000020', 'authenticated', 'authenticated', 'doctor20@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 20"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000021', 'authenticated', 'authenticated', 'doctor21@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 21"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000022', 'authenticated', 'authenticated', 'doctor22@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 22"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000023', 'authenticated', 'authenticated', 'doctor23@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 23"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000024', 'authenticated', 'authenticated', 'doctor24@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 24"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000025', 'authenticated', 'authenticated', 'doctor25@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 25"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000026', 'authenticated', 'authenticated', 'doctor26@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 26"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000027', 'authenticated', 'authenticated', 'doctor27@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 27"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000028', 'authenticated', 'authenticated', 'doctor28@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 28"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000029', 'authenticated', 'authenticated', 'doctor29@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 29"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000030', 'authenticated', 'authenticated', 'doctor30@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 30"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000031', 'authenticated', 'authenticated', 'doctor31@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 31"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000032', 'authenticated', 'authenticated', 'doctor32@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 32"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000033', 'authenticated', 'authenticated', 'doctor33@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 33"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000034', 'authenticated', 'authenticated', 'doctor34@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 34"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000035', 'authenticated', 'authenticated', 'doctor35@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 35"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000036', 'authenticated', 'authenticated', 'doctor36@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 36"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000037', 'authenticated', 'authenticated', 'doctor37@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 37"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000038', 'authenticated', 'authenticated', 'doctor38@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 38"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000039', 'authenticated', 'authenticated', 'doctor39@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 39"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000040', 'authenticated', 'authenticated', 'doctor40@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Doctor 40"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'patient1@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Patient 1"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'patient2@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Patient 2"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'patient3@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Patient 3"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'patient4@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Patient 4"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'patient5@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Patient 5"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'pharmacy1@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Pharmacy 1"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'pharmacy2@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Pharmacy 2"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'pharmacy3@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Pharmacy 3"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'pharmacy4@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Pharmacy 4"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'pharmacy5@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Pharmacy 5"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'pharmacy6@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Pharmacy 6"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'pharmacy7@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Pharmacy 7"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000008', 'authenticated', 'authenticated', 'pharmacy8@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Pharmacy 8"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000009', 'authenticated', 'authenticated', 'pharmacy9@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Pharmacy 9"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000010', 'authenticated', 'authenticated', 'pharmacy10@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Pharmacy 10"}'::jsonb, NOW(), NOW(), '', '', '', '');

INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at) VALUES
('1a000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000001', '{"sub": "1a000000-0000-0000-0000-000000000001", "email": "admin@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', '{"sub": "1b000000-0000-0000-0000-000000000001", "email": "doctor1@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000002', '1b000000-0000-0000-0000-000000000002', '1b000000-0000-0000-0000-000000000002', '{"sub": "1b000000-0000-0000-0000-000000000002", "email": "doctor2@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000003', '1b000000-0000-0000-0000-000000000003', '1b000000-0000-0000-0000-000000000003', '{"sub": "1b000000-0000-0000-0000-000000000003", "email": "doctor3@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000004', '1b000000-0000-0000-0000-000000000004', '1b000000-0000-0000-0000-000000000004', '{"sub": "1b000000-0000-0000-0000-000000000004", "email": "doctor4@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000005', '1b000000-0000-0000-0000-000000000005', '1b000000-0000-0000-0000-000000000005', '{"sub": "1b000000-0000-0000-0000-000000000005", "email": "doctor5@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000006', '1b000000-0000-0000-0000-000000000006', '1b000000-0000-0000-0000-000000000006', '{"sub": "1b000000-0000-0000-0000-000000000006", "email": "doctor6@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000007', '1b000000-0000-0000-0000-000000000007', '1b000000-0000-0000-0000-000000000007', '{"sub": "1b000000-0000-0000-0000-000000000007", "email": "doctor7@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000008', '1b000000-0000-0000-0000-000000000008', '1b000000-0000-0000-0000-000000000008', '{"sub": "1b000000-0000-0000-0000-000000000008", "email": "doctor8@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000009', '1b000000-0000-0000-0000-000000000009', '1b000000-0000-0000-0000-000000000009', '{"sub": "1b000000-0000-0000-0000-000000000009", "email": "doctor9@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000010', '1b000000-0000-0000-0000-000000000010', '1b000000-0000-0000-0000-000000000010', '{"sub": "1b000000-0000-0000-0000-000000000010", "email": "doctor10@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000011', '1b000000-0000-0000-0000-000000000011', '1b000000-0000-0000-0000-000000000011', '{"sub": "1b000000-0000-0000-0000-000000000011", "email": "doctor11@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000012', '1b000000-0000-0000-0000-000000000012', '1b000000-0000-0000-0000-000000000012', '{"sub": "1b000000-0000-0000-0000-000000000012", "email": "doctor12@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000013', '1b000000-0000-0000-0000-000000000013', '1b000000-0000-0000-0000-000000000013', '{"sub": "1b000000-0000-0000-0000-000000000013", "email": "doctor13@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000014', '1b000000-0000-0000-0000-000000000014', '1b000000-0000-0000-0000-000000000014', '{"sub": "1b000000-0000-0000-0000-000000000014", "email": "doctor14@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000015', '1b000000-0000-0000-0000-000000000015', '1b000000-0000-0000-0000-000000000015', '{"sub": "1b000000-0000-0000-0000-000000000015", "email": "doctor15@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000016', '1b000000-0000-0000-0000-000000000016', '1b000000-0000-0000-0000-000000000016', '{"sub": "1b000000-0000-0000-0000-000000000016", "email": "doctor16@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000017', '1b000000-0000-0000-0000-000000000017', '1b000000-0000-0000-0000-000000000017', '{"sub": "1b000000-0000-0000-0000-000000000017", "email": "doctor17@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000018', '1b000000-0000-0000-0000-000000000018', '1b000000-0000-0000-0000-000000000018', '{"sub": "1b000000-0000-0000-0000-000000000018", "email": "doctor18@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000019', '1b000000-0000-0000-0000-000000000019', '1b000000-0000-0000-0000-000000000019', '{"sub": "1b000000-0000-0000-0000-000000000019", "email": "doctor19@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000020', '1b000000-0000-0000-0000-000000000020', '1b000000-0000-0000-0000-000000000020', '{"sub": "1b000000-0000-0000-0000-000000000020", "email": "doctor20@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000021', '1b000000-0000-0000-0000-000000000021', '1b000000-0000-0000-0000-000000000021', '{"sub": "1b000000-0000-0000-0000-000000000021", "email": "doctor21@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000022', '1b000000-0000-0000-0000-000000000022', '1b000000-0000-0000-0000-000000000022', '{"sub": "1b000000-0000-0000-0000-000000000022", "email": "doctor22@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000023', '1b000000-0000-0000-0000-000000000023', '1b000000-0000-0000-0000-000000000023', '{"sub": "1b000000-0000-0000-0000-000000000023", "email": "doctor23@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000024', '1b000000-0000-0000-0000-000000000024', '1b000000-0000-0000-0000-000000000024', '{"sub": "1b000000-0000-0000-0000-000000000024", "email": "doctor24@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000025', '1b000000-0000-0000-0000-000000000025', '1b000000-0000-0000-0000-000000000025', '{"sub": "1b000000-0000-0000-0000-000000000025", "email": "doctor25@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000026', '1b000000-0000-0000-0000-000000000026', '1b000000-0000-0000-0000-000000000026', '{"sub": "1b000000-0000-0000-0000-000000000026", "email": "doctor26@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000027', '1b000000-0000-0000-0000-000000000027', '1b000000-0000-0000-0000-000000000027', '{"sub": "1b000000-0000-0000-0000-000000000027", "email": "doctor27@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000028', '1b000000-0000-0000-0000-000000000028', '1b000000-0000-0000-0000-000000000028', '{"sub": "1b000000-0000-0000-0000-000000000028", "email": "doctor28@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000029', '1b000000-0000-0000-0000-000000000029', '1b000000-0000-0000-0000-000000000029', '{"sub": "1b000000-0000-0000-0000-000000000029", "email": "doctor29@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000030', '1b000000-0000-0000-0000-000000000030', '1b000000-0000-0000-0000-000000000030', '{"sub": "1b000000-0000-0000-0000-000000000030", "email": "doctor30@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000031', '1b000000-0000-0000-0000-000000000031', '1b000000-0000-0000-0000-000000000031', '{"sub": "1b000000-0000-0000-0000-000000000031", "email": "doctor31@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000032', '1b000000-0000-0000-0000-000000000032', '1b000000-0000-0000-0000-000000000032', '{"sub": "1b000000-0000-0000-0000-000000000032", "email": "doctor32@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000033', '1b000000-0000-0000-0000-000000000033', '1b000000-0000-0000-0000-000000000033', '{"sub": "1b000000-0000-0000-0000-000000000033", "email": "doctor33@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000034', '1b000000-0000-0000-0000-000000000034', '1b000000-0000-0000-0000-000000000034', '{"sub": "1b000000-0000-0000-0000-000000000034", "email": "doctor34@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000035', '1b000000-0000-0000-0000-000000000035', '1b000000-0000-0000-0000-000000000035', '{"sub": "1b000000-0000-0000-0000-000000000035", "email": "doctor35@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000036', '1b000000-0000-0000-0000-000000000036', '1b000000-0000-0000-0000-000000000036', '{"sub": "1b000000-0000-0000-0000-000000000036", "email": "doctor36@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000037', '1b000000-0000-0000-0000-000000000037', '1b000000-0000-0000-0000-000000000037', '{"sub": "1b000000-0000-0000-0000-000000000037", "email": "doctor37@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000038', '1b000000-0000-0000-0000-000000000038', '1b000000-0000-0000-0000-000000000038', '{"sub": "1b000000-0000-0000-0000-000000000038", "email": "doctor38@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000039', '1b000000-0000-0000-0000-000000000039', '1b000000-0000-0000-0000-000000000039', '{"sub": "1b000000-0000-0000-0000-000000000039", "email": "doctor39@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1b000000-0000-0000-0000-000000000040', '1b000000-0000-0000-0000-000000000040', '1b000000-0000-0000-0000-000000000040', '{"sub": "1b000000-0000-0000-0000-000000000040", "email": "doctor40@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1c000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000001', '{"sub": "1c000000-0000-0000-0000-000000000001", "email": "patient1@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1c000000-0000-0000-0000-000000000002', '1c000000-0000-0000-0000-000000000002', '1c000000-0000-0000-0000-000000000002', '{"sub": "1c000000-0000-0000-0000-000000000002", "email": "patient2@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1c000000-0000-0000-0000-000000000003', '1c000000-0000-0000-0000-000000000003', '1c000000-0000-0000-0000-000000000003', '{"sub": "1c000000-0000-0000-0000-000000000003", "email": "patient3@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1c000000-0000-0000-0000-000000000004', '1c000000-0000-0000-0000-000000000004', '1c000000-0000-0000-0000-000000000004', '{"sub": "1c000000-0000-0000-0000-000000000004", "email": "patient4@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1c000000-0000-0000-0000-000000000005', '1c000000-0000-0000-0000-000000000005', '1c000000-0000-0000-0000-000000000005', '{"sub": "1c000000-0000-0000-0000-000000000005", "email": "patient5@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1d000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000001', '{"sub": "1d000000-0000-0000-0000-000000000001", "email": "pharmacy1@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1d000000-0000-0000-0000-000000000002', '1d000000-0000-0000-0000-000000000002', '1d000000-0000-0000-0000-000000000002', '{"sub": "1d000000-0000-0000-0000-000000000002", "email": "pharmacy2@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1d000000-0000-0000-0000-000000000003', '1d000000-0000-0000-0000-000000000003', '1d000000-0000-0000-0000-000000000003', '{"sub": "1d000000-0000-0000-0000-000000000003", "email": "pharmacy3@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1d000000-0000-0000-0000-000000000004', '1d000000-0000-0000-0000-000000000004', '1d000000-0000-0000-0000-000000000004', '{"sub": "1d000000-0000-0000-0000-000000000004", "email": "pharmacy4@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1d000000-0000-0000-0000-000000000005', '1d000000-0000-0000-0000-000000000005', '1d000000-0000-0000-0000-000000000005', '{"sub": "1d000000-0000-0000-0000-000000000005", "email": "pharmacy5@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1d000000-0000-0000-0000-000000000006', '1d000000-0000-0000-0000-000000000006', '1d000000-0000-0000-0000-000000000006', '{"sub": "1d000000-0000-0000-0000-000000000006", "email": "pharmacy6@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1d000000-0000-0000-0000-000000000007', '1d000000-0000-0000-0000-000000000007', '1d000000-0000-0000-0000-000000000007', '{"sub": "1d000000-0000-0000-0000-000000000007", "email": "pharmacy7@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1d000000-0000-0000-0000-000000000008', '1d000000-0000-0000-0000-000000000008', '1d000000-0000-0000-0000-000000000008', '{"sub": "1d000000-0000-0000-0000-000000000008", "email": "pharmacy8@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1d000000-0000-0000-0000-000000000009', '1d000000-0000-0000-0000-000000000009', '1d000000-0000-0000-0000-000000000009', '{"sub": "1d000000-0000-0000-0000-000000000009", "email": "pharmacy9@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
('1d000000-0000-0000-0000-000000000010', '1d000000-0000-0000-0000-000000000010', '1d000000-0000-0000-0000-000000000010', '{"sub": "1d000000-0000-0000-0000-000000000010", "email": "pharmacy10@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW());

INSERT INTO public.users (id, email, password_hash, role, status, is_verified, profile_completion_percentage, created_at, updated_at) VALUES
('1a000000-0000-0000-0000-000000000001', 'admin@medsync.com', 'hashed_pw', 'ADMIN', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000001', 'doctor1@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000002', 'doctor2@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000003', 'doctor3@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000004', 'doctor4@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000005', 'doctor5@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000006', 'doctor6@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000007', 'doctor7@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000008', 'doctor8@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000009', 'doctor9@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000010', 'doctor10@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000011', 'doctor11@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000012', 'doctor12@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000013', 'doctor13@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000014', 'doctor14@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000015', 'doctor15@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000016', 'doctor16@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000017', 'doctor17@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000018', 'doctor18@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000019', 'doctor19@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000020', 'doctor20@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000021', 'doctor21@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000022', 'doctor22@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000023', 'doctor23@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000024', 'doctor24@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000025', 'doctor25@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000026', 'doctor26@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000027', 'doctor27@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000028', 'doctor28@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000029', 'doctor29@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000030', 'doctor30@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000031', 'doctor31@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000032', 'doctor32@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000033', 'doctor33@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000034', 'doctor34@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000035', 'doctor35@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000036', 'doctor36@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000037', 'doctor37@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000038', 'doctor38@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000039', 'doctor39@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000040', 'doctor40@medsync.com', 'hashed_pw', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1c000000-0000-0000-0000-000000000001', 'patient1@medsync.com', 'hashed_pw', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1c000000-0000-0000-0000-000000000002', 'patient2@medsync.com', 'hashed_pw', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1c000000-0000-0000-0000-000000000003', 'patient3@medsync.com', 'hashed_pw', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1c000000-0000-0000-0000-000000000004', 'patient4@medsync.com', 'hashed_pw', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1c000000-0000-0000-0000-000000000005', 'patient5@medsync.com', 'hashed_pw', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000001', 'pharmacy1@medsync.com', 'hashed_pw', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000002', 'pharmacy2@medsync.com', 'hashed_pw', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000003', 'pharmacy3@medsync.com', 'hashed_pw', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000004', 'pharmacy4@medsync.com', 'hashed_pw', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000005', 'pharmacy5@medsync.com', 'hashed_pw', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000006', 'pharmacy6@medsync.com', 'hashed_pw', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000007', 'pharmacy7@medsync.com', 'hashed_pw', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000008', 'pharmacy8@medsync.com', 'hashed_pw', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000009', 'pharmacy9@medsync.com', 'hashed_pw', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000010', 'pharmacy10@medsync.com', 'hashed_pw', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW());

INSERT INTO public.admins (id, user_id, full_name, department, created_at, updated_at) VALUES ('3a000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000001', 'Super Admin', 'IT', NOW(), NOW());

INSERT INTO public.hospitals (id, name, address, city, state, country, pincode, latitude, longitude, is_verified, is_active, type, google_maps_url, created_at, updated_at) VALUES
('2a000000-0000-0000-0000-000000000001', 'Aster CMI Hospital - Best Multispeciality Hospital in Hebbal, Bengaluru', 'Hebbal', 'Bengaluru', 'Karnataka', 'India', '560001', 13.05453, 77.59187, TRUE, TRUE, 'hospital', 'https://www.google.com/maps/search/?api=1&query=13.05453%2C77.59187&utm_source=chatgpt.com', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000002', 'Aster RV Hospital - Best Multispeciality Hospital in J. P. Nagar, Bengaluru', 'JP Nagar', 'Bengaluru', 'Karnataka', 'India', '560001', 12.91142, 77.58503, TRUE, TRUE, 'hospital', 'https://www.google.com/maps/search/?api=1&query=12.91142%2C77.58503&utm_source=chatgpt.com', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000003', 'Apollo Hospitals | Best Hospital in Bannerghatta Road, Bengaluru', 'Bannerghatta Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.8948, 77.5986, TRUE, TRUE, 'hospital', 'https://www.google.com/maps/search/?api=1&query=12.8948%2C77.5986&utm_source=chatgpt.com', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000004', 'Fortis Hospital, Bannerghatta Road - Best Hospital in Bangalore', 'Bannerghatta Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.8948, 77.5986, TRUE, TRUE, 'hospital', 'https://www.google.com/maps/search/?api=1&query=12.8948%2C77.5986&utm_source=chatgpt.com', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000005', 'Manipal Hospitals', 'Old Airport Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9588, 77.6476, TRUE, TRUE, 'hospital', 'https://www.google.com/maps/search/?api=1&query=12.9588%2C77.6476&utm_source=chatgpt.com', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000006', 'Manipal Hospital Yeshwanthpur', 'Yeshwanthpur', 'Bengaluru', 'Karnataka', 'India', '560001', 13.0097, 77.5504, TRUE, TRUE, 'hospital', 'https://www.google.com/maps/search/?api=1&query=13.0097%2C77.5504&utm_source=chatgpt.com', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000007', 'Ramaiah Memorial Hospital', 'MS Ramaiah Nagar', 'Bengaluru', 'Karnataka', 'India', '560001', 13.02822, 77.56978, TRUE, TRUE, 'hospital', 'https://www.google.com/maps/search/?api=1&query=13.02822%2C77.56978&utm_source=chatgpt.com', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000008', 'Sagar Hospitals', 'Jayanagar', 'Bengaluru', 'Karnataka', 'India', '560001', 12.928015, 77.599463, TRUE, TRUE, 'hospital', 'https://www.google.com/maps/search/?api=1&query=12.928015%2C77.599463&utm_source=chatgpt.com', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000009', 'St. John''s Medical College Hospital', 'Koramangala', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9279, 77.6287, TRUE, TRUE, 'hospital', 'https://www.google.com/maps/search/?api=1&query=12.9279%2C77.6287&utm_source=chatgpt.com', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000010', 'Narayana Institute of Cardiac Sciences', 'Bommasandra', 'Bengaluru', 'Karnataka', 'India', '560001', 12.87507, 77.71453, TRUE, TRUE, 'hospital', 'https://www.google.com/maps/search/?api=1&query=12.87507%2C77.71453&utm_source=chatgpt.com', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000011', 'Bangalore Baptist Hospital', 'Hebbal', 'Bengaluru', 'Karnataka', 'India', '560001', 13.035246, 77.589892, TRUE, TRUE, 'hospital', 'https://www.google.com/maps/search/?api=1&query=13.035246%2C77.589892&utm_source=chatgpt.com', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000012', 'NIMHANS', 'Hosur Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.93976, 77.59445, TRUE, TRUE, 'hospital', 'https://www.google.com/maps/search/?api=1&query=12.93976%2C77.59445&utm_source=chatgpt.com', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000013', 'Victoria Hospital', 'City Market', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9635, 77.5737, TRUE, TRUE, 'hospital', 'https://www.google.com/maps/search/?api=1&query=12.9635%2C77.5737&utm_source=chatgpt.com', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000014', 'Bowring & Lady Curzon Hospital', 'Shivajinagar', 'Bengaluru', 'Karnataka', 'India', '560001', 12.97464, 77.60037, TRUE, TRUE, 'hospital', 'https://www.google.com/maps/search/?api=1&query=12.97464%2C77.60037&utm_source=chatgpt.com', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000015', 'Jayadeva Institute of Cardiovascular Sciences', 'Jayanagar', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9173, 77.596, TRUE, TRUE, 'hospital', 'https://www.google.com/maps/search/?api=1&query=12.9173%2C77.5960&utm_source=chatgpt.com', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000016', 'Mallya Hospital', 'Vittal Mallya Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9707, 77.5956, TRUE, TRUE, 'hospital', 'https://www.google.com/maps/search/?api=1&query=12.9707%2C77.5956&utm_source=chatgpt.com', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000017', 'HCG Cancer Centre', 'Kalinga Rao Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9574, 77.5864, TRUE, TRUE, 'hospital', 'https://www.google.com/maps/search/?api=1&query=12.9574%2C77.5864&utm_source=chatgpt.com', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000018', 'Sakra World Hospital', 'Marathahalli', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9352, 77.695, TRUE, TRUE, 'hospital', 'https://www.google.com/maps/search/?api=1&query=12.9352%2C77.6950&utm_source=chatgpt.com', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000019', 'BGS Gleneagles Global Hospital', 'Kengeri', 'Bengaluru', 'Karnataka', 'India', '560001', 12.8994, 77.5008, TRUE, TRUE, 'hospital', 'https://www.google.com/maps/search/?api=1&query=12.8994%2C77.5008&utm_source=chatgpt.com', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000020', 'Manipal Hospital Whitefield', 'Whitefield', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9755, 77.748, TRUE, TRUE, 'hospital', 'https://www.google.com/maps/search/?api=1&query=12.9755%2C77.7480&utm_source=chatgpt.com', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000021', 'Clinic - Aster Care', 'Hebbal', 'Bengaluru', 'Karnataka', 'India', '560001', 13.05953, 77.59687, TRUE, TRUE, 'clinic', 'https://www.google.com/maps/search/?api=1&query=13.05953%2C77.59687', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000022', 'Clinic - Aster Care', 'JP Nagar', 'Bengaluru', 'Karnataka', 'India', '560001', 12.91642, 77.59003, TRUE, TRUE, 'clinic', 'https://www.google.com/maps/search/?api=1&query=12.91642%2C77.59003', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000023', 'Clinic - Apollo Care', 'Bannerghatta Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.8998, 77.6036, TRUE, TRUE, 'clinic', 'https://www.google.com/maps/search/?api=1&query=12.8998%2C77.6036', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000024', 'Clinic - Fortis Care', 'Bannerghatta Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.8998, 77.6036, TRUE, TRUE, 'clinic', 'https://www.google.com/maps/search/?api=1&query=12.8998%2C77.6036', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000025', 'Clinic - Manipal Care', 'Old Airport Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9638, 77.65259999999999, TRUE, TRUE, 'clinic', 'https://www.google.com/maps/search/?api=1&query=12.9638%2C77.65259999999999', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000026', 'Clinic - Manipal Care', 'Yeshwanthpur', 'Bengaluru', 'Karnataka', 'India', '560001', 13.014700000000001, 77.55539999999999, TRUE, TRUE, 'clinic', 'https://www.google.com/maps/search/?api=1&query=13.014700000000001%2C77.55539999999999', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000027', 'Clinic - Ramaiah Care', 'MS Ramaiah Nagar', 'Bengaluru', 'Karnataka', 'India', '560001', 13.03322, 77.57477999999999, TRUE, TRUE, 'clinic', 'https://www.google.com/maps/search/?api=1&query=13.03322%2C77.57477999999999', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000028', 'Clinic - Sagar Care', 'Jayanagar', 'Bengaluru', 'Karnataka', 'India', '560001', 12.933015000000001, 77.604463, TRUE, TRUE, 'clinic', 'https://www.google.com/maps/search/?api=1&query=12.933015000000001%2C77.604463', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000029', 'Clinic - St. Care', 'Koramangala', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9329, 77.63369999999999, TRUE, TRUE, 'clinic', 'https://www.google.com/maps/search/?api=1&query=12.9329%2C77.63369999999999', NOW(), NOW()),
('2a000000-0000-0000-0000-000000000030', 'Clinic - Narayana Care', 'Bommasandra', 'Bengaluru', 'Karnataka', 'India', '560001', 12.88007, 77.71952999999999, TRUE, TRUE, 'clinic', 'https://www.google.com/maps/search/?api=1&query=12.88007%2C77.71952999999999', NOW(), NOW());

INSERT INTO public.doctors (id, user_id, full_name, specialization, license_number, hospital_name, hospital_address, experience_years, consultation_fee, hospital_id, doctor_status, clinic_name, clinic_address, latitude, longitude, created_at, updated_at) VALUES
('3b000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', 'Doctor 1', 'General Physician', 'LIC0001', 'Aster CMI Hospital - Best Multispeciality Hospital in Hebbal, Bengaluru', 'Hebbal', 10, 500.00, '2a000000-0000-0000-0000-000000000021', 'APPROVED', 'Clinic - Aster Care', 'Hebbal', 13.05953, 77.59687, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000002', '1b000000-0000-0000-0000-000000000002', 'Doctor 2', 'General Physician', 'LIC0002', 'Aster RV Hospital - Best Multispeciality Hospital in J. P. Nagar, Bengaluru', 'JP Nagar', 10, 500.00, '2a000000-0000-0000-0000-000000000022', 'APPROVED', 'Clinic - Aster Care', 'JP Nagar', 12.91642, 77.59003, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000003', '1b000000-0000-0000-0000-000000000003', 'Doctor 3', 'General Physician', 'LIC0003', 'Apollo Hospitals | Best Hospital in Bannerghatta Road, Bengaluru', 'Bannerghatta Road', 10, 500.00, '2a000000-0000-0000-0000-000000000023', 'APPROVED', 'Clinic - Apollo Care', 'Bannerghatta Road', 12.8998, 77.6036, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000004', '1b000000-0000-0000-0000-000000000004', 'Doctor 4', 'General Physician', 'LIC0004', 'Fortis Hospital, Bannerghatta Road - Best Hospital in Bangalore', 'Bannerghatta Road', 10, 500.00, '2a000000-0000-0000-0000-000000000024', 'APPROVED', 'Clinic - Fortis Care', 'Bannerghatta Road', 12.8998, 77.6036, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000005', '1b000000-0000-0000-0000-000000000005', 'Doctor 5', 'General Physician', 'LIC0005', 'Manipal Hospitals', 'Old Airport Road', 10, 500.00, '2a000000-0000-0000-0000-000000000025', 'APPROVED', 'Clinic - Manipal Care', 'Old Airport Road', 12.9638, 77.65259999999999, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000006', '1b000000-0000-0000-0000-000000000006', 'Doctor 6', 'General Physician', 'LIC0006', 'Manipal Hospital Yeshwanthpur', 'Yeshwanthpur', 10, 500.00, '2a000000-0000-0000-0000-000000000026', 'APPROVED', 'Clinic - Manipal Care', 'Yeshwanthpur', 13.014700000000001, 77.55539999999999, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000007', '1b000000-0000-0000-0000-000000000007', 'Doctor 7', 'General Physician', 'LIC0007', 'Ramaiah Memorial Hospital', 'MS Ramaiah Nagar', 10, 500.00, '2a000000-0000-0000-0000-000000000027', 'APPROVED', 'Clinic - Ramaiah Care', 'MS Ramaiah Nagar', 13.03322, 77.57477999999999, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000008', '1b000000-0000-0000-0000-000000000008', 'Doctor 8', 'General Physician', 'LIC0008', 'Sagar Hospitals', 'Jayanagar', 10, 500.00, '2a000000-0000-0000-0000-000000000028', 'APPROVED', 'Clinic - Sagar Care', 'Jayanagar', 12.933015000000001, 77.604463, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000009', '1b000000-0000-0000-0000-000000000009', 'Doctor 9', 'General Physician', 'LIC0009', 'St. John''s Medical College Hospital', 'Koramangala', 10, 500.00, '2a000000-0000-0000-0000-000000000029', 'APPROVED', 'Clinic - St. Care', 'Koramangala', 12.9329, 77.63369999999999, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000010', '1b000000-0000-0000-0000-000000000010', 'Doctor 10', 'General Physician', 'LIC0010', 'Narayana Institute of Cardiac Sciences', 'Bommasandra', 10, 500.00, '2a000000-0000-0000-0000-000000000030', 'APPROVED', 'Clinic - Narayana Care', 'Bommasandra', 12.88007, 77.71952999999999, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000011', '1b000000-0000-0000-0000-000000000011', 'Doctor 11', 'General Physician', 'LIC0011', 'Bangalore Baptist Hospital', 'Hebbal', 10, 500.00, '2a000000-0000-0000-0000-000000000011', 'APPROVED', NULL, NULL, 13.035246, 77.589892, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000012', '1b000000-0000-0000-0000-000000000012', 'Doctor 12', 'General Physician', 'LIC0012', 'NIMHANS', 'Hosur Road', 10, 500.00, '2a000000-0000-0000-0000-000000000012', 'APPROVED', NULL, NULL, 12.93976, 77.59445, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000013', '1b000000-0000-0000-0000-000000000013', 'Doctor 13', 'General Physician', 'LIC0013', 'Victoria Hospital', 'City Market', 10, 500.00, '2a000000-0000-0000-0000-000000000013', 'APPROVED', NULL, NULL, 12.9635, 77.5737, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000014', '1b000000-0000-0000-0000-000000000014', 'Doctor 14', 'General Physician', 'LIC0014', 'Bowring & Lady Curzon Hospital', 'Shivajinagar', 10, 500.00, '2a000000-0000-0000-0000-000000000014', 'APPROVED', NULL, NULL, 12.97464, 77.60037, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000015', '1b000000-0000-0000-0000-000000000015', 'Doctor 15', 'General Physician', 'LIC0015', 'Jayadeva Institute of Cardiovascular Sciences', 'Jayanagar', 10, 500.00, '2a000000-0000-0000-0000-000000000015', 'APPROVED', NULL, NULL, 12.9173, 77.596, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000016', '1b000000-0000-0000-0000-000000000016', 'Doctor 16', 'General Physician', 'LIC0016', 'Mallya Hospital', 'Vittal Mallya Road', 10, 500.00, '2a000000-0000-0000-0000-000000000016', 'APPROVED', NULL, NULL, 12.9707, 77.5956, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000017', '1b000000-0000-0000-0000-000000000017', 'Doctor 17', 'General Physician', 'LIC0017', 'HCG Cancer Centre', 'Kalinga Rao Road', 10, 500.00, '2a000000-0000-0000-0000-000000000017', 'APPROVED', NULL, NULL, 12.9574, 77.5864, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000018', '1b000000-0000-0000-0000-000000000018', 'Doctor 18', 'General Physician', 'LIC0018', 'Sakra World Hospital', 'Marathahalli', 10, 500.00, '2a000000-0000-0000-0000-000000000018', 'APPROVED', NULL, NULL, 12.9352, 77.695, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000019', '1b000000-0000-0000-0000-000000000019', 'Doctor 19', 'General Physician', 'LIC0019', 'BGS Gleneagles Global Hospital', 'Kengeri', 10, 500.00, '2a000000-0000-0000-0000-000000000019', 'APPROVED', NULL, NULL, 12.8994, 77.5008, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000020', '1b000000-0000-0000-0000-000000000020', 'Doctor 20', 'General Physician', 'LIC0020', 'Manipal Hospital Whitefield', 'Whitefield', 10, 500.00, '2a000000-0000-0000-0000-000000000020', 'APPROVED', NULL, NULL, 12.9755, 77.748, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000021', '1b000000-0000-0000-0000-000000000021', 'Doctor 21', 'General Physician', 'LIC0021', 'Aster CMI Hospital - Best Multispeciality Hospital in Hebbal, Bengaluru', 'Hebbal', 10, 500.00, '2a000000-0000-0000-0000-000000000001', 'APPROVED', NULL, NULL, 13.05453, 77.59187, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000022', '1b000000-0000-0000-0000-000000000022', 'Doctor 22', 'General Physician', 'LIC0022', 'Aster RV Hospital - Best Multispeciality Hospital in J. P. Nagar, Bengaluru', 'JP Nagar', 10, 500.00, '2a000000-0000-0000-0000-000000000002', 'APPROVED', NULL, NULL, 12.91142, 77.58503, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000023', '1b000000-0000-0000-0000-000000000023', 'Doctor 23', 'General Physician', 'LIC0023', 'Apollo Hospitals | Best Hospital in Bannerghatta Road, Bengaluru', 'Bannerghatta Road', 10, 500.00, '2a000000-0000-0000-0000-000000000003', 'APPROVED', NULL, NULL, 12.8948, 77.5986, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000024', '1b000000-0000-0000-0000-000000000024', 'Doctor 24', 'General Physician', 'LIC0024', 'Fortis Hospital, Bannerghatta Road - Best Hospital in Bangalore', 'Bannerghatta Road', 10, 500.00, '2a000000-0000-0000-0000-000000000004', 'APPROVED', NULL, NULL, 12.8948, 77.5986, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000025', '1b000000-0000-0000-0000-000000000025', 'Doctor 25', 'General Physician', 'LIC0025', 'Manipal Hospitals', 'Old Airport Road', 10, 500.00, '2a000000-0000-0000-0000-000000000005', 'APPROVED', NULL, NULL, 12.9588, 77.6476, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000026', '1b000000-0000-0000-0000-000000000026', 'Doctor 26', 'General Physician', 'LIC0026', 'Manipal Hospital Yeshwanthpur', 'Yeshwanthpur', 10, 500.00, '2a000000-0000-0000-0000-000000000006', 'APPROVED', NULL, NULL, 13.0097, 77.5504, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000027', '1b000000-0000-0000-0000-000000000027', 'Doctor 27', 'General Physician', 'LIC0027', 'Ramaiah Memorial Hospital', 'MS Ramaiah Nagar', 10, 500.00, '2a000000-0000-0000-0000-000000000007', 'APPROVED', NULL, NULL, 13.02822, 77.56978, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000028', '1b000000-0000-0000-0000-000000000028', 'Doctor 28', 'General Physician', 'LIC0028', 'Sagar Hospitals', 'Jayanagar', 10, 500.00, '2a000000-0000-0000-0000-000000000008', 'APPROVED', NULL, NULL, 12.928015, 77.599463, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000029', '1b000000-0000-0000-0000-000000000029', 'Doctor 29', 'General Physician', 'LIC0029', 'St. John''s Medical College Hospital', 'Koramangala', 10, 500.00, '2a000000-0000-0000-0000-000000000009', 'APPROVED', NULL, NULL, 12.9279, 77.6287, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000030', '1b000000-0000-0000-0000-000000000030', 'Doctor 30', 'General Physician', 'LIC0030', 'Narayana Institute of Cardiac Sciences', 'Bommasandra', 10, 500.00, '2a000000-0000-0000-0000-000000000010', 'APPROVED', NULL, NULL, 12.87507, 77.71453, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000031', '1b000000-0000-0000-0000-000000000031', 'Doctor 31', 'General Physician', 'LIC0031', 'Bangalore Baptist Hospital', 'Hebbal', 10, 500.00, '2a000000-0000-0000-0000-000000000011', 'APPROVED', NULL, NULL, 13.035246, 77.589892, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000032', '1b000000-0000-0000-0000-000000000032', 'Doctor 32', 'General Physician', 'LIC0032', 'NIMHANS', 'Hosur Road', 10, 500.00, '2a000000-0000-0000-0000-000000000012', 'APPROVED', NULL, NULL, 12.93976, 77.59445, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000033', '1b000000-0000-0000-0000-000000000033', 'Doctor 33', 'General Physician', 'LIC0033', 'Victoria Hospital', 'City Market', 10, 500.00, '2a000000-0000-0000-0000-000000000013', 'APPROVED', NULL, NULL, 12.9635, 77.5737, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000034', '1b000000-0000-0000-0000-000000000034', 'Doctor 34', 'General Physician', 'LIC0034', 'Bowring & Lady Curzon Hospital', 'Shivajinagar', 10, 500.00, '2a000000-0000-0000-0000-000000000014', 'APPROVED', NULL, NULL, 12.97464, 77.60037, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000035', '1b000000-0000-0000-0000-000000000035', 'Doctor 35', 'General Physician', 'LIC0035', 'Jayadeva Institute of Cardiovascular Sciences', 'Jayanagar', 10, 500.00, '2a000000-0000-0000-0000-000000000015', 'APPROVED', NULL, NULL, 12.9173, 77.596, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000036', '1b000000-0000-0000-0000-000000000036', 'Doctor 36', 'General Physician', 'LIC0036', 'Mallya Hospital', 'Vittal Mallya Road', 10, 500.00, '2a000000-0000-0000-0000-000000000016', 'APPROVED', NULL, NULL, 12.9707, 77.5956, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000037', '1b000000-0000-0000-0000-000000000037', 'Doctor 37', 'General Physician', 'LIC0037', 'HCG Cancer Centre', 'Kalinga Rao Road', 10, 500.00, '2a000000-0000-0000-0000-000000000017', 'APPROVED', NULL, NULL, 12.9574, 77.5864, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000038', '1b000000-0000-0000-0000-000000000038', 'Doctor 38', 'General Physician', 'LIC0038', 'Sakra World Hospital', 'Marathahalli', 10, 500.00, '2a000000-0000-0000-0000-000000000018', 'APPROVED', NULL, NULL, 12.9352, 77.695, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000039', '1b000000-0000-0000-0000-000000000039', 'Doctor 39', 'General Physician', 'LIC0039', 'BGS Gleneagles Global Hospital', 'Kengeri', 10, 500.00, '2a000000-0000-0000-0000-000000000019', 'APPROVED', NULL, NULL, 12.8994, 77.5008, NOW(), NOW()),
('3b000000-0000-0000-0000-000000000040', '1b000000-0000-0000-0000-000000000040', 'Doctor 40', 'General Physician', 'LIC0040', 'Manipal Hospital Whitefield', 'Whitefield', 10, 500.00, '2a000000-0000-0000-0000-000000000020', 'APPROVED', NULL, NULL, 12.9755, 77.748, NOW(), NOW());

INSERT INTO public.doctor_locations (id, doctor_id, location_type, location_name, hospital_id, address, city, state, country, pincode, latitude, longitude, is_primary, is_active, verification_status, created_at, updated_at) VALUES
('4b000000-0000-0000-0000-000000000001', '3b000000-0000-0000-0000-000000000001', 'CLINIC', 'Clinic - Aster Care', '2a000000-0000-0000-0000-000000000021', 'Hebbal', 'Bengaluru', 'Karnataka', 'India', '560001', 13.05953, 77.59687, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000041', '3b000000-0000-0000-0000-000000000001', 'HOSPITAL', 'Aster CMI Hospital - Best Multispeciality Hospital in Hebbal, Bengaluru', '2a000000-0000-0000-0000-000000000001', 'Hebbal', 'Bengaluru', 'Karnataka', 'India', '560001', 13.05453, 77.59187, FALSE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000002', '3b000000-0000-0000-0000-000000000002', 'CLINIC', 'Clinic - Aster Care', '2a000000-0000-0000-0000-000000000022', 'JP Nagar', 'Bengaluru', 'Karnataka', 'India', '560001', 12.91642, 77.59003, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000042', '3b000000-0000-0000-0000-000000000002', 'HOSPITAL', 'Aster RV Hospital - Best Multispeciality Hospital in J. P. Nagar, Bengaluru', '2a000000-0000-0000-0000-000000000002', 'JP Nagar', 'Bengaluru', 'Karnataka', 'India', '560001', 12.91142, 77.58503, FALSE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000003', '3b000000-0000-0000-0000-000000000003', 'CLINIC', 'Clinic - Apollo Care', '2a000000-0000-0000-0000-000000000023', 'Bannerghatta Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.8998, 77.6036, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000043', '3b000000-0000-0000-0000-000000000003', 'HOSPITAL', 'Apollo Hospitals | Best Hospital in Bannerghatta Road, Bengaluru', '2a000000-0000-0000-0000-000000000003', 'Bannerghatta Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.8948, 77.5986, FALSE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000004', '3b000000-0000-0000-0000-000000000004', 'CLINIC', 'Clinic - Fortis Care', '2a000000-0000-0000-0000-000000000024', 'Bannerghatta Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.8998, 77.6036, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000044', '3b000000-0000-0000-0000-000000000004', 'HOSPITAL', 'Fortis Hospital, Bannerghatta Road - Best Hospital in Bangalore', '2a000000-0000-0000-0000-000000000004', 'Bannerghatta Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.8948, 77.5986, FALSE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000005', '3b000000-0000-0000-0000-000000000005', 'CLINIC', 'Clinic - Manipal Care', '2a000000-0000-0000-0000-000000000025', 'Old Airport Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9638, 77.65259999999999, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000045', '3b000000-0000-0000-0000-000000000005', 'HOSPITAL', 'Manipal Hospitals', '2a000000-0000-0000-0000-000000000005', 'Old Airport Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9588, 77.6476, FALSE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000006', '3b000000-0000-0000-0000-000000000006', 'CLINIC', 'Clinic - Manipal Care', '2a000000-0000-0000-0000-000000000026', 'Yeshwanthpur', 'Bengaluru', 'Karnataka', 'India', '560001', 13.014700000000001, 77.55539999999999, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000046', '3b000000-0000-0000-0000-000000000006', 'HOSPITAL', 'Manipal Hospital Yeshwanthpur', '2a000000-0000-0000-0000-000000000006', 'Yeshwanthpur', 'Bengaluru', 'Karnataka', 'India', '560001', 13.0097, 77.5504, FALSE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000007', '3b000000-0000-0000-0000-000000000007', 'CLINIC', 'Clinic - Ramaiah Care', '2a000000-0000-0000-0000-000000000027', 'MS Ramaiah Nagar', 'Bengaluru', 'Karnataka', 'India', '560001', 13.03322, 77.57477999999999, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000047', '3b000000-0000-0000-0000-000000000007', 'HOSPITAL', 'Ramaiah Memorial Hospital', '2a000000-0000-0000-0000-000000000007', 'MS Ramaiah Nagar', 'Bengaluru', 'Karnataka', 'India', '560001', 13.02822, 77.56978, FALSE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000008', '3b000000-0000-0000-0000-000000000008', 'CLINIC', 'Clinic - Sagar Care', '2a000000-0000-0000-0000-000000000028', 'Jayanagar', 'Bengaluru', 'Karnataka', 'India', '560001', 12.933015000000001, 77.604463, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000048', '3b000000-0000-0000-0000-000000000008', 'HOSPITAL', 'Sagar Hospitals', '2a000000-0000-0000-0000-000000000008', 'Jayanagar', 'Bengaluru', 'Karnataka', 'India', '560001', 12.928015, 77.599463, FALSE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000009', '3b000000-0000-0000-0000-000000000009', 'CLINIC', 'Clinic - St. Care', '2a000000-0000-0000-0000-000000000029', 'Koramangala', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9329, 77.63369999999999, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000049', '3b000000-0000-0000-0000-000000000009', 'HOSPITAL', 'St. John''s Medical College Hospital', '2a000000-0000-0000-0000-000000000009', 'Koramangala', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9279, 77.6287, FALSE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000010', '3b000000-0000-0000-0000-000000000010', 'CLINIC', 'Clinic - Narayana Care', '2a000000-0000-0000-0000-000000000030', 'Bommasandra', 'Bengaluru', 'Karnataka', 'India', '560001', 12.88007, 77.71952999999999, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000050', '3b000000-0000-0000-0000-000000000010', 'HOSPITAL', 'Narayana Institute of Cardiac Sciences', '2a000000-0000-0000-0000-000000000010', 'Bommasandra', 'Bengaluru', 'Karnataka', 'India', '560001', 12.87507, 77.71453, FALSE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000011', '3b000000-0000-0000-0000-000000000011', 'HOSPITAL', 'Bangalore Baptist Hospital', '2a000000-0000-0000-0000-000000000011', 'Hebbal', 'Bengaluru', 'Karnataka', 'India', '560001', 13.035246, 77.589892, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000012', '3b000000-0000-0000-0000-000000000012', 'HOSPITAL', 'NIMHANS', '2a000000-0000-0000-0000-000000000012', 'Hosur Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.93976, 77.59445, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000013', '3b000000-0000-0000-0000-000000000013', 'HOSPITAL', 'Victoria Hospital', '2a000000-0000-0000-0000-000000000013', 'City Market', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9635, 77.5737, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000014', '3b000000-0000-0000-0000-000000000014', 'HOSPITAL', 'Bowring & Lady Curzon Hospital', '2a000000-0000-0000-0000-000000000014', 'Shivajinagar', 'Bengaluru', 'Karnataka', 'India', '560001', 12.97464, 77.60037, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000015', '3b000000-0000-0000-0000-000000000015', 'HOSPITAL', 'Jayadeva Institute of Cardiovascular Sciences', '2a000000-0000-0000-0000-000000000015', 'Jayanagar', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9173, 77.596, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000016', '3b000000-0000-0000-0000-000000000016', 'HOSPITAL', 'Mallya Hospital', '2a000000-0000-0000-0000-000000000016', 'Vittal Mallya Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9707, 77.5956, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000017', '3b000000-0000-0000-0000-000000000017', 'HOSPITAL', 'HCG Cancer Centre', '2a000000-0000-0000-0000-000000000017', 'Kalinga Rao Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9574, 77.5864, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000018', '3b000000-0000-0000-0000-000000000018', 'HOSPITAL', 'Sakra World Hospital', '2a000000-0000-0000-0000-000000000018', 'Marathahalli', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9352, 77.695, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000019', '3b000000-0000-0000-0000-000000000019', 'HOSPITAL', 'BGS Gleneagles Global Hospital', '2a000000-0000-0000-0000-000000000019', 'Kengeri', 'Bengaluru', 'Karnataka', 'India', '560001', 12.8994, 77.5008, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000020', '3b000000-0000-0000-0000-000000000020', 'HOSPITAL', 'Manipal Hospital Whitefield', '2a000000-0000-0000-0000-000000000020', 'Whitefield', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9755, 77.748, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000021', '3b000000-0000-0000-0000-000000000021', 'HOSPITAL', 'Aster CMI Hospital - Best Multispeciality Hospital in Hebbal, Bengaluru', '2a000000-0000-0000-0000-000000000001', 'Hebbal', 'Bengaluru', 'Karnataka', 'India', '560001', 13.05453, 77.59187, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000022', '3b000000-0000-0000-0000-000000000022', 'HOSPITAL', 'Aster RV Hospital - Best Multispeciality Hospital in J. P. Nagar, Bengaluru', '2a000000-0000-0000-0000-000000000002', 'JP Nagar', 'Bengaluru', 'Karnataka', 'India', '560001', 12.91142, 77.58503, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000023', '3b000000-0000-0000-0000-000000000023', 'HOSPITAL', 'Apollo Hospitals | Best Hospital in Bannerghatta Road, Bengaluru', '2a000000-0000-0000-0000-000000000003', 'Bannerghatta Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.8948, 77.5986, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000024', '3b000000-0000-0000-0000-000000000024', 'HOSPITAL', 'Fortis Hospital, Bannerghatta Road - Best Hospital in Bangalore', '2a000000-0000-0000-0000-000000000004', 'Bannerghatta Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.8948, 77.5986, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000025', '3b000000-0000-0000-0000-000000000025', 'HOSPITAL', 'Manipal Hospitals', '2a000000-0000-0000-0000-000000000005', 'Old Airport Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9588, 77.6476, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000026', '3b000000-0000-0000-0000-000000000026', 'HOSPITAL', 'Manipal Hospital Yeshwanthpur', '2a000000-0000-0000-0000-000000000006', 'Yeshwanthpur', 'Bengaluru', 'Karnataka', 'India', '560001', 13.0097, 77.5504, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000027', '3b000000-0000-0000-0000-000000000027', 'HOSPITAL', 'Ramaiah Memorial Hospital', '2a000000-0000-0000-0000-000000000007', 'MS Ramaiah Nagar', 'Bengaluru', 'Karnataka', 'India', '560001', 13.02822, 77.56978, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000028', '3b000000-0000-0000-0000-000000000028', 'HOSPITAL', 'Sagar Hospitals', '2a000000-0000-0000-0000-000000000008', 'Jayanagar', 'Bengaluru', 'Karnataka', 'India', '560001', 12.928015, 77.599463, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000029', '3b000000-0000-0000-0000-000000000029', 'HOSPITAL', 'St. John''s Medical College Hospital', '2a000000-0000-0000-0000-000000000009', 'Koramangala', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9279, 77.6287, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000030', '3b000000-0000-0000-0000-000000000030', 'HOSPITAL', 'Narayana Institute of Cardiac Sciences', '2a000000-0000-0000-0000-000000000010', 'Bommasandra', 'Bengaluru', 'Karnataka', 'India', '560001', 12.87507, 77.71453, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000031', '3b000000-0000-0000-0000-000000000031', 'HOSPITAL', 'Bangalore Baptist Hospital', '2a000000-0000-0000-0000-000000000011', 'Hebbal', 'Bengaluru', 'Karnataka', 'India', '560001', 13.035246, 77.589892, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000032', '3b000000-0000-0000-0000-000000000032', 'HOSPITAL', 'NIMHANS', '2a000000-0000-0000-0000-000000000012', 'Hosur Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.93976, 77.59445, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000033', '3b000000-0000-0000-0000-000000000033', 'HOSPITAL', 'Victoria Hospital', '2a000000-0000-0000-0000-000000000013', 'City Market', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9635, 77.5737, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000034', '3b000000-0000-0000-0000-000000000034', 'HOSPITAL', 'Bowring & Lady Curzon Hospital', '2a000000-0000-0000-0000-000000000014', 'Shivajinagar', 'Bengaluru', 'Karnataka', 'India', '560001', 12.97464, 77.60037, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000035', '3b000000-0000-0000-0000-000000000035', 'HOSPITAL', 'Jayadeva Institute of Cardiovascular Sciences', '2a000000-0000-0000-0000-000000000015', 'Jayanagar', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9173, 77.596, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000036', '3b000000-0000-0000-0000-000000000036', 'HOSPITAL', 'Mallya Hospital', '2a000000-0000-0000-0000-000000000016', 'Vittal Mallya Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9707, 77.5956, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000037', '3b000000-0000-0000-0000-000000000037', 'HOSPITAL', 'HCG Cancer Centre', '2a000000-0000-0000-0000-000000000017', 'Kalinga Rao Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9574, 77.5864, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000038', '3b000000-0000-0000-0000-000000000038', 'HOSPITAL', 'Sakra World Hospital', '2a000000-0000-0000-0000-000000000018', 'Marathahalli', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9352, 77.695, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000039', '3b000000-0000-0000-0000-000000000039', 'HOSPITAL', 'BGS Gleneagles Global Hospital', '2a000000-0000-0000-0000-000000000019', 'Kengeri', 'Bengaluru', 'Karnataka', 'India', '560001', 12.8994, 77.5008, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000040', '3b000000-0000-0000-0000-000000000040', 'HOSPITAL', 'Manipal Hospital Whitefield', '2a000000-0000-0000-0000-000000000020', 'Whitefield', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9755, 77.748, TRUE, TRUE, 'VERIFIED', NOW(), NOW());

INSERT INTO public.patients (id, user_id, full_name, date_of_birth, gender, blood_group, city, state, pincode, pin_hash, created_at, updated_at) VALUES
('3c000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000001', 'Patient 1', '1990-01-01', 'MALE', 'O+', 'Bengaluru', 'Karnataka', '560001', 'hash123', NOW(), NOW()),
('3c000000-0000-0000-0000-000000000002', '1c000000-0000-0000-0000-000000000002', 'Patient 2', '1990-01-01', 'MALE', 'O+', 'Bengaluru', 'Karnataka', '560001', 'hash123', NOW(), NOW()),
('3c000000-0000-0000-0000-000000000003', '1c000000-0000-0000-0000-000000000003', 'Patient 3', '1990-01-01', 'MALE', 'O+', 'Bengaluru', 'Karnataka', '560001', 'hash123', NOW(), NOW()),
('3c000000-0000-0000-0000-000000000004', '1c000000-0000-0000-0000-000000000004', 'Patient 4', '1990-01-01', 'MALE', 'O+', 'Bengaluru', 'Karnataka', '560001', 'hash123', NOW(), NOW()),
('3c000000-0000-0000-0000-000000000005', '1c000000-0000-0000-0000-000000000005', 'Patient 5', '1990-01-01', 'MALE', 'O+', 'Bengaluru', 'Karnataka', '560001', 'hash123', NOW(), NOW());

INSERT INTO public.pharmacies (id, user_id, business_name, license_number, address, city, state, contact_number, qr_identifier, created_at, updated_at) VALUES
('3d000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000001', 'Pharmacy 1', 'PHARMLIC0001', 'Hebbal', 'Bengaluru', 'Karnataka', '9876543210', 'QR1', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000002', '1d000000-0000-0000-0000-000000000002', 'Pharmacy 2', 'PHARMLIC0002', 'JP Nagar', 'Bengaluru', 'Karnataka', '9876543210', 'QR2', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000003', '1d000000-0000-0000-0000-000000000003', 'Pharmacy 3', 'PHARMLIC0003', 'Bannerghatta Road', 'Bengaluru', 'Karnataka', '9876543210', 'QR3', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000004', '1d000000-0000-0000-0000-000000000004', 'Pharmacy 4', 'PHARMLIC0004', 'Bannerghatta Road', 'Bengaluru', 'Karnataka', '9876543210', 'QR4', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000005', '1d000000-0000-0000-0000-000000000005', 'Pharmacy 5', 'PHARMLIC0005', 'Old Airport Road', 'Bengaluru', 'Karnataka', '9876543210', 'QR5', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000006', '1d000000-0000-0000-0000-000000000006', 'Pharmacy 6', 'PHARMLIC0006', 'Yeshwanthpur', 'Bengaluru', 'Karnataka', '9876543210', 'QR6', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000007', '1d000000-0000-0000-0000-000000000007', 'Pharmacy 7', 'PHARMLIC0007', 'MS Ramaiah Nagar', 'Bengaluru', 'Karnataka', '9876543210', 'QR7', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000008', '1d000000-0000-0000-0000-000000000008', 'Pharmacy 8', 'PHARMLIC0008', 'Jayanagar', 'Bengaluru', 'Karnataka', '9876543210', 'QR8', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000009', '1d000000-0000-0000-0000-000000000009', 'Pharmacy 9', 'PHARMLIC0009', 'Koramangala', 'Bengaluru', 'Karnataka', '9876543210', 'QR9', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000010', '1d000000-0000-0000-0000-000000000010', 'Pharmacy 10', 'PHARMLIC0010', 'Bommasandra', 'Bengaluru', 'Karnataka', '9876543210', 'QR10', NOW(), NOW());

INSERT INTO public.pharmacy_locations (id, pharmacy_id, location_name, address, city, state, country, pincode, latitude, longitude, is_primary, is_active, verification_status, created_at, updated_at) VALUES
('4d000000-0000-0000-0000-000000000001', '3d000000-0000-0000-0000-000000000001', 'Pharmacy 1 Main', 'Hebbal', 'Bengaluru', 'Karnataka', 'India', '560001', 13.05453, 77.59187, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4d000000-0000-0000-0000-000000000002', '3d000000-0000-0000-0000-000000000002', 'Pharmacy 2 Main', 'JP Nagar', 'Bengaluru', 'Karnataka', 'India', '560001', 12.91142, 77.58503, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4d000000-0000-0000-0000-000000000003', '3d000000-0000-0000-0000-000000000003', 'Pharmacy 3 Main', 'Bannerghatta Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.8948, 77.5986, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4d000000-0000-0000-0000-000000000004', '3d000000-0000-0000-0000-000000000004', 'Pharmacy 4 Main', 'Bannerghatta Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.8948, 77.5986, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4d000000-0000-0000-0000-000000000005', '3d000000-0000-0000-0000-000000000005', 'Pharmacy 5 Main', 'Old Airport Road', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9588, 77.6476, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4d000000-0000-0000-0000-000000000006', '3d000000-0000-0000-0000-000000000006', 'Pharmacy 6 Main', 'Yeshwanthpur', 'Bengaluru', 'Karnataka', 'India', '560001', 13.0097, 77.5504, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4d000000-0000-0000-0000-000000000007', '3d000000-0000-0000-0000-000000000007', 'Pharmacy 7 Main', 'MS Ramaiah Nagar', 'Bengaluru', 'Karnataka', 'India', '560001', 13.02822, 77.56978, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4d000000-0000-0000-0000-000000000008', '3d000000-0000-0000-0000-000000000008', 'Pharmacy 8 Main', 'Jayanagar', 'Bengaluru', 'Karnataka', 'India', '560001', 12.928015, 77.599463, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4d000000-0000-0000-0000-000000000009', '3d000000-0000-0000-0000-000000000009', 'Pharmacy 9 Main', 'Koramangala', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9279, 77.6287, TRUE, TRUE, 'VERIFIED', NOW(), NOW()),
('4d000000-0000-0000-0000-000000000010', '3d000000-0000-0000-0000-000000000010', 'Pharmacy 10 Main', 'Bommasandra', 'Bengaluru', 'Karnataka', 'India', '560001', 12.87507, 77.71453, TRUE, TRUE, 'VERIFIED', NOW(), NOW());

INSERT INTO public.doctor_availability (id, doctor_id, day_of_week, start_time, end_time, is_available) VALUES
('5b000000-0000-0000-0000-000000000001', '3b000000-0000-0000-0000-000000000001', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000002', '3b000000-0000-0000-0000-000000000001', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000003', '3b000000-0000-0000-0000-000000000001', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000004', '3b000000-0000-0000-0000-000000000001', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000005', '3b000000-0000-0000-0000-000000000001', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000006', '3b000000-0000-0000-0000-000000000002', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000007', '3b000000-0000-0000-0000-000000000002', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000008', '3b000000-0000-0000-0000-000000000002', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000009', '3b000000-0000-0000-0000-000000000002', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000010', '3b000000-0000-0000-0000-000000000002', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000011', '3b000000-0000-0000-0000-000000000003', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000012', '3b000000-0000-0000-0000-000000000003', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000013', '3b000000-0000-0000-0000-000000000003', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000014', '3b000000-0000-0000-0000-000000000003', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000015', '3b000000-0000-0000-0000-000000000003', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000016', '3b000000-0000-0000-0000-000000000004', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000017', '3b000000-0000-0000-0000-000000000004', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000018', '3b000000-0000-0000-0000-000000000004', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000019', '3b000000-0000-0000-0000-000000000004', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000020', '3b000000-0000-0000-0000-000000000004', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000021', '3b000000-0000-0000-0000-000000000005', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000022', '3b000000-0000-0000-0000-000000000005', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000023', '3b000000-0000-0000-0000-000000000005', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000024', '3b000000-0000-0000-0000-000000000005', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000025', '3b000000-0000-0000-0000-000000000005', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000026', '3b000000-0000-0000-0000-000000000006', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000027', '3b000000-0000-0000-0000-000000000006', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000028', '3b000000-0000-0000-0000-000000000006', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000029', '3b000000-0000-0000-0000-000000000006', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000030', '3b000000-0000-0000-0000-000000000006', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000031', '3b000000-0000-0000-0000-000000000007', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000032', '3b000000-0000-0000-0000-000000000007', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000033', '3b000000-0000-0000-0000-000000000007', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000034', '3b000000-0000-0000-0000-000000000007', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000035', '3b000000-0000-0000-0000-000000000007', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000036', '3b000000-0000-0000-0000-000000000008', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000037', '3b000000-0000-0000-0000-000000000008', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000038', '3b000000-0000-0000-0000-000000000008', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000039', '3b000000-0000-0000-0000-000000000008', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000040', '3b000000-0000-0000-0000-000000000008', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000041', '3b000000-0000-0000-0000-000000000009', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000042', '3b000000-0000-0000-0000-000000000009', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000043', '3b000000-0000-0000-0000-000000000009', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000044', '3b000000-0000-0000-0000-000000000009', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000045', '3b000000-0000-0000-0000-000000000009', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000046', '3b000000-0000-0000-0000-000000000010', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000047', '3b000000-0000-0000-0000-000000000010', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000048', '3b000000-0000-0000-0000-000000000010', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000049', '3b000000-0000-0000-0000-000000000010', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000050', '3b000000-0000-0000-0000-000000000010', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000051', '3b000000-0000-0000-0000-000000000011', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000052', '3b000000-0000-0000-0000-000000000011', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000053', '3b000000-0000-0000-0000-000000000011', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000054', '3b000000-0000-0000-0000-000000000011', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000055', '3b000000-0000-0000-0000-000000000011', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000056', '3b000000-0000-0000-0000-000000000012', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000057', '3b000000-0000-0000-0000-000000000012', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000058', '3b000000-0000-0000-0000-000000000012', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000059', '3b000000-0000-0000-0000-000000000012', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000060', '3b000000-0000-0000-0000-000000000012', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000061', '3b000000-0000-0000-0000-000000000013', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000062', '3b000000-0000-0000-0000-000000000013', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000063', '3b000000-0000-0000-0000-000000000013', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000064', '3b000000-0000-0000-0000-000000000013', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000065', '3b000000-0000-0000-0000-000000000013', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000066', '3b000000-0000-0000-0000-000000000014', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000067', '3b000000-0000-0000-0000-000000000014', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000068', '3b000000-0000-0000-0000-000000000014', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000069', '3b000000-0000-0000-0000-000000000014', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000070', '3b000000-0000-0000-0000-000000000014', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000071', '3b000000-0000-0000-0000-000000000015', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000072', '3b000000-0000-0000-0000-000000000015', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000073', '3b000000-0000-0000-0000-000000000015', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000074', '3b000000-0000-0000-0000-000000000015', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000075', '3b000000-0000-0000-0000-000000000015', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000076', '3b000000-0000-0000-0000-000000000016', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000077', '3b000000-0000-0000-0000-000000000016', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000078', '3b000000-0000-0000-0000-000000000016', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000079', '3b000000-0000-0000-0000-000000000016', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000080', '3b000000-0000-0000-0000-000000000016', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000081', '3b000000-0000-0000-0000-000000000017', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000082', '3b000000-0000-0000-0000-000000000017', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000083', '3b000000-0000-0000-0000-000000000017', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000084', '3b000000-0000-0000-0000-000000000017', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000085', '3b000000-0000-0000-0000-000000000017', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000086', '3b000000-0000-0000-0000-000000000018', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000087', '3b000000-0000-0000-0000-000000000018', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000088', '3b000000-0000-0000-0000-000000000018', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000089', '3b000000-0000-0000-0000-000000000018', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000090', '3b000000-0000-0000-0000-000000000018', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000091', '3b000000-0000-0000-0000-000000000019', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000092', '3b000000-0000-0000-0000-000000000019', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000093', '3b000000-0000-0000-0000-000000000019', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000094', '3b000000-0000-0000-0000-000000000019', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000095', '3b000000-0000-0000-0000-000000000019', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000096', '3b000000-0000-0000-0000-000000000020', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000097', '3b000000-0000-0000-0000-000000000020', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000098', '3b000000-0000-0000-0000-000000000020', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000099', '3b000000-0000-0000-0000-000000000020', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000100', '3b000000-0000-0000-0000-000000000020', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000101', '3b000000-0000-0000-0000-000000000021', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000102', '3b000000-0000-0000-0000-000000000021', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000103', '3b000000-0000-0000-0000-000000000021', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000104', '3b000000-0000-0000-0000-000000000021', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000105', '3b000000-0000-0000-0000-000000000021', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000106', '3b000000-0000-0000-0000-000000000022', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000107', '3b000000-0000-0000-0000-000000000022', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000108', '3b000000-0000-0000-0000-000000000022', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000109', '3b000000-0000-0000-0000-000000000022', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000110', '3b000000-0000-0000-0000-000000000022', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000111', '3b000000-0000-0000-0000-000000000023', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000112', '3b000000-0000-0000-0000-000000000023', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000113', '3b000000-0000-0000-0000-000000000023', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000114', '3b000000-0000-0000-0000-000000000023', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000115', '3b000000-0000-0000-0000-000000000023', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000116', '3b000000-0000-0000-0000-000000000024', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000117', '3b000000-0000-0000-0000-000000000024', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000118', '3b000000-0000-0000-0000-000000000024', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000119', '3b000000-0000-0000-0000-000000000024', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000120', '3b000000-0000-0000-0000-000000000024', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000121', '3b000000-0000-0000-0000-000000000025', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000122', '3b000000-0000-0000-0000-000000000025', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000123', '3b000000-0000-0000-0000-000000000025', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000124', '3b000000-0000-0000-0000-000000000025', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000125', '3b000000-0000-0000-0000-000000000025', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000126', '3b000000-0000-0000-0000-000000000026', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000127', '3b000000-0000-0000-0000-000000000026', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000128', '3b000000-0000-0000-0000-000000000026', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000129', '3b000000-0000-0000-0000-000000000026', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000130', '3b000000-0000-0000-0000-000000000026', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000131', '3b000000-0000-0000-0000-000000000027', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000132', '3b000000-0000-0000-0000-000000000027', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000133', '3b000000-0000-0000-0000-000000000027', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000134', '3b000000-0000-0000-0000-000000000027', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000135', '3b000000-0000-0000-0000-000000000027', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000136', '3b000000-0000-0000-0000-000000000028', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000137', '3b000000-0000-0000-0000-000000000028', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000138', '3b000000-0000-0000-0000-000000000028', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000139', '3b000000-0000-0000-0000-000000000028', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000140', '3b000000-0000-0000-0000-000000000028', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000141', '3b000000-0000-0000-0000-000000000029', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000142', '3b000000-0000-0000-0000-000000000029', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000143', '3b000000-0000-0000-0000-000000000029', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000144', '3b000000-0000-0000-0000-000000000029', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000145', '3b000000-0000-0000-0000-000000000029', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000146', '3b000000-0000-0000-0000-000000000030', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000147', '3b000000-0000-0000-0000-000000000030', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000148', '3b000000-0000-0000-0000-000000000030', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000149', '3b000000-0000-0000-0000-000000000030', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000150', '3b000000-0000-0000-0000-000000000030', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000151', '3b000000-0000-0000-0000-000000000031', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000152', '3b000000-0000-0000-0000-000000000031', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000153', '3b000000-0000-0000-0000-000000000031', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000154', '3b000000-0000-0000-0000-000000000031', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000155', '3b000000-0000-0000-0000-000000000031', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000156', '3b000000-0000-0000-0000-000000000032', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000157', '3b000000-0000-0000-0000-000000000032', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000158', '3b000000-0000-0000-0000-000000000032', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000159', '3b000000-0000-0000-0000-000000000032', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000160', '3b000000-0000-0000-0000-000000000032', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000161', '3b000000-0000-0000-0000-000000000033', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000162', '3b000000-0000-0000-0000-000000000033', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000163', '3b000000-0000-0000-0000-000000000033', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000164', '3b000000-0000-0000-0000-000000000033', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000165', '3b000000-0000-0000-0000-000000000033', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000166', '3b000000-0000-0000-0000-000000000034', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000167', '3b000000-0000-0000-0000-000000000034', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000168', '3b000000-0000-0000-0000-000000000034', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000169', '3b000000-0000-0000-0000-000000000034', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000170', '3b000000-0000-0000-0000-000000000034', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000171', '3b000000-0000-0000-0000-000000000035', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000172', '3b000000-0000-0000-0000-000000000035', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000173', '3b000000-0000-0000-0000-000000000035', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000174', '3b000000-0000-0000-0000-000000000035', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000175', '3b000000-0000-0000-0000-000000000035', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000176', '3b000000-0000-0000-0000-000000000036', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000177', '3b000000-0000-0000-0000-000000000036', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000178', '3b000000-0000-0000-0000-000000000036', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000179', '3b000000-0000-0000-0000-000000000036', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000180', '3b000000-0000-0000-0000-000000000036', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000181', '3b000000-0000-0000-0000-000000000037', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000182', '3b000000-0000-0000-0000-000000000037', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000183', '3b000000-0000-0000-0000-000000000037', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000184', '3b000000-0000-0000-0000-000000000037', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000185', '3b000000-0000-0000-0000-000000000037', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000186', '3b000000-0000-0000-0000-000000000038', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000187', '3b000000-0000-0000-0000-000000000038', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000188', '3b000000-0000-0000-0000-000000000038', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000189', '3b000000-0000-0000-0000-000000000038', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000190', '3b000000-0000-0000-0000-000000000038', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000191', '3b000000-0000-0000-0000-000000000039', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000192', '3b000000-0000-0000-0000-000000000039', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000193', '3b000000-0000-0000-0000-000000000039', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000194', '3b000000-0000-0000-0000-000000000039', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000195', '3b000000-0000-0000-0000-000000000039', 5, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000196', '3b000000-0000-0000-0000-000000000040', 1, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000197', '3b000000-0000-0000-0000-000000000040', 2, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000198', '3b000000-0000-0000-0000-000000000040', 3, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000199', '3b000000-0000-0000-0000-000000000040', 4, '09:00:00', '17:00:00', TRUE),
('5b000000-0000-0000-0000-000000000200', '3b000000-0000-0000-0000-000000000040', 5, '09:00:00', '17:00:00', TRUE)
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
('9f000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000001', 'New Prescription', 'Dr. Sharma has created a new prescription for you.', 'INFO', FALSE),
('9f000000-0000-0000-0000-000000000002', '1d000000-0000-0000-0000-000000000001', 'New Order Received', 'A new order has been placed for store pickup.', 'ORDER', FALSE)
ON CONFLICT (id) DO NOTHING;

COMMIT;




-- ==============================================================================
-- SOURCE: 09_seed_dummy_data_v2.sql
-- ==============================================================================
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
('3edad050-ca2f-4e19-83f3-97bab710443a', '1c000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', (SELECT id FROM public.medical_record_categories WHERE name = 'Lab Reports' LIMIT 1), 'Complete Blood Count (CBC)', 'Routine CBC panel ordered by Dr. Sharma', '2026-09-12 12:32:40', '2026-09-12 12:32:40');

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
('8ca47067-e58a-4378-b5b4-5d152b1f0347', '1c000000-0000-0000-0000-000000000001', 'APPOINTMENT', 'Appointment Confirmed', 'Your appointment with Dr. Sharma is confirmed for tomorrow.', FALSE, '2026-09-12 12:32:40', '2026-09-12 12:32:40'),
('ddd949f3-d78a-4c08-ab63-6c58c00acc84', '1d000000-0000-0000-0000-000000000001', 'ORDER', 'New Order Received', 'You have received a new order.', FALSE, '2026-09-12 12:32:40', '2026-09-12 12:32:40');
    
COMMIT;



-- ==============================================================================
-- SOURCE: 10_cleanup_live_demo_data.sql
-- ==============================================================================
-- ==========================================
-- MedSync Demo Data Cleanup Migration
-- ==========================================

BEGIN;

-- Update auth.users metadata
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Super Admin"') WHERE email = '1a000000-0000-0000-0000-000000000001';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Aadhya Patel"') WHERE email = '1b000000-0000-0000-0000-000000000001';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Aarav Iyer"') WHERE email = '1b000000-0000-0000-0000-000000000002';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Shaurya Reddy"') WHERE email = '1b000000-0000-0000-0000-000000000003';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Ishaan Singh"') WHERE email = '1b000000-0000-0000-0000-000000000004';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Isha Patel"') WHERE email = '1b000000-0000-0000-0000-000000000005';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Kavya Iyer"') WHERE email = '1b000000-0000-0000-0000-000000000006';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Swati Nair"') WHERE email = '1b000000-0000-0000-0000-000000000007';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Aditya Menon"') WHERE email = '1b000000-0000-0000-0000-000000000008';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Vikram Sharma"') WHERE email = '1b000000-0000-0000-0000-000000000009';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Aarav Patel"') WHERE email = '1b000000-0000-0000-0000-000000000010';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Krishna Reddy"') WHERE email = '1b000000-0000-0000-0000-000000000011';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Diya Menon"') WHERE email = '1b000000-0000-0000-0000-000000000012';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Aarav Nair"') WHERE email = '1b000000-0000-0000-0000-000000000013';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Krishna Iyer"') WHERE email = '1b000000-0000-0000-0000-000000000014';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Aadhya Iyer"') WHERE email = '1b000000-0000-0000-0000-000000000015';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Vihaan Iyer"') WHERE email = '1c000000-0000-0000-0000-000000000001';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Suresh Nair"') WHERE email = '1c000000-0000-0000-0000-000000000002';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Arjun Chauhan"') WHERE email = '1c000000-0000-0000-0000-000000000003';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Amit Patel"') WHERE email = '1c000000-0000-0000-0000-000000000004';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Saanvi Kumar"') WHERE email = '1c000000-0000-0000-0000-000000000005';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Anjali Joshi"') WHERE email = '1c000000-0000-0000-0000-000000000001';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Riya Chauhan"') WHERE email = '1c000000-0000-0000-0000-000000000002';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Shruti Gupta"') WHERE email = '1c000000-0000-0000-0000-000000000003';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Priya Reddy"') WHERE email = '1c000000-0000-0000-0000-000000000004';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Sneha Patel"') WHERE email = '1c000000-0000-0000-0000-000000000005';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Vihaan Joshi"') WHERE email = '1c000000-0000-0000-0000-000000000001';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Ishaan Verma"') WHERE email = '1c000000-0000-0000-0000-000000000002';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Atharv Patel"') WHERE email = '1c000000-0000-0000-0000-000000000003';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Shruti Reddy"') WHERE email = '1c000000-0000-0000-0000-000000000004';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Shruti Patel"') WHERE email = '1c000000-0000-0000-0000-000000000005';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Amit Kumar"') WHERE email = '1c000000-0000-0000-0000-000000000001';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Suresh Joshi"') WHERE email = '1c000000-0000-0000-0000-000000000002';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Anjali Gupta"') WHERE email = '1c000000-0000-0000-0000-000000000003';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Rohan Gupta"') WHERE email = '1c000000-0000-0000-0000-000000000004';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Rahul Reddy"') WHERE email = '1c000000-0000-0000-0000-000000000005';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Wellness Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000001';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Pulse Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000002';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"GoodHealth Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000003';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"CarePlus Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000004';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"GoodHealth Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000005';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"LifeCare Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000006';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"TrueHealth Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000007';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"LifeCare Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000008';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Pulse Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000009';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"TrueHealth Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000010';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"CarePlus Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000001';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"CarePlus Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000002';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Wellness Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000003';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Pulse Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000004';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"LifeCare Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000005';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"GoodHealth Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000006';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Sanjeevani Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000007';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Arogya Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000008';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Sanjeevani Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000009';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"LifeCare Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000010';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"LifeCare Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000001';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"CarePlus Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000002';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Sanjeevani Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000003';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"CarePlus Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000004';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"CarePlus Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000005';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"GoodHealth Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000006';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"TrueHealth Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000007';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Arogya Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000028';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Sanjeevani Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000029';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"TrueHealth Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000030';

-- Update hospitals
UPDATE public.hospitals SET name = 'Bangalore MedCity Hospital - Indiranagar' WHERE id = '2a000000-0000-0000-0000-000000000001';
UPDATE public.doctor_locations SET location_name = 'Bangalore MedCity Hospital - Indiranagar' WHERE hospital_id = '2a000000-0000-0000-0000-000000000001';
UPDATE public.doctors SET hospital_name = 'Bangalore MedCity Hospital - Indiranagar' WHERE hospital_id = '2a000000-0000-0000-0000-000000000001';
UPDATE public.hospitals SET name = 'Silicon Valley Health - HSR Layout' WHERE id = '2a000000-0000-0000-0000-000000000002';
UPDATE public.doctor_locations SET location_name = 'Silicon Valley Health - HSR Layout' WHERE hospital_id = '2a000000-0000-0000-0000-000000000002';
UPDATE public.doctors SET hospital_name = 'Silicon Valley Health - HSR Layout' WHERE hospital_id = '2a000000-0000-0000-0000-000000000002';
UPDATE public.hospitals SET name = 'Garden City Clinic - Whitefield' WHERE id = '2a000000-0000-0000-0000-000000000003';
UPDATE public.doctor_locations SET location_name = 'Garden City Clinic - Whitefield' WHERE hospital_id = '2a000000-0000-0000-0000-000000000003';
UPDATE public.doctors SET hospital_name = 'Garden City Clinic - Whitefield' WHERE hospital_id = '2a000000-0000-0000-0000-000000000003';
UPDATE public.hospitals SET name = 'TechHub Care - Electronic City' WHERE id = '2a000000-0000-0000-0000-000000000004';
UPDATE public.doctor_locations SET location_name = 'TechHub Care - Electronic City' WHERE hospital_id = '2a000000-0000-0000-0000-000000000004';
UPDATE public.doctors SET hospital_name = 'TechHub Care - Electronic City' WHERE hospital_id = '2a000000-0000-0000-0000-000000000004';
UPDATE public.hospitals SET name = 'Greenwood Memorial - Jayanagar' WHERE id = '2a000000-0000-0000-0000-000000000005';
UPDATE public.doctor_locations SET location_name = 'Greenwood Memorial - Jayanagar' WHERE hospital_id = '2a000000-0000-0000-0000-000000000005';
UPDATE public.doctors SET hospital_name = 'Greenwood Memorial - Jayanagar' WHERE hospital_id = '2a000000-0000-0000-0000-000000000005';
UPDATE public.hospitals SET name = 'Lakeside Healthcare - JP Nagar' WHERE id = '2a000000-0000-0000-0000-000000000006';
UPDATE public.doctor_locations SET location_name = 'Lakeside Healthcare - JP Nagar' WHERE hospital_id = '2a000000-0000-0000-0000-000000000006';
UPDATE public.doctors SET hospital_name = 'Lakeside Healthcare - JP Nagar' WHERE hospital_id = '2a000000-0000-0000-0000-000000000006';
UPDATE public.hospitals SET name = 'Metro Health - Malleshwaram' WHERE id = '2a000000-0000-0000-0000-000000000007';
UPDATE public.doctor_locations SET location_name = 'Metro Health - Malleshwaram' WHERE hospital_id = '2a000000-0000-0000-0000-000000000007';
UPDATE public.doctors SET hospital_name = 'Metro Health - Malleshwaram' WHERE hospital_id = '2a000000-0000-0000-0000-000000000007';
UPDATE public.hospitals SET name = 'Silver Oak Hospital - Rajajinagar' WHERE id = '2a000000-0000-0000-0000-000000000008';
UPDATE public.doctor_locations SET location_name = 'Silver Oak Hospital - Rajajinagar' WHERE hospital_id = '2a000000-0000-0000-0000-000000000008';
UPDATE public.doctors SET hospital_name = 'Silver Oak Hospital - Rajajinagar' WHERE hospital_id = '2a000000-0000-0000-0000-000000000008';
UPDATE public.hospitals SET name = 'Crescent Care - Hebbal' WHERE id = '2a000000-0000-0000-0000-000000000009';
UPDATE public.doctor_locations SET location_name = 'Crescent Care - Hebbal' WHERE hospital_id = '2a000000-0000-0000-0000-000000000009';
UPDATE public.doctors SET hospital_name = 'Crescent Care - Hebbal' WHERE hospital_id = '2a000000-0000-0000-0000-000000000009';
UPDATE public.hospitals SET name = 'Pinnacle Health - Yelahanka' WHERE id = '2a000000-0000-0000-0000-000000000010';
UPDATE public.doctor_locations SET location_name = 'Pinnacle Health - Yelahanka' WHERE hospital_id = '2a000000-0000-0000-0000-000000000010';
UPDATE public.doctors SET hospital_name = 'Pinnacle Health - Yelahanka' WHERE hospital_id = '2a000000-0000-0000-0000-000000000010';
UPDATE public.hospitals SET name = 'Horizon Hospital - Marathahalli' WHERE id = '2a000000-0000-0000-0000-000000000011';
UPDATE public.doctor_locations SET location_name = 'Horizon Hospital - Marathahalli' WHERE hospital_id = '2a000000-0000-0000-0000-000000000011';
UPDATE public.doctors SET hospital_name = 'Horizon Hospital - Marathahalli' WHERE hospital_id = '2a000000-0000-0000-0000-000000000011';
UPDATE public.hospitals SET name = 'Oasis Clinic - Bellandur' WHERE id = '2a000000-0000-0000-0000-000000000012';
UPDATE public.doctor_locations SET location_name = 'Oasis Clinic - Bellandur' WHERE hospital_id = '2a000000-0000-0000-0000-000000000012';
UPDATE public.doctors SET hospital_name = 'Oasis Clinic - Bellandur' WHERE hospital_id = '2a000000-0000-0000-0000-000000000012';
UPDATE public.hospitals SET name = 'Summit Care - Banashankari' WHERE id = '2a000000-0000-0000-0000-000000000013';
UPDATE public.doctor_locations SET location_name = 'Summit Care - Banashankari' WHERE hospital_id = '2a000000-0000-0000-0000-000000000013';
UPDATE public.doctors SET hospital_name = 'Summit Care - Banashankari' WHERE hospital_id = '2a000000-0000-0000-0000-000000000013';
UPDATE public.hospitals SET name = 'Harmony Health - Basavanagudi' WHERE id = '2a000000-0000-0000-0000-000000000014';
UPDATE public.doctor_locations SET location_name = 'Harmony Health - Basavanagudi' WHERE hospital_id = '2a000000-0000-0000-0000-000000000014';
UPDATE public.doctors SET hospital_name = 'Harmony Health - Basavanagudi' WHERE hospital_id = '2a000000-0000-0000-0000-000000000014';
UPDATE public.hospitals SET name = 'Aura Medical Center - MG Road' WHERE id = '2a000000-0000-0000-0000-000000000015';
UPDATE public.doctor_locations SET location_name = 'Aura Medical Center - MG Road' WHERE hospital_id = '2a000000-0000-0000-0000-000000000015';
UPDATE public.doctors SET hospital_name = 'Aura Medical Center - MG Road' WHERE hospital_id = '2a000000-0000-0000-0000-000000000015';
UPDATE public.hospitals SET name = 'Bangalore MedCity Hospital - Indiranagar' WHERE id = '2a000000-0000-0000-0000-000000000016';
UPDATE public.doctor_locations SET location_name = 'Bangalore MedCity Hospital - Indiranagar' WHERE hospital_id = '2a000000-0000-0000-0000-000000000016';
UPDATE public.doctors SET hospital_name = 'Bangalore MedCity Hospital - Indiranagar' WHERE hospital_id = '2a000000-0000-0000-0000-000000000016';
UPDATE public.hospitals SET name = 'Silicon Valley Health - HSR Layout' WHERE id = '2a000000-0000-0000-0000-000000000017';
UPDATE public.doctor_locations SET location_name = 'Silicon Valley Health - HSR Layout' WHERE hospital_id = '2a000000-0000-0000-0000-000000000017';
UPDATE public.doctors SET hospital_name = 'Silicon Valley Health - HSR Layout' WHERE hospital_id = '2a000000-0000-0000-0000-000000000017';
UPDATE public.hospitals SET name = 'Garden City Clinic - Whitefield' WHERE id = '2a000000-0000-0000-0000-000000000018';
UPDATE public.doctor_locations SET location_name = 'Garden City Clinic - Whitefield' WHERE hospital_id = '2a000000-0000-0000-0000-000000000018';
UPDATE public.doctors SET hospital_name = 'Garden City Clinic - Whitefield' WHERE hospital_id = '2a000000-0000-0000-0000-000000000018';
UPDATE public.hospitals SET name = 'TechHub Care - Electronic City' WHERE id = '2a000000-0000-0000-0000-000000000019';
UPDATE public.doctor_locations SET location_name = 'TechHub Care - Electronic City' WHERE hospital_id = '2a000000-0000-0000-0000-000000000019';
UPDATE public.doctors SET hospital_name = 'TechHub Care - Electronic City' WHERE hospital_id = '2a000000-0000-0000-0000-000000000019';
UPDATE public.hospitals SET name = 'Greenwood Memorial - Jayanagar' WHERE id = '2a000000-0000-0000-0000-000000000020';
UPDATE public.doctor_locations SET location_name = 'Greenwood Memorial - Jayanagar' WHERE hospital_id = '2a000000-0000-0000-0000-000000000020';
UPDATE public.doctors SET hospital_name = 'Greenwood Memorial - Jayanagar' WHERE hospital_id = '2a000000-0000-0000-0000-000000000020';
UPDATE public.hospitals SET name = 'Lakeside Healthcare - JP Nagar' WHERE id = '2a000000-0000-0000-0000-000000000021';
UPDATE public.doctor_locations SET location_name = 'Lakeside Healthcare - JP Nagar' WHERE hospital_id = '2a000000-0000-0000-0000-000000000021';
UPDATE public.doctors SET hospital_name = 'Lakeside Healthcare - JP Nagar' WHERE hospital_id = '2a000000-0000-0000-0000-000000000021';
UPDATE public.hospitals SET name = 'Metro Health - Malleshwaram' WHERE id = '2a000000-0000-0000-0000-000000000022';
UPDATE public.doctor_locations SET location_name = 'Metro Health - Malleshwaram' WHERE hospital_id = '2a000000-0000-0000-0000-000000000022';
UPDATE public.doctors SET hospital_name = 'Metro Health - Malleshwaram' WHERE hospital_id = '2a000000-0000-0000-0000-000000000022';
UPDATE public.hospitals SET name = 'Silver Oak Hospital - Rajajinagar' WHERE id = '2a000000-0000-0000-0000-000000000023';
UPDATE public.doctor_locations SET location_name = 'Silver Oak Hospital - Rajajinagar' WHERE hospital_id = '2a000000-0000-0000-0000-000000000023';
UPDATE public.doctors SET hospital_name = 'Silver Oak Hospital - Rajajinagar' WHERE hospital_id = '2a000000-0000-0000-0000-000000000023';
UPDATE public.hospitals SET name = 'Crescent Care - Hebbal' WHERE id = '2a000000-0000-0000-0000-000000000024';
UPDATE public.doctor_locations SET location_name = 'Crescent Care - Hebbal' WHERE hospital_id = '2a000000-0000-0000-0000-000000000024';
UPDATE public.doctors SET hospital_name = 'Crescent Care - Hebbal' WHERE hospital_id = '2a000000-0000-0000-0000-000000000024';
UPDATE public.hospitals SET name = 'Pinnacle Health - Yelahanka' WHERE id = '2a000000-0000-0000-0000-000000000025';
UPDATE public.doctor_locations SET location_name = 'Pinnacle Health - Yelahanka' WHERE hospital_id = '2a000000-0000-0000-0000-000000000025';
UPDATE public.doctors SET hospital_name = 'Pinnacle Health - Yelahanka' WHERE hospital_id = '2a000000-0000-0000-0000-000000000025';

-- Update doctors
UPDATE public.doctors SET full_name = 'Aadhya Patel' WHERE user_id = '1b000000-0000-0000-0000-000000000001';
UPDATE public.doctors SET full_name = 'Aarav Iyer' WHERE user_id = '1b000000-0000-0000-0000-000000000002';
UPDATE public.doctors SET full_name = 'Shaurya Reddy' WHERE user_id = '1b000000-0000-0000-0000-000000000003';
UPDATE public.doctors SET full_name = 'Ishaan Singh' WHERE user_id = '1b000000-0000-0000-0000-000000000004';
UPDATE public.doctors SET full_name = 'Isha Patel' WHERE user_id = '1b000000-0000-0000-0000-000000000005';
UPDATE public.doctors SET full_name = 'Kavya Iyer' WHERE user_id = '1b000000-0000-0000-0000-000000000006';
UPDATE public.doctors SET full_name = 'Swati Nair' WHERE user_id = '1b000000-0000-0000-0000-000000000007';
UPDATE public.doctors SET full_name = 'Aditya Menon' WHERE user_id = '1b000000-0000-0000-0000-000000000008';
UPDATE public.doctors SET full_name = 'Vikram Sharma' WHERE user_id = '1b000000-0000-0000-0000-000000000009';
UPDATE public.doctors SET full_name = 'Aarav Patel' WHERE user_id = '1b000000-0000-0000-0000-000000000010';
UPDATE public.doctors SET full_name = 'Krishna Reddy' WHERE user_id = '1b000000-0000-0000-0000-000000000011';
UPDATE public.doctors SET full_name = 'Diya Menon' WHERE user_id = '1b000000-0000-0000-0000-000000000012';
UPDATE public.doctors SET full_name = 'Aarav Nair' WHERE user_id = '1b000000-0000-0000-0000-000000000013';
UPDATE public.doctors SET full_name = 'Krishna Iyer' WHERE user_id = '1b000000-0000-0000-0000-000000000014';
UPDATE public.doctors SET full_name = 'Aadhya Iyer' WHERE user_id = '1b000000-0000-0000-0000-000000000015';

-- Update patients
UPDATE public.patients SET full_name = 'Vihaan Iyer' WHERE user_id = '1c000000-0000-0000-0000-000000000001';
UPDATE public.patients SET full_name = 'Suresh Nair' WHERE user_id = '1c000000-0000-0000-0000-000000000002';
UPDATE public.patients SET full_name = 'Arjun Chauhan' WHERE user_id = '1c000000-0000-0000-0000-000000000003';
UPDATE public.patients SET full_name = 'Amit Patel' WHERE user_id = '1c000000-0000-0000-0000-000000000004';
UPDATE public.patients SET full_name = 'Saanvi Kumar' WHERE user_id = '1c000000-0000-0000-0000-000000000005';
UPDATE public.patients SET full_name = 'Anjali Joshi' WHERE user_id = '1c000000-0000-0000-0000-000000000001';
UPDATE public.patients SET full_name = 'Riya Chauhan' WHERE user_id = '1c000000-0000-0000-0000-000000000002';
UPDATE public.patients SET full_name = 'Shruti Gupta' WHERE user_id = '1c000000-0000-0000-0000-000000000003';
UPDATE public.patients SET full_name = 'Priya Reddy' WHERE user_id = '1c000000-0000-0000-0000-000000000004';
UPDATE public.patients SET full_name = 'Sneha Patel' WHERE user_id = '1c000000-0000-0000-0000-000000000005';
UPDATE public.patients SET full_name = 'Vihaan Joshi' WHERE user_id = '1c000000-0000-0000-0000-000000000001';
UPDATE public.patients SET full_name = 'Ishaan Verma' WHERE user_id = '1c000000-0000-0000-0000-000000000002';
UPDATE public.patients SET full_name = 'Atharv Patel' WHERE user_id = '1c000000-0000-0000-0000-000000000003';
UPDATE public.patients SET full_name = 'Shruti Reddy' WHERE user_id = '1c000000-0000-0000-0000-000000000004';
UPDATE public.patients SET full_name = 'Shruti Patel' WHERE user_id = '1c000000-0000-0000-0000-000000000005';
UPDATE public.patients SET full_name = 'Amit Kumar' WHERE user_id = '1c000000-0000-0000-0000-000000000001';
UPDATE public.patients SET full_name = 'Suresh Joshi' WHERE user_id = '1c000000-0000-0000-0000-000000000002';
UPDATE public.patients SET full_name = 'Anjali Gupta' WHERE user_id = '1c000000-0000-0000-0000-000000000003';
UPDATE public.patients SET full_name = 'Rohan Gupta' WHERE user_id = '1c000000-0000-0000-0000-000000000004';
UPDATE public.patients SET full_name = 'Rahul Reddy' WHERE user_id = '1c000000-0000-0000-0000-000000000005';

-- Update pharmacies
UPDATE public.pharmacies SET business_name = 'Wellness Pharmacy (Indiranagar)' WHERE user_id = '1d000000-0000-0000-0000-000000000001';
UPDATE public.pharmacy_locations SET location_name = 'Wellness Pharmacy (Indiranagar)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000001';
UPDATE public.pharmacies SET business_name = 'Sanjeevani Pharmacy (HSR Layout)' WHERE user_id = '1d000000-0000-0000-0000-000000000002';
UPDATE public.pharmacy_locations SET location_name = 'Sanjeevani Pharmacy (HSR Layout)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000002';
UPDATE public.pharmacies SET business_name = 'TrueHealth Pharmacy (Whitefield)' WHERE user_id = '1d000000-0000-0000-0000-000000000003';
UPDATE public.pharmacy_locations SET location_name = 'TrueHealth Pharmacy (Whitefield)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000003';
UPDATE public.pharmacies SET business_name = 'CarePlus Pharmacy (Electronic City)' WHERE user_id = '1d000000-0000-0000-0000-000000000004';
UPDATE public.pharmacy_locations SET location_name = 'CarePlus Pharmacy (Electronic City)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000004';
UPDATE public.pharmacies SET business_name = 'LifeCare Pharmacy (Jayanagar)' WHERE user_id = '1d000000-0000-0000-0000-000000000005';
UPDATE public.pharmacy_locations SET location_name = 'LifeCare Pharmacy (Jayanagar)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000005';
UPDATE public.pharmacies SET business_name = 'GoodHealth Pharmacy (JP Nagar)' WHERE user_id = '1d000000-0000-0000-0000-000000000006';
UPDATE public.pharmacy_locations SET location_name = 'GoodHealth Pharmacy (JP Nagar)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000006';
UPDATE public.pharmacies SET business_name = 'Arogya Pharmacy (Malleshwaram)' WHERE user_id = '1d000000-0000-0000-0000-000000000007';
UPDATE public.pharmacy_locations SET location_name = 'Arogya Pharmacy (Malleshwaram)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000007';
UPDATE public.pharmacies SET business_name = 'TrueHealth Pharmacy (Rajajinagar)' WHERE user_id = '1d000000-0000-0000-0000-000000000008';
UPDATE public.pharmacy_locations SET location_name = 'TrueHealth Pharmacy (Rajajinagar)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000008';
UPDATE public.pharmacies SET business_name = 'LifeCare Pharmacy (Hebbal)' WHERE user_id = '1d000000-0000-0000-0000-000000000009';
UPDATE public.pharmacy_locations SET location_name = 'LifeCare Pharmacy (Hebbal)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000009';
UPDATE public.pharmacies SET business_name = 'Sanjeevani Pharmacy (Yelahanka)' WHERE user_id = '1d000000-0000-0000-0000-000000000010';
UPDATE public.pharmacy_locations SET location_name = 'Sanjeevani Pharmacy (Yelahanka)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000010';
UPDATE public.pharmacies SET business_name = 'TrueHealth Pharmacy (Marathahalli)' WHERE user_id = '1d000000-0000-0000-0000-000000000001';
UPDATE public.pharmacy_locations SET location_name = 'TrueHealth Pharmacy (Marathahalli)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000001';
UPDATE public.pharmacies SET business_name = 'Pulse Pharmacy (Bellandur)' WHERE user_id = '1d000000-0000-0000-0000-000000000002';
UPDATE public.pharmacy_locations SET location_name = 'Pulse Pharmacy (Bellandur)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000002';
UPDATE public.pharmacies SET business_name = 'LifeCare Pharmacy (Banashankari)' WHERE user_id = '1d000000-0000-0000-0000-000000000003';
UPDATE public.pharmacy_locations SET location_name = 'LifeCare Pharmacy (Banashankari)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000003';
UPDATE public.pharmacies SET business_name = 'Wellness Pharmacy (Basavanagudi)' WHERE user_id = '1d000000-0000-0000-0000-000000000004';
UPDATE public.pharmacy_locations SET location_name = 'Wellness Pharmacy (Basavanagudi)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000004';
UPDATE public.pharmacies SET business_name = 'LifeCare Pharmacy (MG Road)' WHERE user_id = '1d000000-0000-0000-0000-000000000005';
UPDATE public.pharmacy_locations SET location_name = 'LifeCare Pharmacy (MG Road)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000005';
UPDATE public.pharmacies SET business_name = 'Arogya Pharmacy (Shivajinagar)' WHERE user_id = '1d000000-0000-0000-0000-000000000006';
UPDATE public.pharmacy_locations SET location_name = 'Arogya Pharmacy (Shivajinagar)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000006';
UPDATE public.pharmacies SET business_name = 'Wellness Pharmacy (Koramangala)' WHERE user_id = '1d000000-0000-0000-0000-000000000007';
UPDATE public.pharmacy_locations SET location_name = 'Wellness Pharmacy (Koramangala)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000007';
UPDATE public.pharmacies SET business_name = 'GoodHealth Pharmacy (Indiranagar)' WHERE user_id = '1d000000-0000-0000-0000-000000000008';
UPDATE public.pharmacy_locations SET location_name = 'GoodHealth Pharmacy (Indiranagar)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000008';
UPDATE public.pharmacies SET business_name = 'Arogya Pharmacy (HSR Layout)' WHERE user_id = '1d000000-0000-0000-0000-000000000009';
UPDATE public.pharmacy_locations SET location_name = 'Arogya Pharmacy (HSR Layout)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000009';
UPDATE public.pharmacies SET business_name = 'Sanjeevani Pharmacy (Whitefield)' WHERE user_id = '1d000000-0000-0000-0000-000000000010';
UPDATE public.pharmacy_locations SET location_name = 'Sanjeevani Pharmacy (Whitefield)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000010';
UPDATE public.pharmacies SET business_name = 'Wellness Pharmacy (Electronic City)' WHERE user_id = '1d000000-0000-0000-0000-000000000001';
UPDATE public.pharmacy_locations SET location_name = 'Wellness Pharmacy (Electronic City)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000001';
UPDATE public.pharmacies SET business_name = 'TrueHealth Pharmacy (Jayanagar)' WHERE user_id = '1d000000-0000-0000-0000-000000000002';
UPDATE public.pharmacy_locations SET location_name = 'TrueHealth Pharmacy (Jayanagar)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000002';
UPDATE public.pharmacies SET business_name = 'Pulse Pharmacy (JP Nagar)' WHERE user_id = '1d000000-0000-0000-0000-000000000003';
UPDATE public.pharmacy_locations SET location_name = 'Pulse Pharmacy (JP Nagar)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000003';
UPDATE public.pharmacies SET business_name = 'Arogya Pharmacy (Malleshwaram)' WHERE user_id = '1d000000-0000-0000-0000-000000000004';
UPDATE public.pharmacy_locations SET location_name = 'Arogya Pharmacy (Malleshwaram)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000004';
UPDATE public.pharmacies SET business_name = 'Pulse Pharmacy (Rajajinagar)' WHERE user_id = '1d000000-0000-0000-0000-000000000005';
UPDATE public.pharmacy_locations SET location_name = 'Pulse Pharmacy (Rajajinagar)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000005';
UPDATE public.pharmacies SET business_name = 'Sanjeevani Pharmacy (Hebbal)' WHERE user_id = '1d000000-0000-0000-0000-000000000006';
UPDATE public.pharmacy_locations SET location_name = 'Sanjeevani Pharmacy (Hebbal)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000006';
UPDATE public.pharmacies SET business_name = 'Sanjeevani Pharmacy (Yelahanka)' WHERE user_id = '1d000000-0000-0000-0000-000000000007';
UPDATE public.pharmacy_locations SET location_name = 'Sanjeevani Pharmacy (Yelahanka)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000007';
UPDATE public.pharmacies SET business_name = 'GoodHealth Pharmacy (Marathahalli)' WHERE user_id = '1d000000-0000-0000-0000-000000000028';
UPDATE public.pharmacy_locations SET location_name = 'GoodHealth Pharmacy (Marathahalli)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000028';
UPDATE public.pharmacies SET business_name = 'Sanjeevani Pharmacy (Bellandur)' WHERE user_id = '1d000000-0000-0000-0000-000000000029';
UPDATE public.pharmacy_locations SET location_name = 'Sanjeevani Pharmacy (Bellandur)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000029';
UPDATE public.pharmacies SET business_name = 'LifeCare Pharmacy (Banashankari)' WHERE user_id = '1d000000-0000-0000-0000-000000000030';
UPDATE public.pharmacy_locations SET location_name = 'LifeCare Pharmacy (Banashankari)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000030';

COMMIT;


