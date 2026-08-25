-- MedSync Comprehensive Demo Database Seed
-- Generated Script
BEGIN;

-- TRUNCATE existing tables aggressively
TRUNCATE TABLE prescription_dispensing_log, prescription_download_authorizations, patient_biometric_profiles, patient_security_credentials, prescription_transfers, qr_authorization_tokens, download_audit_logs, audit_logs, api_request_logs, consultations, medical_history_shares, consent_history, invoices, payments, delivery_tracking, medicine_order_items, medicine_orders, prescription_items, prescriptions, appointment_status_history, appointments, medicine_inventory, medicines, suppliers, medicine_categories, doctor_locations, pharmacy_locations, doctor_availability, verification_requests, ai_chat_messages, ai_chat_sessions, doctor_notes, ai_analyses, ocr_results, file_metadata, medical_record_versions, medical_record_tag_mappings, medical_records, medical_record_tags, medical_record_categories, notifications, notification_preferences, patients, doctors, pharmacies, admins, users, hospitals, knowledge_chunks, knowledge_documents, admin_ai_audit_logs CASCADE;

-- Clear Supabase Auth
DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@medsync.com');
DELETE FROM auth.users WHERE email LIKE '%@medsync.com';

-- Disable Triggers temporarily
SET session_replication_role = 'replica';

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change) VALUES 
('00000000-0000-0000-0000-000000000000', '1a000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin@medsync.com', crypt('admin', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "ADMIN", "full_name": "Super Admin"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'doctor1@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Dr. Demo 1"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'doctor2@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Dr. Demo 2"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'doctor3@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Dr. Demo 3"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'doctor4@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Dr. Demo 4"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'doctor5@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Dr. Demo 5"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'doctor6@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Dr. Demo 6"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'doctor7@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Dr. Demo 7"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000008', 'authenticated', 'authenticated', 'doctor8@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Dr. Demo 8"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000009', 'authenticated', 'authenticated', 'doctor9@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Dr. Demo 9"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000010', 'authenticated', 'authenticated', 'doctor10@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Dr. Demo 10"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'patient1@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Patient Demo 1"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'patient2@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Patient Demo 2"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'patient3@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Patient Demo 3"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'patient4@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Patient Demo 4"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'patient5@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Patient Demo 5"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'patient6@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Patient Demo 6"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'patient7@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Patient Demo 7"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000008', 'authenticated', 'authenticated', 'patient8@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Patient Demo 8"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000009', 'authenticated', 'authenticated', 'patient9@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Patient Demo 9"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000010', 'authenticated', 'authenticated', 'patient10@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Patient Demo 10"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000011', 'authenticated', 'authenticated', 'patient11@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Patient Demo 11"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000012', 'authenticated', 'authenticated', 'patient12@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Patient Demo 12"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'pharmacy1@medsync.com', crypt('phara', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Pharmacy Demo 1"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'pharmacy2@medsync.com', crypt('phara', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Pharmacy Demo 2"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'pharmacy3@medsync.com', crypt('phara', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Pharmacy Demo 3"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'pharmacy4@medsync.com', crypt('phara', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Pharmacy Demo 4"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'pharmacy5@medsync.com', crypt('phara', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Pharmacy Demo 5"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'pharmacy6@medsync.com', crypt('phara', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Pharmacy Demo 6"}'::jsonb, NOW(), NOW(), '', '', '', '');
INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at) VALUES 
(gen_random_uuid(), '1a000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000001', '{"sub":"1a000000-0000-0000-0000-000000000001","email":"admin@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1b000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', '{"sub":"1b000000-0000-0000-0000-000000000001","email":"doctor1@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1b000000-0000-0000-0000-000000000002', '1b000000-0000-0000-0000-000000000002', '{"sub":"1b000000-0000-0000-0000-000000000002","email":"doctor2@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1b000000-0000-0000-0000-000000000003', '1b000000-0000-0000-0000-000000000003', '{"sub":"1b000000-0000-0000-0000-000000000003","email":"doctor3@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1b000000-0000-0000-0000-000000000004', '1b000000-0000-0000-0000-000000000004', '{"sub":"1b000000-0000-0000-0000-000000000004","email":"doctor4@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1b000000-0000-0000-0000-000000000005', '1b000000-0000-0000-0000-000000000005', '{"sub":"1b000000-0000-0000-0000-000000000005","email":"doctor5@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1b000000-0000-0000-0000-000000000006', '1b000000-0000-0000-0000-000000000006', '{"sub":"1b000000-0000-0000-0000-000000000006","email":"doctor6@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1b000000-0000-0000-0000-000000000007', '1b000000-0000-0000-0000-000000000007', '{"sub":"1b000000-0000-0000-0000-000000000007","email":"doctor7@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1b000000-0000-0000-0000-000000000008', '1b000000-0000-0000-0000-000000000008', '{"sub":"1b000000-0000-0000-0000-000000000008","email":"doctor8@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1b000000-0000-0000-0000-000000000009', '1b000000-0000-0000-0000-000000000009', '{"sub":"1b000000-0000-0000-0000-000000000009","email":"doctor9@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1b000000-0000-0000-0000-000000000010', '1b000000-0000-0000-0000-000000000010', '{"sub":"1b000000-0000-0000-0000-000000000010","email":"doctor10@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1c000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000001', '{"sub":"1c000000-0000-0000-0000-000000000001","email":"patient1@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1c000000-0000-0000-0000-000000000002', '1c000000-0000-0000-0000-000000000002', '{"sub":"1c000000-0000-0000-0000-000000000002","email":"patient2@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1c000000-0000-0000-0000-000000000003', '1c000000-0000-0000-0000-000000000003', '{"sub":"1c000000-0000-0000-0000-000000000003","email":"patient3@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1c000000-0000-0000-0000-000000000004', '1c000000-0000-0000-0000-000000000004', '{"sub":"1c000000-0000-0000-0000-000000000004","email":"patient4@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1c000000-0000-0000-0000-000000000005', '1c000000-0000-0000-0000-000000000005', '{"sub":"1c000000-0000-0000-0000-000000000005","email":"patient5@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1c000000-0000-0000-0000-000000000006', '1c000000-0000-0000-0000-000000000006', '{"sub":"1c000000-0000-0000-0000-000000000006","email":"patient6@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1c000000-0000-0000-0000-000000000007', '1c000000-0000-0000-0000-000000000007', '{"sub":"1c000000-0000-0000-0000-000000000007","email":"patient7@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1c000000-0000-0000-0000-000000000008', '1c000000-0000-0000-0000-000000000008', '{"sub":"1c000000-0000-0000-0000-000000000008","email":"patient8@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1c000000-0000-0000-0000-000000000009', '1c000000-0000-0000-0000-000000000009', '{"sub":"1c000000-0000-0000-0000-000000000009","email":"patient9@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1c000000-0000-0000-0000-000000000010', '1c000000-0000-0000-0000-000000000010', '{"sub":"1c000000-0000-0000-0000-000000000010","email":"patient10@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1c000000-0000-0000-0000-000000000011', '1c000000-0000-0000-0000-000000000011', '{"sub":"1c000000-0000-0000-0000-000000000011","email":"patient11@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1c000000-0000-0000-0000-000000000012', '1c000000-0000-0000-0000-000000000012', '{"sub":"1c000000-0000-0000-0000-000000000012","email":"patient12@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000001', '{"sub":"1d000000-0000-0000-0000-000000000001","email":"pharmacy1@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000002', '1d000000-0000-0000-0000-000000000002', '{"sub":"1d000000-0000-0000-0000-000000000002","email":"pharmacy2@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000003', '1d000000-0000-0000-0000-000000000003', '{"sub":"1d000000-0000-0000-0000-000000000003","email":"pharmacy3@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000004', '1d000000-0000-0000-0000-000000000004', '{"sub":"1d000000-0000-0000-0000-000000000004","email":"pharmacy4@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000005', '1d000000-0000-0000-0000-000000000005', '{"sub":"1d000000-0000-0000-0000-000000000005","email":"pharmacy5@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000006', '1d000000-0000-0000-0000-000000000006', '{"sub":"1d000000-0000-0000-0000-000000000006","email":"pharmacy6@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW());
INSERT INTO public.users (id, email, password_hash, role, status, is_verified, profile_completion_percentage, created_at, updated_at) VALUES 
('1a000000-0000-0000-0000-000000000001', 'admin@medsync.com', 'supabase_managed', 'ADMIN', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000001', 'doctor1@medsync.com', 'supabase_managed', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000002', 'doctor2@medsync.com', 'supabase_managed', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000003', 'doctor3@medsync.com', 'supabase_managed', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000004', 'doctor4@medsync.com', 'supabase_managed', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000005', 'doctor5@medsync.com', 'supabase_managed', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000006', 'doctor6@medsync.com', 'supabase_managed', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000007', 'doctor7@medsync.com', 'supabase_managed', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000008', 'doctor8@medsync.com', 'supabase_managed', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000009', 'doctor9@medsync.com', 'supabase_managed', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000010', 'doctor10@medsync.com', 'supabase_managed', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1c000000-0000-0000-0000-000000000001', 'patient1@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1c000000-0000-0000-0000-000000000002', 'patient2@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1c000000-0000-0000-0000-000000000003', 'patient3@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1c000000-0000-0000-0000-000000000004', 'patient4@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1c000000-0000-0000-0000-000000000005', 'patient5@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1c000000-0000-0000-0000-000000000006', 'patient6@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1c000000-0000-0000-0000-000000000007', 'patient7@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1c000000-0000-0000-0000-000000000008', 'patient8@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1c000000-0000-0000-0000-000000000009', 'patient9@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1c000000-0000-0000-0000-000000000010', 'patient10@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1c000000-0000-0000-0000-000000000011', 'patient11@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1c000000-0000-0000-0000-000000000012', 'patient12@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000001', 'pharmacy1@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000002', 'pharmacy2@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000003', 'pharmacy3@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000004', 'pharmacy4@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000005', 'pharmacy5@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000006', 'pharmacy6@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW());
INSERT INTO public.hospitals (id, name, address, city, state, country, pincode, latitude, longitude, is_verified, is_active, created_at, updated_at) VALUES 
('2a000000-0000-0000-0000-000000000001', 'Manipal Hospital', 'Old Airport Road, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9592, 77.6485, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000002', 'Narayana Health City', 'Bommasandra, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', 12.8122, 77.6833, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000003', 'Apollo Hospitals', 'Bannerghatta Road, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', 12.8953, 77.5991, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000004', 'Fortis Hospital', 'Bannerghatta Road, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', 12.8943, 77.5997, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000005', 'Aster CMI Hospital', 'Hebbal, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', 13.045, 77.5878, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000006', 'Sakra World Hospital', 'Bellandur, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9304, 77.6784, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000007', 'Columbia Asia Hospital', 'Yeshwanthpur, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', 13.0118, 77.5552, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000008', 'BGS Gleneagles Global Hospitals', 'Kengeri, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9056, 77.4939, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000009', 'St. Johns Medical College Hospital', 'Koramangala, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9301, 77.6186, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000010', 'Sparsh Hospital', 'Vasanth Nagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9922, 77.5936, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000011', 'Victoria Hospital', 'KR Market, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9647, 77.5746, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000012', 'Bowring and Lady Curzon Hospital', 'Shivajinagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9808, 77.6044, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000013', 'Mallya Hospital', 'Ashok Nagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9691, 77.5947, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000014', 'Rainbow Childrens Hospital', 'Marathahalli, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9482, 77.7011, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000015', 'Cloudnine Hospital', 'Jayanagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9242, 77.5855, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000016', 'Sagar Hospitals', 'Tilak Nagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9262, 77.5912, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000017', 'KIMS Hospital', 'VV Puram, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9554, 77.5735, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000018', 'M. S. Ramaiah Memorial Hospital', 'MSR Nagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', 13.0312, 77.5645, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000019', 'HCG Cancer Hospital', 'Kalinga Rao Road, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9642, 77.5858, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000020', 'Vydehi Hospital', 'Whitefield, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', 12.9772, 77.7288, TRUE, TRUE, NOW(), NOW());
INSERT INTO public.admins (id, user_id, full_name, department, created_at, updated_at) VALUES ('3a000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000001', 'Super Admin', 'IT', NOW(), NOW());
INSERT INTO public.doctors (id, user_id, full_name, specialization, license_number, hospital_name, hospital_address, experience_years, consultation_fee, hospital_id, doctor_status, created_at, updated_at) VALUES ('3b000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', 'Dr. Demo 1', 'General Medicine', 'LIC-DOC-1', 'Manipal Hospital', 'Old Airport Road, Bengaluru', 6, 500, '2a000000-0000-0000-0000-000000000001', 'APPROVED', NOW(), NOW()),
('3b000000-0000-0000-0000-000000000002', '1b000000-0000-0000-0000-000000000002', 'Dr. Demo 2', 'General Medicine', 'LIC-DOC-2', 'Narayana Health City', 'Bommasandra, Bengaluru', 7, 500, '2a000000-0000-0000-0000-000000000002', 'APPROVED', NOW(), NOW()),
('3b000000-0000-0000-0000-000000000003', '1b000000-0000-0000-0000-000000000003', 'Dr. Demo 3', 'General Medicine', 'LIC-DOC-3', 'Apollo Hospitals', 'Bannerghatta Road, Bengaluru', 8, 500, '2a000000-0000-0000-0000-000000000003', 'APPROVED', NOW(), NOW()),
('3b000000-0000-0000-0000-000000000004', '1b000000-0000-0000-0000-000000000004', 'Dr. Demo 4', 'General Medicine', 'LIC-DOC-4', 'Fortis Hospital', 'Bannerghatta Road, Bengaluru', 9, 500, '2a000000-0000-0000-0000-000000000004', 'APPROVED', NOW(), NOW()),
('3b000000-0000-0000-0000-000000000005', '1b000000-0000-0000-0000-000000000005', 'Dr. Demo 5', 'General Medicine', 'LIC-DOC-5', 'Aster CMI Hospital', 'Hebbal, Bengaluru', 10, 500, '2a000000-0000-0000-0000-000000000005', 'APPROVED', NOW(), NOW()),
('3b000000-0000-0000-0000-000000000006', '1b000000-0000-0000-0000-000000000006', 'Dr. Demo 6', 'General Medicine', 'LIC-DOC-6', 'Sakra World Hospital', 'Bellandur, Bengaluru', 11, 500, '2a000000-0000-0000-0000-000000000006', 'APPROVED', NOW(), NOW()),
('3b000000-0000-0000-0000-000000000007', '1b000000-0000-0000-0000-000000000007', 'Dr. Demo 7', 'General Medicine', 'LIC-DOC-7', 'Columbia Asia Hospital', 'Yeshwanthpur, Bengaluru', 12, 500, '2a000000-0000-0000-0000-000000000007', 'APPROVED', NOW(), NOW()),
('3b000000-0000-0000-0000-000000000008', '1b000000-0000-0000-0000-000000000008', 'Dr. Demo 8', 'General Medicine', 'LIC-DOC-8', 'BGS Gleneagles Global Hospitals', 'Kengeri, Bengaluru', 13, 500, '2a000000-0000-0000-0000-000000000008', 'APPROVED', NOW(), NOW()),
('3b000000-0000-0000-0000-000000000009', '1b000000-0000-0000-0000-000000000009', 'Dr. Demo 9', 'General Medicine', 'LIC-DOC-9', 'St. Johns Medical College Hospital', 'Koramangala, Bengaluru', 14, 500, '2a000000-0000-0000-0000-000000000009', 'APPROVED', NOW(), NOW()),
('3b000000-0000-0000-0000-000000000010', '1b000000-0000-0000-0000-000000000010', 'Dr. Demo 10', 'General Medicine', 'LIC-DOC-10', 'Sparsh Hospital', 'Vasanth Nagar, Bengaluru', 15, 500, '2a000000-0000-0000-0000-000000000010', 'APPROVED', NOW(), NOW());
INSERT INTO public.patients (id, user_id, full_name, date_of_birth, gender, blood_group, city, state, pin_hash, created_at, updated_at) VALUES ('3c000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000001', 'Patient Demo 1', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', '$2b$12$TestPinHashForPatient1DemoUser12345678901234567', NOW(), NOW()),
('3c000000-0000-0000-0000-000000000002', '1c000000-0000-0000-0000-000000000002', 'Patient Demo 2', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', NULL, NOW(), NOW()),
('3c000000-0000-0000-0000-000000000003', '1c000000-0000-0000-0000-000000000003', 'Patient Demo 3', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', NULL, NOW(), NOW()),
('3c000000-0000-0000-0000-000000000004', '1c000000-0000-0000-0000-000000000004', 'Patient Demo 4', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', NULL, NOW(), NOW()),
('3c000000-0000-0000-0000-000000000005', '1c000000-0000-0000-0000-000000000005', 'Patient Demo 5', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', NULL, NOW(), NOW()),
('3c000000-0000-0000-0000-000000000006', '1c000000-0000-0000-0000-000000000006', 'Patient Demo 6', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', NULL, NOW(), NOW()),
('3c000000-0000-0000-0000-000000000007', '1c000000-0000-0000-0000-000000000007', 'Patient Demo 7', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', NULL, NOW(), NOW()),
('3c000000-0000-0000-0000-000000000008', '1c000000-0000-0000-0000-000000000008', 'Patient Demo 8', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', NULL, NOW(), NOW()),
('3c000000-0000-0000-0000-000000000009', '1c000000-0000-0000-0000-000000000009', 'Patient Demo 9', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', NULL, NOW(), NOW()),
('3c000000-0000-0000-0000-000000000010', '1c000000-0000-0000-0000-000000000010', 'Patient Demo 10', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', NULL, NOW(), NOW()),
('3c000000-0000-0000-0000-000000000011', '1c000000-0000-0000-0000-000000000011', 'Patient Demo 11', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', NULL, NOW(), NOW()),
('3c000000-0000-0000-0000-000000000012', '1c000000-0000-0000-0000-000000000012', 'Patient Demo 12', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', NULL, NOW(), NOW());
INSERT INTO public.pharmacies (id, user_id, business_name, license_number, address, city, state, contact_number, qr_identifier, created_at, updated_at) VALUES ('3d000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000001', 'Pharmacy Demo 1', 'LIC-PHM-1', 'Old Airport Road, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-1-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000002', '1d000000-0000-0000-0000-000000000002', 'Pharmacy Demo 2', 'LIC-PHM-2', 'Bommasandra, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-2-DEF', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000003', '1d000000-0000-0000-0000-000000000003', 'Pharmacy Demo 3', 'LIC-PHM-3', 'Bannerghatta Road, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-3-GHI', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000004', '1d000000-0000-0000-0000-000000000004', 'Pharmacy Demo 4', 'LIC-PHM-4', 'Bannerghatta Road, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-4-JKL', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000005', '1d000000-0000-0000-0000-000000000005', 'Pharmacy Demo 5', 'LIC-PHM-5', 'Hebbal, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-5-MNO', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000006', '1d000000-0000-0000-0000-000000000006', 'Pharmacy Demo 6', 'LIC-PHM-6', 'Bellandur, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-6-PQR', NOW(), NOW());
INSERT INTO public.doctor_locations (id, doctor_id, location_type, location_name, hospital_id, address, city, state, country, pincode, is_primary, is_active, verification_status, created_at, updated_at) VALUES ('4a000000-0000-0000-0000-000000000001', '3b000000-0000-0000-0000-000000000001', 'HOSPITAL', 'Manipal Hospital', '2a000000-0000-0000-0000-000000000001', 'Old Airport Road, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4a000000-0000-0000-0000-000000000002', '3b000000-0000-0000-0000-000000000002', 'HOSPITAL', 'Narayana Health City', '2a000000-0000-0000-0000-000000000002', 'Bommasandra, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4a000000-0000-0000-0000-000000000003', '3b000000-0000-0000-0000-000000000003', 'HOSPITAL', 'Apollo Hospitals', '2a000000-0000-0000-0000-000000000003', 'Bannerghatta Road, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4a000000-0000-0000-0000-000000000004', '3b000000-0000-0000-0000-000000000004', 'HOSPITAL', 'Fortis Hospital', '2a000000-0000-0000-0000-000000000004', 'Bannerghatta Road, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4a000000-0000-0000-0000-000000000005', '3b000000-0000-0000-0000-000000000005', 'HOSPITAL', 'Aster CMI Hospital', '2a000000-0000-0000-0000-000000000005', 'Hebbal, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4a000000-0000-0000-0000-000000000006', '3b000000-0000-0000-0000-000000000006', 'HOSPITAL', 'Sakra World Hospital', '2a000000-0000-0000-0000-000000000006', 'Bellandur, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4a000000-0000-0000-0000-000000000007', '3b000000-0000-0000-0000-000000000007', 'HOSPITAL', 'Columbia Asia Hospital', '2a000000-0000-0000-0000-000000000007', 'Yeshwanthpur, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4a000000-0000-0000-0000-000000000008', '3b000000-0000-0000-0000-000000000008', 'HOSPITAL', 'BGS Gleneagles Global Hospitals', '2a000000-0000-0000-0000-000000000008', 'Kengeri, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4a000000-0000-0000-0000-000000000009', '3b000000-0000-0000-0000-000000000009', 'HOSPITAL', 'St. Johns Medical College Hospital', '2a000000-0000-0000-0000-000000000009', 'Koramangala, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4a000000-0000-0000-0000-000000000010', '3b000000-0000-0000-0000-000000000010', 'HOSPITAL', 'Sparsh Hospital', '2a000000-0000-0000-0000-000000000010', 'Vasanth Nagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', TRUE, TRUE, 'APPROVED', NOW(), NOW());
INSERT INTO public.medicine_categories (id, name, description) VALUES ('5a000000-0000-0000-0000-000000000001', 'Antibiotics', 'Antibiotics description'), ('5a000000-0000-0000-0000-000000000002', 'Painkillers', 'Painkillers description');
INSERT INTO public.medicines (id, name, category_id, price, created_at, updated_at) VALUES ('5b000000-0000-0000-0000-000000000001', 'Amoxicillin', '5a000000-0000-0000-0000-000000000001', 150, NOW(), NOW()),
('5b000000-0000-0000-0000-000000000002', 'Paracetamol', '5a000000-0000-0000-0000-000000000002', 50, NOW(), NOW()),
('5b000000-0000-0000-0000-000000000003', 'Ibuprofen', '5a000000-0000-0000-0000-000000000002', 100, NOW(), NOW());
INSERT INTO public.medicine_inventory (id, pharmacy_id, medicine_id, batch_number, expiry_date, stock_quantity, unit_price, created_at, updated_at) VALUES ('5c000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'BATCH-0', CURRENT_DATE + 365, 500, 150, NOW(), NOW()),
('5c000000-0000-0000-0000-000000000002', '1d000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000002', 'BATCH-1', CURRENT_DATE + 365, 500, 50, NOW(), NOW()),
('5c000000-0000-0000-0000-000000000003', '1d000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000003', 'BATCH-2', CURRENT_DATE + 365, 500, 100, NOW(), NOW());

-- Diagnostic Records Seed
INSERT INTO public.medical_records (id, patient_id, uploaded_by, title, description, created_at, updated_at) 
VALUES 
('6a000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000001', 'Chest X-Ray', 'Routine checkup scan', NOW(), NOW()),
('6a000000-0000-0000-0000-000000000002', '1c000000-0000-0000-0000-000000000002', '1c000000-0000-0000-0000-000000000002', 'Brain MRI', 'Post-concussion scan', NOW(), NOW());

INSERT INTO public.medical_record_versions (id, record_id, version_number, ipfs_cid, file_type, file_size_bytes, change_description, is_current, created_at, updated_at)
VALUES 
('6b000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 1, 'dummy_xray.jpg', 'X_RAY', 102400, 'Initial', TRUE, NOW(), NOW()),
('6b000000-0000-0000-0000-000000000002', '6a000000-0000-0000-0000-000000000002', 1, 'dummy_mri.jpg', 'MRI', 204800, 'Initial', TRUE, NOW(), NOW());

INSERT INTO public.record_permissions (id, record_id, granted_to, granted_by, access_level, created_at, updated_at)
VALUES 
('6c000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000001', 'READ', NOW(), NOW()),
('6c000000-0000-0000-0000-000000000002', '6a000000-0000-0000-0000-000000000002', '1b000000-0000-0000-0000-000000000002', '1c000000-0000-0000-0000-000000000002', 'READ', NOW(), NOW());

INSERT INTO public.ai_analyses (id, version_id, model_name, analysis_status, summary, confidence_score, processing_time_ms, created_at, updated_at)
VALUES 
('6d000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'MedSync-Vision-v2', 'COMPLETED', 'No abnormal pulmonary opacities detected.', 0.94, 345, NOW(), NOW()),
('6d000000-0000-0000-0000-000000000002', '6b000000-0000-0000-0000-000000000002', 'NeuroScan-AI-v1', 'COMPLETED', 'Minor contusion detected in right frontal lobe.', 0.82, 1200, NOW(), NOW());


INSERT INTO public.knowledge_documents (id, title, description, file_name, storage_path, mime_type, created_by, status, owner_type, owner_id, visibility, allowed_roles, created_at, updated_at)
VALUES
('7a000000-0000-0000-0000-000000000001', 'Internal Operations Manual', 'System administration guide', 'ops_manual.pdf', 'system/ops_manual.pdf', 'application/pdf', '1a000000-0000-0000-0000-000000000001', 'READY', 'system', '1a000000-0000-0000-0000-000000000001', 'internal', '["ADMIN"]', NOW(), NOW()),
('7a000000-0000-0000-0000-000000000002', 'Patient 1 Clinical History', 'Past medical records summary', 'history.txt', 'patient/history.txt', 'text/plain', '1b000000-0000-0000-0000-000000000001', 'READY', 'patient', '1c000000-0000-0000-0000-000000000001', 'internal', '["PATIENT", "DOCTOR"]', NOW(), NOW());

INSERT INTO public.knowledge_chunks (id, document_id, chunk_index, content, token_count, created_at, updated_at)
VALUES
('7b000000-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001', 0, 'The MedSync backend connects to a highly secure internal infrastructure. Never expose the GROQ_API_KEY.', 50, NOW(), NOW()),
('7b000000-0000-0000-0000-000000000002', '7a000000-0000-0000-0000-000000000002', 0, 'Patient 1 has a history of mild asthma and is allergic to penicillin.', 20, NOW(), NOW());

INSERT INTO public.patient_security_credentials (id, patient_id, authorization_pin_hash, failed_attempts, is_active, created_at, updated_at)
VALUES
('8a000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000001', '$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW', 0, TRUE, NOW(), NOW());

INSERT INTO public.patient_biometric_profiles (id, patient_id, encrypted_template, model_name, model_version, enrollment_status, created_at, updated_at)
VALUES
('8b000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000001', 'dummy_base64_or_json_embedding_data_that_is_safe_and_not_real', 'ArcFace', '1.0', 'COMPLETED', NOW(), NOW());

SET session_replication_role = 'origin';
COMMIT;
