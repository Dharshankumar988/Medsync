-- ==============================================================================
-- SOURCE: 07_dummy_values.sql
-- ==============================================================================
-- ============================================================
-- ⚠️ MEDSYNC DEVELOPMENT DEMO DATABASE RESET + SEED
-- ============================================================
--
-- WARNING:
-- THIS SCRIPT IS DESTRUCTIVE.
--
-- It clears existing development/demo data and recreates
-- the MedSync demo dataset.
--
-- DO NOT RUN THIS AGAINST PRODUCTION.
-- DO NOT RUN THIS AGAINST A DATABASE CONTAINING REAL DATA.
--
-- Intended use:
--   Local development
--   Demo environments
--   Testing
--   Fresh database initialization
--
-- ============================================================

BEGIN;

-- Disable Triggers temporarily
SET session_replication_role = 'replica';

-- TRUNCATE existing tables aggressively
TRUNCATE TABLE prescription_dispensing_log, prescription_download_authorizations, patient_biometric_profiles, patient_security_credentials, prescription_transfers, download_audit_logs, audit_logs, api_request_logs, consultations, medical_history_shares, consent_history, invoices, payments, delivery_tracking, medicine_order_items, medicine_orders, prescription_items, prescriptions, appointment_status_history, appointments, medicine_inventory, medicines, suppliers, medicine_categories, doctor_locations, pharmacy_locations, doctor_availability, verification_requests, ai_chat_messages, ai_chat_sessions, doctor_notes, ai_analyses, ocr_results, file_metadata, medical_record_versions, medical_record_tag_mappings, medical_records, medical_record_tags, medical_record_categories, notifications, notification_preferences, patients, doctors, pharmacies, admins, users, hospitals, knowledge_chunks, knowledge_documents, admin_ai_audit_logs CASCADE;

-- Clear Supabase Auth specifically for demo users
DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@medsync.com');
DELETE FROM auth.users WHERE email LIKE '%@medsync.com';

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change) VALUES
('00000000-0000-0000-0000-000000000000', '1a000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin@medsync.com', crypt('admin', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "ADMIN", "full_name": "Super Admin"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'doctor1@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Aadhya Patel"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'doctor2@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Aarav Iyer"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'doctor3@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Shaurya Reddy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'doctor4@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Ishaan Singh"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'doctor5@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Isha Patel"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'doctor6@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Kavya Iyer"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'doctor7@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Swati Nair"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000008', 'authenticated', 'authenticated', 'doctor8@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Aditya Menon"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000009', 'authenticated', 'authenticated', 'doctor9@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Vikram Sharma"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000010', 'authenticated', 'authenticated', 'doctor10@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Aarav Patel"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000011', 'authenticated', 'authenticated', 'doctor11@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Krishna Reddy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000012', 'authenticated', 'authenticated', 'doctor12@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Diya Menon"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000013', 'authenticated', 'authenticated', 'doctor13@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Aarav Nair"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000014', 'authenticated', 'authenticated', 'doctor14@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Krishna Iyer"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1b000000-0000-0000-0000-000000000015', 'authenticated', 'authenticated', 'doctor15@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Aadhya Iyer"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'patient1@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Vihaan Iyer"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'patient2@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Suresh Nair"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'patient3@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Arjun Chauhan"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'patient4@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Amit Patel"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'patient5@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Saanvi Kumar"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'patient6@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Anjali Joshi"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'patient7@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Riya Chauhan"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000008', 'authenticated', 'authenticated', 'patient8@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Shruti Gupta"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000009', 'authenticated', 'authenticated', 'patient9@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Priya Reddy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000010', 'authenticated', 'authenticated', 'patient10@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Sneha Patel"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000011', 'authenticated', 'authenticated', 'patient11@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Vihaan Joshi"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000012', 'authenticated', 'authenticated', 'patient12@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Ishaan Verma"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000013', 'authenticated', 'authenticated', 'patient13@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Atharv Patel"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000014', 'authenticated', 'authenticated', 'patient14@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Shruti Reddy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000015', 'authenticated', 'authenticated', 'patient15@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Shruti Patel"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000016', 'authenticated', 'authenticated', 'patient16@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Amit Kumar"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000017', 'authenticated', 'authenticated', 'patient17@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Suresh Joshi"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000018', 'authenticated', 'authenticated', 'patient18@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Anjali Gupta"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000019', 'authenticated', 'authenticated', 'patient19@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Rohan Gupta"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1c000000-0000-0000-0000-000000000020', 'authenticated', 'authenticated', 'patient20@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Rahul Reddy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'pharmacy1@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Wellness Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'pharmacy2@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Pulse Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'pharmacy3@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "GoodHealth Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'pharmacy4@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "CarePlus Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'pharmacy5@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "GoodHealth Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'pharmacy6@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "LifeCare Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'pharmacy7@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "TrueHealth Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000008', 'authenticated', 'authenticated', 'pharmacy8@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "LifeCare Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000009', 'authenticated', 'authenticated', 'pharmacy9@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Pulse Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000010', 'authenticated', 'authenticated', 'pharmacy10@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "TrueHealth Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000011', 'authenticated', 'authenticated', 'pharmacy11@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "CarePlus Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000012', 'authenticated', 'authenticated', 'pharmacy12@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "CarePlus Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000013', 'authenticated', 'authenticated', 'pharmacy13@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Wellness Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000014', 'authenticated', 'authenticated', 'pharmacy14@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Pulse Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000015', 'authenticated', 'authenticated', 'pharmacy15@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "LifeCare Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000016', 'authenticated', 'authenticated', 'pharmacy16@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "GoodHealth Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000017', 'authenticated', 'authenticated', 'pharmacy17@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Sanjeevani Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000018', 'authenticated', 'authenticated', 'pharmacy18@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Arogya Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000019', 'authenticated', 'authenticated', 'pharmacy19@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Sanjeevani Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000020', 'authenticated', 'authenticated', 'pharmacy20@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "LifeCare Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000021', 'authenticated', 'authenticated', 'pharmacy21@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "LifeCare Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000022', 'authenticated', 'authenticated', 'pharmacy22@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "CarePlus Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000023', 'authenticated', 'authenticated', 'pharmacy23@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Sanjeevani Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000024', 'authenticated', 'authenticated', 'pharmacy24@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "CarePlus Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000025', 'authenticated', 'authenticated', 'pharmacy25@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "CarePlus Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000026', 'authenticated', 'authenticated', 'pharmacy26@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "GoodHealth Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000027', 'authenticated', 'authenticated', 'pharmacy27@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "TrueHealth Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000028', 'authenticated', 'authenticated', 'pharmacy28@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Arogya Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000029', 'authenticated', 'authenticated', 'pharmacy29@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Sanjeevani Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '1d000000-0000-0000-0000-000000000030', 'authenticated', 'authenticated', 'pharmacy30@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "TrueHealth Pharmacy"}'::jsonb, NOW(), NOW(), '', '', '', '');

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
(gen_random_uuid(), '1b000000-0000-0000-0000-000000000011', '1b000000-0000-0000-0000-000000000011', '{"sub":"1b000000-0000-0000-0000-000000000011","email":"doctor11@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1b000000-0000-0000-0000-000000000012', '1b000000-0000-0000-0000-000000000012', '{"sub":"1b000000-0000-0000-0000-000000000012","email":"doctor12@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1b000000-0000-0000-0000-000000000013', '1b000000-0000-0000-0000-000000000013', '{"sub":"1b000000-0000-0000-0000-000000000013","email":"doctor13@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1b000000-0000-0000-0000-000000000014', '1b000000-0000-0000-0000-000000000014', '{"sub":"1b000000-0000-0000-0000-000000000014","email":"doctor14@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1b000000-0000-0000-0000-000000000015', '1b000000-0000-0000-0000-000000000015', '{"sub":"1b000000-0000-0000-0000-000000000015","email":"doctor15@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
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
(gen_random_uuid(), '1c000000-0000-0000-0000-000000000013', '1c000000-0000-0000-0000-000000000013', '{"sub":"1c000000-0000-0000-0000-000000000013","email":"patient13@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1c000000-0000-0000-0000-000000000014', '1c000000-0000-0000-0000-000000000014', '{"sub":"1c000000-0000-0000-0000-000000000014","email":"patient14@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1c000000-0000-0000-0000-000000000015', '1c000000-0000-0000-0000-000000000015', '{"sub":"1c000000-0000-0000-0000-000000000015","email":"patient15@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1c000000-0000-0000-0000-000000000016', '1c000000-0000-0000-0000-000000000016', '{"sub":"1c000000-0000-0000-0000-000000000016","email":"patient16@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1c000000-0000-0000-0000-000000000017', '1c000000-0000-0000-0000-000000000017', '{"sub":"1c000000-0000-0000-0000-000000000017","email":"patient17@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1c000000-0000-0000-0000-000000000018', '1c000000-0000-0000-0000-000000000018', '{"sub":"1c000000-0000-0000-0000-000000000018","email":"patient18@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1c000000-0000-0000-0000-000000000019', '1c000000-0000-0000-0000-000000000019', '{"sub":"1c000000-0000-0000-0000-000000000019","email":"patient19@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1c000000-0000-0000-0000-000000000020', '1c000000-0000-0000-0000-000000000020', '{"sub":"1c000000-0000-0000-0000-000000000020","email":"patient20@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000001', '{"sub":"1d000000-0000-0000-0000-000000000001","email":"pharmacy1@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000002', '1d000000-0000-0000-0000-000000000002', '{"sub":"1d000000-0000-0000-0000-000000000002","email":"pharmacy2@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000003', '1d000000-0000-0000-0000-000000000003', '{"sub":"1d000000-0000-0000-0000-000000000003","email":"pharmacy3@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000004', '1d000000-0000-0000-0000-000000000004', '{"sub":"1d000000-0000-0000-0000-000000000004","email":"pharmacy4@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000005', '1d000000-0000-0000-0000-000000000005', '{"sub":"1d000000-0000-0000-0000-000000000005","email":"pharmacy5@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000006', '1d000000-0000-0000-0000-000000000006', '{"sub":"1d000000-0000-0000-0000-000000000006","email":"pharmacy6@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000007', '1d000000-0000-0000-0000-000000000007', '{"sub":"1d000000-0000-0000-0000-000000000007","email":"pharmacy7@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000008', '1d000000-0000-0000-0000-000000000008', '{"sub":"1d000000-0000-0000-0000-000000000008","email":"pharmacy8@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000009', '1d000000-0000-0000-0000-000000000009', '{"sub":"1d000000-0000-0000-0000-000000000009","email":"pharmacy9@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000010', '1d000000-0000-0000-0000-000000000010', '{"sub":"1d000000-0000-0000-0000-000000000010","email":"pharmacy10@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000011', '1d000000-0000-0000-0000-000000000011', '{"sub":"1d000000-0000-0000-0000-000000000011","email":"pharmacy11@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000012', '1d000000-0000-0000-0000-000000000012', '{"sub":"1d000000-0000-0000-0000-000000000012","email":"pharmacy12@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000013', '1d000000-0000-0000-0000-000000000013', '{"sub":"1d000000-0000-0000-0000-000000000013","email":"pharmacy13@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000014', '1d000000-0000-0000-0000-000000000014', '{"sub":"1d000000-0000-0000-0000-000000000014","email":"pharmacy14@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000015', '1d000000-0000-0000-0000-000000000015', '{"sub":"1d000000-0000-0000-0000-000000000015","email":"pharmacy15@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000016', '1d000000-0000-0000-0000-000000000016', '{"sub":"1d000000-0000-0000-0000-000000000016","email":"pharmacy16@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000017', '1d000000-0000-0000-0000-000000000017', '{"sub":"1d000000-0000-0000-0000-000000000017","email":"pharmacy17@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000018', '1d000000-0000-0000-0000-000000000018', '{"sub":"1d000000-0000-0000-0000-000000000018","email":"pharmacy18@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000019', '1d000000-0000-0000-0000-000000000019', '{"sub":"1d000000-0000-0000-0000-000000000019","email":"pharmacy19@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000020', '1d000000-0000-0000-0000-000000000020', '{"sub":"1d000000-0000-0000-0000-000000000020","email":"pharmacy20@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000021', '1d000000-0000-0000-0000-000000000021', '{"sub":"1d000000-0000-0000-0000-000000000021","email":"pharmacy21@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000022', '1d000000-0000-0000-0000-000000000022', '{"sub":"1d000000-0000-0000-0000-000000000022","email":"pharmacy22@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000023', '1d000000-0000-0000-0000-000000000023', '{"sub":"1d000000-0000-0000-0000-000000000023","email":"pharmacy23@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000024', '1d000000-0000-0000-0000-000000000024', '{"sub":"1d000000-0000-0000-0000-000000000024","email":"pharmacy24@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000025', '1d000000-0000-0000-0000-000000000025', '{"sub":"1d000000-0000-0000-0000-000000000025","email":"pharmacy25@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000026', '1d000000-0000-0000-0000-000000000026', '{"sub":"1d000000-0000-0000-0000-000000000026","email":"pharmacy26@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000027', '1d000000-0000-0000-0000-000000000027', '{"sub":"1d000000-0000-0000-0000-000000000027","email":"pharmacy27@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000028', '1d000000-0000-0000-0000-000000000028', '{"sub":"1d000000-0000-0000-0000-000000000028","email":"pharmacy28@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000029', '1d000000-0000-0000-0000-000000000029', '{"sub":"1d000000-0000-0000-0000-000000000029","email":"pharmacy29@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1d000000-0000-0000-0000-000000000030', '1d000000-0000-0000-0000-000000000030', '{"sub":"1d000000-0000-0000-0000-000000000030","email":"pharmacy30@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW());

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
('1b000000-0000-0000-0000-000000000011', 'doctor11@medsync.com', 'supabase_managed', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000012', 'doctor12@medsync.com', 'supabase_managed', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000013', 'doctor13@medsync.com', 'supabase_managed', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000014', 'doctor14@medsync.com', 'supabase_managed', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1b000000-0000-0000-0000-000000000015', 'doctor15@medsync.com', 'supabase_managed', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
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
('1c000000-0000-0000-0000-000000000013', 'patient13@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1c000000-0000-0000-0000-000000000014', 'patient14@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1c000000-0000-0000-0000-000000000015', 'patient15@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1c000000-0000-0000-0000-000000000016', 'patient16@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1c000000-0000-0000-0000-000000000017', 'patient17@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1c000000-0000-0000-0000-000000000018', 'patient18@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1c000000-0000-0000-0000-000000000019', 'patient19@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1c000000-0000-0000-0000-000000000020', 'patient20@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000001', 'pharmacy1@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000002', 'pharmacy2@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000003', 'pharmacy3@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000004', 'pharmacy4@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000005', 'pharmacy5@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000006', 'pharmacy6@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000007', 'pharmacy7@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000008', 'pharmacy8@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000009', 'pharmacy9@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000010', 'pharmacy10@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000011', 'pharmacy11@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000012', 'pharmacy12@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000013', 'pharmacy13@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000014', 'pharmacy14@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000015', 'pharmacy15@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000016', 'pharmacy16@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000017', 'pharmacy17@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000018', 'pharmacy18@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000019', 'pharmacy19@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000020', 'pharmacy20@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000021', 'pharmacy21@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000022', 'pharmacy22@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000023', 'pharmacy23@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000024', 'pharmacy24@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000025', 'pharmacy25@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000026', 'pharmacy26@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000027', 'pharmacy27@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000028', 'pharmacy28@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000029', 'pharmacy29@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('1d000000-0000-0000-0000-000000000030', 'pharmacy30@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW());

INSERT INTO public.admins (id, user_id, full_name, department, created_at, updated_at) VALUES ('3a000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000001', 'Super Admin', 'IT', NOW(), NOW());
INSERT INTO public.hospitals (id, name, address, city, state, country, pincode, latitude, longitude, is_verified, is_active, created_at, updated_at) VALUES
('2a000000-0000-0000-0000-000000000001', 'Bangalore MedCity Hospital - Indiranagar', 'Indiranagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560038', 12.971202, 77.642271, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000002', 'Silicon Valley Health - HSR Layout', 'HSR Layout, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560102', 12.913967, 77.640352, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000003', 'Garden City Clinic - Whitefield', 'Whitefield, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560066', 12.965004, 77.739536, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000004', 'TechHub Care - Electronic City', 'Electronic City, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560100', 12.828933, 77.680498, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000005', 'Greenwood Memorial - Jayanagar', 'Jayanagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560041', 12.923372, 77.585082, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000006', 'Lakeside Healthcare - JP Nagar', 'JP Nagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560078', 12.910836, 77.580457, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000007', 'Metro Health - Malleshwaram', 'Malleshwaram, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560003', 12.989653, 77.575068, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000008', 'Silver Oak Hospital - Rajajinagar', 'Rajajinagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560010', 12.995843, 77.543941, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000009', 'Crescent Care - Hebbal', 'Hebbal, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560024', 13.024690, 77.595801, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000010', 'Pinnacle Health - Yelahanka', 'Yelahanka, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560064', 13.105076, 77.608771, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000011', 'Horizon Hospital - Marathahalli', 'Marathahalli, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560037', 12.950074, 77.687880, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000012', 'Oasis Clinic - Bellandur', 'Bellandur, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560103', 12.940166, 77.677581, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000013', 'Summit Care - Banashankari', 'Banashankari, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560050', 12.922174, 77.549820, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000014', 'Harmony Health - Basavanagudi', 'Basavanagudi, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560004', 12.953515, 77.568570, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000015', 'Aura Medical Center - MG Road', 'MG Road, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', 12.959141, 77.604849, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000016', 'Bangalore MedCity Hospital - Indiranagar', 'Shivajinagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560051', 12.993486, 77.591214, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000017', 'Silicon Valley Health - HSR Layout', 'Koramangala, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560034', 12.933108, 77.638533, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000018', 'Garden City Clinic - Whitefield', 'Indiranagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560038', 12.989398, 77.633828, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000019', 'TechHub Care - Electronic City', 'HSR Layout, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560102', 12.915987, 77.641166, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000020', 'Greenwood Memorial - Jayanagar', 'Whitefield, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560066', 12.961505, 77.754868, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000021', 'Lakeside Healthcare - JP Nagar', 'Electronic City, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560100', 12.830222, 77.691014, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000022', 'Metro Health - Malleshwaram', 'Jayanagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560041', 12.922241, 77.586519, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000023', 'Silver Oak Hospital - Rajajinagar', 'JP Nagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560078', 12.913696, 77.571806, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000024', 'Crescent Care - Hebbal', 'Malleshwaram, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560003', 13.000075, 77.555882, TRUE, TRUE, NOW(), NOW()),
('2a000000-0000-0000-0000-000000000025', 'Pinnacle Health - Yelahanka', 'Rajajinagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560010', 12.986861, 77.560388, TRUE, TRUE, NOW(), NOW());

INSERT INTO public.doctors (id, user_id, full_name, specialization, license_number, hospital_name, hospital_address, experience_years, consultation_fee, hospital_id, doctor_status, created_at, updated_at) VALUES
('3b000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', 'Aadhya Patel', 'ENT', 'LIC-DOC-1', 'Bangalore MedCity Hospital - Indiranagar', 'Indiranagar, Bengaluru', 18, 1200, '2a000000-0000-0000-0000-000000000001', 'APPROVED', NOW(), NOW()),
('3b000000-0000-0000-0000-000000000002', '1b000000-0000-0000-0000-000000000002', 'Aarav Iyer', 'Neurology', 'LIC-DOC-2', 'Silicon Valley Health - HSR Layout', 'HSR Layout, Bengaluru', 8, 750, '2a000000-0000-0000-0000-000000000002', 'APPROVED', NOW(), NOW()),
('3b000000-0000-0000-0000-000000000003', '1b000000-0000-0000-0000-000000000003', 'Shaurya Reddy', 'General Medicine', 'LIC-DOC-3', 'Garden City Clinic - Whitefield', 'Whitefield, Bengaluru', 3, 1000, '2a000000-0000-0000-0000-000000000003', 'APPROVED', NOW(), NOW()),
('3b000000-0000-0000-0000-000000000004', '1b000000-0000-0000-0000-000000000004', 'Ishaan Singh', 'Cardiology', 'LIC-DOC-4', 'TechHub Care - Electronic City', 'Electronic City, Bengaluru', 3, 750, '2a000000-0000-0000-0000-000000000004', 'APPROVED', NOW(), NOW()),
('3b000000-0000-0000-0000-000000000005', '1b000000-0000-0000-0000-000000000005', 'Isha Patel', 'General Medicine', 'LIC-DOC-5', 'Greenwood Memorial - Jayanagar', 'Jayanagar, Bengaluru', 17, 500, '2a000000-0000-0000-0000-000000000005', 'APPROVED', NOW(), NOW()),
('3b000000-0000-0000-0000-000000000006', '1b000000-0000-0000-0000-000000000006', 'Kavya Iyer', 'Orthopedics', 'LIC-DOC-6', 'Lakeside Healthcare - JP Nagar', 'JP Nagar, Bengaluru', 18, 500, '2a000000-0000-0000-0000-000000000006', 'APPROVED', NOW(), NOW()),
('3b000000-0000-0000-0000-000000000007', '1b000000-0000-0000-0000-000000000007', 'Swati Nair', 'Orthopedics', 'LIC-DOC-7', 'Metro Health - Malleshwaram', 'Malleshwaram, Bengaluru', 18, 1000, '2a000000-0000-0000-0000-000000000007', 'APPROVED', NOW(), NOW()),
('3b000000-0000-0000-0000-000000000008', '1b000000-0000-0000-0000-000000000008', 'Aditya Menon', 'General Medicine', 'LIC-DOC-8', 'Silver Oak Hospital - Rajajinagar', 'Rajajinagar, Bengaluru', 13, 1000, '2a000000-0000-0000-0000-000000000008', 'APPROVED', NOW(), NOW()),
('3b000000-0000-0000-0000-000000000009', '1b000000-0000-0000-0000-000000000009', 'Vikram Sharma', 'ENT', 'LIC-DOC-9', 'Crescent Care - Hebbal', 'Hebbal, Bengaluru', 17, 500, '2a000000-0000-0000-0000-000000000009', 'APPROVED', NOW(), NOW()),
('3b000000-0000-0000-0000-000000000010', '1b000000-0000-0000-0000-000000000010', 'Aarav Patel', 'Neurology', 'LIC-DOC-10', 'Pinnacle Health - Yelahanka', 'Yelahanka, Bengaluru', 18, 1000, '2a000000-0000-0000-0000-000000000010', 'APPROVED', NOW(), NOW()),
('3b000000-0000-0000-0000-000000000011', '1b000000-0000-0000-0000-000000000011', 'Krishna Reddy', 'Ophthalmology', 'LIC-DOC-11', 'Horizon Hospital - Marathahalli', 'Marathahalli, Bengaluru', 13, 750, '2a000000-0000-0000-0000-000000000011', 'APPROVED', NOW(), NOW()),
('3b000000-0000-0000-0000-000000000012', '1b000000-0000-0000-0000-000000000012', 'Diya Menon', 'General Medicine', 'LIC-DOC-12', 'Oasis Clinic - Bellandur', 'Bellandur, Bengaluru', 9, 500, '2a000000-0000-0000-0000-000000000012', 'APPROVED', NOW(), NOW()),
('3b000000-0000-0000-0000-000000000013', '1b000000-0000-0000-0000-000000000013', 'Aarav Nair', 'Ophthalmology', 'LIC-DOC-13', 'Summit Care - Banashankari', 'Banashankari, Bengaluru', 5, 1200, '2a000000-0000-0000-0000-000000000013', 'APPROVED', NOW(), NOW()),
('3b000000-0000-0000-0000-000000000014', '1b000000-0000-0000-0000-000000000014', 'Krishna Iyer', 'Cardiology', 'LIC-DOC-14', 'Harmony Health - Basavanagudi', 'Basavanagudi, Bengaluru', 12, 750, '2a000000-0000-0000-0000-000000000014', 'APPROVED', NOW(), NOW()),
('3b000000-0000-0000-0000-000000000015', '1b000000-0000-0000-0000-000000000015', 'Aadhya Iyer', 'Ophthalmology', 'LIC-DOC-15', 'Aura Medical Center - MG Road', 'MG Road, Bengaluru', 19, 500, '2a000000-0000-0000-0000-000000000015', 'APPROVED', NOW(), NOW());

INSERT INTO public.doctor_locations (id, doctor_id, location_type, location_name, hospital_id, address, city, state, country, pincode, latitude, longitude, is_primary, is_active, verification_status, created_at, updated_at) VALUES
('4a000000-0000-0000-0000-000000000001', '3b000000-0000-0000-0000-000000000001', 'HOSPITAL', 'Bangalore MedCity Hospital - Indiranagar', '2a000000-0000-0000-0000-000000000001', 'Indiranagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560038', 12.971202, 77.642271, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4a000000-0000-0000-0000-000000000002', '3b000000-0000-0000-0000-000000000002', 'HOSPITAL', 'Silicon Valley Health - HSR Layout', '2a000000-0000-0000-0000-000000000002', 'HSR Layout, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560102', 12.913967, 77.640352, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4a000000-0000-0000-0000-000000000003', '3b000000-0000-0000-0000-000000000003', 'HOSPITAL', 'Garden City Clinic - Whitefield', '2a000000-0000-0000-0000-000000000003', 'Whitefield, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560066', 12.965004, 77.739536, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4a000000-0000-0000-0000-000000000004', '3b000000-0000-0000-0000-000000000004', 'HOSPITAL', 'TechHub Care - Electronic City', '2a000000-0000-0000-0000-000000000004', 'Electronic City, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560100', 12.828933, 77.680498, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4a000000-0000-0000-0000-000000000005', '3b000000-0000-0000-0000-000000000005', 'HOSPITAL', 'Greenwood Memorial - Jayanagar', '2a000000-0000-0000-0000-000000000005', 'Jayanagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560041', 12.923372, 77.585082, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4a000000-0000-0000-0000-000000000006', '3b000000-0000-0000-0000-000000000006', 'HOSPITAL', 'Lakeside Healthcare - JP Nagar', '2a000000-0000-0000-0000-000000000006', 'JP Nagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560078', 12.910836, 77.580457, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4a000000-0000-0000-0000-000000000007', '3b000000-0000-0000-0000-000000000007', 'HOSPITAL', 'Metro Health - Malleshwaram', '2a000000-0000-0000-0000-000000000007', 'Malleshwaram, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560003', 12.989653, 77.575068, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4a000000-0000-0000-0000-000000000008', '3b000000-0000-0000-0000-000000000008', 'HOSPITAL', 'Silver Oak Hospital - Rajajinagar', '2a000000-0000-0000-0000-000000000008', 'Rajajinagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560010', 12.995843, 77.543941, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4a000000-0000-0000-0000-000000000009', '3b000000-0000-0000-0000-000000000009', 'HOSPITAL', 'Crescent Care - Hebbal', '2a000000-0000-0000-0000-000000000009', 'Hebbal, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560024', 13.024690, 77.595801, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4a000000-0000-0000-0000-000000000010', '3b000000-0000-0000-0000-000000000010', 'HOSPITAL', 'Pinnacle Health - Yelahanka', '2a000000-0000-0000-0000-000000000010', 'Yelahanka, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560064', 13.105076, 77.608771, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4a000000-0000-0000-0000-000000000011', '3b000000-0000-0000-0000-000000000011', 'HOSPITAL', 'Horizon Hospital - Marathahalli', '2a000000-0000-0000-0000-000000000011', 'Marathahalli, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560037', 12.950074, 77.687880, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4a000000-0000-0000-0000-000000000012', '3b000000-0000-0000-0000-000000000012', 'HOSPITAL', 'Oasis Clinic - Bellandur', '2a000000-0000-0000-0000-000000000012', 'Bellandur, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560103', 12.940166, 77.677581, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4a000000-0000-0000-0000-000000000013', '3b000000-0000-0000-0000-000000000013', 'HOSPITAL', 'Summit Care - Banashankari', '2a000000-0000-0000-0000-000000000013', 'Banashankari, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560050', 12.922174, 77.549820, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4a000000-0000-0000-0000-000000000014', '3b000000-0000-0000-0000-000000000014', 'HOSPITAL', 'Harmony Health - Basavanagudi', '2a000000-0000-0000-0000-000000000014', 'Basavanagudi, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560004', 12.953515, 77.568570, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4a000000-0000-0000-0000-000000000015', '3b000000-0000-0000-0000-000000000015', 'HOSPITAL', 'Aura Medical Center - MG Road', '2a000000-0000-0000-0000-000000000015', 'MG Road, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', 12.959141, 77.604849, TRUE, TRUE, 'APPROVED', NOW(), NOW());

INSERT INTO public.patients (id, user_id, full_name, date_of_birth, gender, blood_group, city, state, pincode, pin_hash, created_at, updated_at) VALUES
('3c000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000001', 'Vihaan Iyer', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', '560034', '$2b$12$TestPinHashForPatient1DemoUser12345678901234567', NOW(), NOW()),
('3c000000-0000-0000-0000-000000000002', '1c000000-0000-0000-0000-000000000002', 'Suresh Nair', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', '560038', '$2b$12$TestPinHashForPatient1DemoUser12345678901234567', NOW(), NOW()),
('3c000000-0000-0000-0000-000000000003', '1c000000-0000-0000-0000-000000000003', 'Arjun Chauhan', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', '560102', '$2b$12$TestPinHashForPatient1DemoUser12345678901234567', NOW(), NOW()),
('3c000000-0000-0000-0000-000000000004', '1c000000-0000-0000-0000-000000000004', 'Amit Patel', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', '560066', '$2b$12$TestPinHashForPatient1DemoUser12345678901234567', NOW(), NOW()),
('3c000000-0000-0000-0000-000000000005', '1c000000-0000-0000-0000-000000000005', 'Saanvi Kumar', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', '560100', '$2b$12$TestPinHashForPatient1DemoUser12345678901234567', NOW(), NOW()),
('3c000000-0000-0000-0000-000000000006', '1c000000-0000-0000-0000-000000000006', 'Anjali Joshi', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', '560041', '$2b$12$TestPinHashForPatient1DemoUser12345678901234567', NOW(), NOW()),
('3c000000-0000-0000-0000-000000000007', '1c000000-0000-0000-0000-000000000007', 'Riya Chauhan', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', '560078', '$2b$12$TestPinHashForPatient1DemoUser12345678901234567', NOW(), NOW()),
('3c000000-0000-0000-0000-000000000008', '1c000000-0000-0000-0000-000000000008', 'Shruti Gupta', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', '560003', '$2b$12$TestPinHashForPatient1DemoUser12345678901234567', NOW(), NOW()),
('3c000000-0000-0000-0000-000000000009', '1c000000-0000-0000-0000-000000000009', 'Priya Reddy', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', '560010', '$2b$12$TestPinHashForPatient1DemoUser12345678901234567', NOW(), NOW()),
('3c000000-0000-0000-0000-000000000010', '1c000000-0000-0000-0000-000000000010', 'Sneha Patel', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', '560024', '$2b$12$TestPinHashForPatient1DemoUser12345678901234567', NOW(), NOW()),
('3c000000-0000-0000-0000-000000000011', '1c000000-0000-0000-0000-000000000011', 'Vihaan Joshi', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', '560064', '$2b$12$TestPinHashForPatient1DemoUser12345678901234567', NOW(), NOW()),
('3c000000-0000-0000-0000-000000000012', '1c000000-0000-0000-0000-000000000012', 'Ishaan Verma', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', '560037', '$2b$12$TestPinHashForPatient1DemoUser12345678901234567', NOW(), NOW()),
('3c000000-0000-0000-0000-000000000013', '1c000000-0000-0000-0000-000000000013', 'Atharv Patel', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', '560103', '$2b$12$TestPinHashForPatient1DemoUser12345678901234567', NOW(), NOW()),
('3c000000-0000-0000-0000-000000000014', '1c000000-0000-0000-0000-000000000014', 'Shruti Reddy', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', '560050', '$2b$12$TestPinHashForPatient1DemoUser12345678901234567', NOW(), NOW()),
('3c000000-0000-0000-0000-000000000015', '1c000000-0000-0000-0000-000000000015', 'Shruti Patel', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', '560004', '$2b$12$TestPinHashForPatient1DemoUser12345678901234567', NOW(), NOW()),
('3c000000-0000-0000-0000-000000000016', '1c000000-0000-0000-0000-000000000016', 'Amit Kumar', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', '560001', '$2b$12$TestPinHashForPatient1DemoUser12345678901234567', NOW(), NOW()),
('3c000000-0000-0000-0000-000000000017', '1c000000-0000-0000-0000-000000000017', 'Suresh Joshi', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', '560051', '$2b$12$TestPinHashForPatient1DemoUser12345678901234567', NOW(), NOW()),
('3c000000-0000-0000-0000-000000000018', '1c000000-0000-0000-0000-000000000018', 'Anjali Gupta', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', '560034', '$2b$12$TestPinHashForPatient1DemoUser12345678901234567', NOW(), NOW()),
('3c000000-0000-0000-0000-000000000019', '1c000000-0000-0000-0000-000000000019', 'Rohan Gupta', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', '560038', '$2b$12$TestPinHashForPatient1DemoUser12345678901234567', NOW(), NOW()),
('3c000000-0000-0000-0000-000000000020', '1c000000-0000-0000-0000-000000000020', 'Rahul Reddy', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', '560102', '$2b$12$TestPinHashForPatient1DemoUser12345678901234567', NOW(), NOW());

INSERT INTO public.pharmacies (id, user_id, business_name, license_number, address, city, state, contact_number, qr_identifier, created_at, updated_at) VALUES
('3d000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000001', 'Wellness Pharmacy (Indiranagar)', 'LIC-PHM-1', 'Near Indiranagar, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-1-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000002', '1d000000-0000-0000-0000-000000000002', 'Sanjeevani Pharmacy (HSR Layout)', 'LIC-PHM-2', 'Near HSR Layout, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-2-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000003', '1d000000-0000-0000-0000-000000000003', 'TrueHealth Pharmacy (Whitefield)', 'LIC-PHM-3', 'Near Whitefield, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-3-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000004', '1d000000-0000-0000-0000-000000000004', 'CarePlus Pharmacy (Electronic City)', 'LIC-PHM-4', 'Near Electronic City, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-4-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000005', '1d000000-0000-0000-0000-000000000005', 'LifeCare Pharmacy (Jayanagar)', 'LIC-PHM-5', 'Near Jayanagar, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-5-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000006', '1d000000-0000-0000-0000-000000000006', 'GoodHealth Pharmacy (JP Nagar)', 'LIC-PHM-6', 'Near JP Nagar, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-6-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000007', '1d000000-0000-0000-0000-000000000007', 'Arogya Pharmacy (Malleshwaram)', 'LIC-PHM-7', 'Near Malleshwaram, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-7-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000008', '1d000000-0000-0000-0000-000000000008', 'TrueHealth Pharmacy (Rajajinagar)', 'LIC-PHM-8', 'Near Rajajinagar, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-8-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000009', '1d000000-0000-0000-0000-000000000009', 'LifeCare Pharmacy (Hebbal)', 'LIC-PHM-9', 'Near Hebbal, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-9-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000010', '1d000000-0000-0000-0000-000000000010', 'Sanjeevani Pharmacy (Yelahanka)', 'LIC-PHM-10', 'Near Yelahanka, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-10-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000011', '1d000000-0000-0000-0000-000000000011', 'TrueHealth Pharmacy (Marathahalli)', 'LIC-PHM-11', 'Near Marathahalli, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-11-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000012', '1d000000-0000-0000-0000-000000000012', 'Pulse Pharmacy (Bellandur)', 'LIC-PHM-12', 'Near Bellandur, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-12-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000013', '1d000000-0000-0000-0000-000000000013', 'LifeCare Pharmacy (Banashankari)', 'LIC-PHM-13', 'Near Banashankari, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-13-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000014', '1d000000-0000-0000-0000-000000000014', 'Wellness Pharmacy (Basavanagudi)', 'LIC-PHM-14', 'Near Basavanagudi, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-14-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000015', '1d000000-0000-0000-0000-000000000015', 'LifeCare Pharmacy (MG Road)', 'LIC-PHM-15', 'Near MG Road, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-15-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000016', '1d000000-0000-0000-0000-000000000016', 'Arogya Pharmacy (Shivajinagar)', 'LIC-PHM-16', 'Near Shivajinagar, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-16-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000017', '1d000000-0000-0000-0000-000000000017', 'Wellness Pharmacy (Koramangala)', 'LIC-PHM-17', 'Near Koramangala, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-17-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000018', '1d000000-0000-0000-0000-000000000018', 'GoodHealth Pharmacy (Indiranagar)', 'LIC-PHM-18', 'Near Indiranagar, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-18-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000019', '1d000000-0000-0000-0000-000000000019', 'Arogya Pharmacy (HSR Layout)', 'LIC-PHM-19', 'Near HSR Layout, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-19-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000020', '1d000000-0000-0000-0000-000000000020', 'Sanjeevani Pharmacy (Whitefield)', 'LIC-PHM-20', 'Near Whitefield, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-20-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000021', '1d000000-0000-0000-0000-000000000021', 'Wellness Pharmacy (Electronic City)', 'LIC-PHM-21', 'Near Electronic City, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-21-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000022', '1d000000-0000-0000-0000-000000000022', 'TrueHealth Pharmacy (Jayanagar)', 'LIC-PHM-22', 'Near Jayanagar, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-22-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000023', '1d000000-0000-0000-0000-000000000023', 'Pulse Pharmacy (JP Nagar)', 'LIC-PHM-23', 'Near JP Nagar, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-23-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000024', '1d000000-0000-0000-0000-000000000024', 'Arogya Pharmacy (Malleshwaram)', 'LIC-PHM-24', 'Near Malleshwaram, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-24-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000025', '1d000000-0000-0000-0000-000000000025', 'Pulse Pharmacy (Rajajinagar)', 'LIC-PHM-25', 'Near Rajajinagar, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-25-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000026', '1d000000-0000-0000-0000-000000000026', 'Sanjeevani Pharmacy (Hebbal)', 'LIC-PHM-26', 'Near Hebbal, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-26-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000027', '1d000000-0000-0000-0000-000000000027', 'Sanjeevani Pharmacy (Yelahanka)', 'LIC-PHM-27', 'Near Yelahanka, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-27-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000028', '1d000000-0000-0000-0000-000000000028', 'GoodHealth Pharmacy (Marathahalli)', 'LIC-PHM-28', 'Near Marathahalli, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-28-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000029', '1d000000-0000-0000-0000-000000000029', 'Sanjeevani Pharmacy (Bellandur)', 'LIC-PHM-29', 'Near Bellandur, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-29-ABC', NOW(), NOW()),
('3d000000-0000-0000-0000-000000000030', '1d000000-0000-0000-0000-000000000030', 'LifeCare Pharmacy (Banashankari)', 'LIC-PHM-30', 'Near Banashankari, Bengaluru', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-30-ABC', NOW(), NOW());

INSERT INTO public.pharmacy_locations (id, pharmacy_id, location_name, address, city, state, country, pincode, latitude, longitude, is_primary, is_active, verification_status, created_at, updated_at) VALUES
('4b000000-0000-0000-0000-000000000001', '3d000000-0000-0000-0000-000000000001', 'LifeCare Pharmacy (Indiranagar)', 'Near Indiranagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560038', 12.978061, 77.640825, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000002', '3d000000-0000-0000-0000-000000000002', 'GoodHealth Pharmacy (HSR Layout)', 'Near HSR Layout, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560102', 12.919899, 77.653405, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000003', '3d000000-0000-0000-0000-000000000003', 'LifeCare Pharmacy (Whitefield)', 'Near Whitefield, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560066', 12.970216, 77.760156, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000004', '3d000000-0000-0000-0000-000000000004', 'TrueHealth Pharmacy (Electronic City)', 'Near Electronic City, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560100', 12.853973, 77.678756, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000005', '3d000000-0000-0000-0000-000000000005', 'CarePlus Pharmacy (Jayanagar)', 'Near Jayanagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560041', 12.926824, 77.582657, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000006', '3d000000-0000-0000-0000-000000000006', 'Pulse Pharmacy (JP Nagar)', 'Near JP Nagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560078', 12.899582, 77.597344, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000007', '3d000000-0000-0000-0000-000000000007', 'Pulse Pharmacy (Malleshwaram)', 'Near Malleshwaram, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560003', 13.006099, 77.579060, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000008', '3d000000-0000-0000-0000-000000000008', 'TrueHealth Pharmacy (Rajajinagar)', 'Near Rajajinagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560010', 12.986630, 77.544408, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000009', '3d000000-0000-0000-0000-000000000009', 'CarePlus Pharmacy (Hebbal)', 'Near Hebbal, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560024', 13.043064, 77.585440, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000010', '3d000000-0000-0000-0000-000000000010', 'Wellness Pharmacy (Yelahanka)', 'Near Yelahanka, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560064', 13.089703, 77.609417, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000011', '3d000000-0000-0000-0000-000000000011', 'GoodHealth Pharmacy (Marathahalli)', 'Near Marathahalli, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560037', 12.957320, 77.688230, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000012', '3d000000-0000-0000-0000-000000000012', 'GoodHealth Pharmacy (Bellandur)', 'Near Bellandur, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560103', 12.924406, 77.687307, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000013', '3d000000-0000-0000-0000-000000000013', 'Sanjeevani Pharmacy (Banashankari)', 'Near Banashankari, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560050', 12.913588, 77.539327, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000014', '3d000000-0000-0000-0000-000000000014', 'Pulse Pharmacy (Basavanagudi)', 'Near Basavanagudi, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560004', 12.932002, 77.562935, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000015', '3d000000-0000-0000-0000-000000000015', 'Pulse Pharmacy (MG Road)', 'Near MG Road, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560001', 12.974055, 77.607263, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000016', '3d000000-0000-0000-0000-000000000016', 'Sanjeevani Pharmacy (Shivajinagar)', 'Near Shivajinagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560051', 13.000279, 77.614797, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000017', '3d000000-0000-0000-0000-000000000017', 'Wellness Pharmacy (Koramangala)', 'Near Koramangala, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560034', 12.939883, 77.619730, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000018', '3d000000-0000-0000-0000-000000000018', 'Arogya Pharmacy (Indiranagar)', 'Near Indiranagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560038', 12.985569, 77.642858, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000019', '3d000000-0000-0000-0000-000000000019', 'Pulse Pharmacy (HSR Layout)', 'Near HSR Layout, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560102', 12.910462, 77.649952, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000020', '3d000000-0000-0000-0000-000000000020', 'Pulse Pharmacy (Whitefield)', 'Near Whitefield, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560066', 12.957422, 77.748903, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000021', '3d000000-0000-0000-0000-000000000021', 'Arogya Pharmacy (Electronic City)', 'Near Electronic City, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560100', 12.827426, 77.684955, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000022', '3d000000-0000-0000-0000-000000000022', 'Sanjeevani Pharmacy (Jayanagar)', 'Near Jayanagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560041', 12.939438, 77.568218, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000023', '3d000000-0000-0000-0000-000000000023', 'Arogya Pharmacy (JP Nagar)', 'Near JP Nagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560078', 12.904182, 77.595069, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000024', '3d000000-0000-0000-0000-000000000024', 'Pulse Pharmacy (Malleshwaram)', 'Near Malleshwaram, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560003', 13.015196, 77.556370, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000025', '3d000000-0000-0000-0000-000000000025', 'Sanjeevani Pharmacy (Rajajinagar)', 'Near Rajajinagar, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560010', 12.984146, 77.543103, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000026', '3d000000-0000-0000-0000-000000000026', 'Arogya Pharmacy (Hebbal)', 'Near Hebbal, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560024', 13.021977, 77.599971, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000027', '3d000000-0000-0000-0000-000000000027', 'Wellness Pharmacy (Yelahanka)', 'Near Yelahanka, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560064', 13.111390, 77.588503, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000028', '3d000000-0000-0000-0000-000000000028', 'Sanjeevani Pharmacy (Marathahalli)', 'Near Marathahalli, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560037', 12.967716, 77.699270, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000029', '3d000000-0000-0000-0000-000000000029', 'Pulse Pharmacy (Bellandur)', 'Near Bellandur, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560103', 12.936516, 77.686842, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('4b000000-0000-0000-0000-000000000030', '3d000000-0000-0000-0000-000000000030', 'TrueHealth Pharmacy (Banashankari)', 'Near Banashankari, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '560050', 12.923469, 77.537840, TRUE, TRUE, 'APPROVED', NOW(), NOW());


SET session_replication_role = 'origin';
COMMIT;




-- ==============================================================================
-- SOURCE: 08_seed_dummy_data.sql
-- ==============================================================================
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
('3edad050-ca2f-4e19-83f3-97bab710443a', '1c000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', '2a988ac7-411b-4bf2-9a86-9213e92e0b8b', 'Complete Blood Count (CBC)', 'Routine CBC panel ordered by Dr. Sharma', '2026-09-12 12:32:40', '2026-09-12 12:32:40');

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
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Anjali Joshi"') WHERE email = '1c000000-0000-0000-0000-000000000006';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Riya Chauhan"') WHERE email = '1c000000-0000-0000-0000-000000000007';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Shruti Gupta"') WHERE email = '1c000000-0000-0000-0000-000000000008';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Priya Reddy"') WHERE email = '1c000000-0000-0000-0000-000000000009';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Sneha Patel"') WHERE email = '1c000000-0000-0000-0000-000000000010';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Vihaan Joshi"') WHERE email = '1c000000-0000-0000-0000-000000000011';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Ishaan Verma"') WHERE email = '1c000000-0000-0000-0000-000000000012';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Atharv Patel"') WHERE email = '1c000000-0000-0000-0000-000000000013';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Shruti Reddy"') WHERE email = '1c000000-0000-0000-0000-000000000014';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Shruti Patel"') WHERE email = '1c000000-0000-0000-0000-000000000015';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Amit Kumar"') WHERE email = '1c000000-0000-0000-0000-000000000016';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Suresh Joshi"') WHERE email = '1c000000-0000-0000-0000-000000000017';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Anjali Gupta"') WHERE email = '1c000000-0000-0000-0000-000000000018';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Rohan Gupta"') WHERE email = '1c000000-0000-0000-0000-000000000019';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Rahul Reddy"') WHERE email = '1c000000-0000-0000-0000-000000000020';
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
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"CarePlus Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000011';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"CarePlus Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000012';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Wellness Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000013';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Pulse Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000014';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"LifeCare Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000015';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"GoodHealth Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000016';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Sanjeevani Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000017';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Arogya Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000018';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Sanjeevani Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000019';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"LifeCare Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000020';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"LifeCare Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000021';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"CarePlus Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000022';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Sanjeevani Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000023';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"CarePlus Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000024';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"CarePlus Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000025';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"GoodHealth Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000026';
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"TrueHealth Pharmacy"') WHERE email = '1d000000-0000-0000-0000-000000000027';
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
UPDATE public.patients SET full_name = 'Anjali Joshi' WHERE user_id = '1c000000-0000-0000-0000-000000000006';
UPDATE public.patients SET full_name = 'Riya Chauhan' WHERE user_id = '1c000000-0000-0000-0000-000000000007';
UPDATE public.patients SET full_name = 'Shruti Gupta' WHERE user_id = '1c000000-0000-0000-0000-000000000008';
UPDATE public.patients SET full_name = 'Priya Reddy' WHERE user_id = '1c000000-0000-0000-0000-000000000009';
UPDATE public.patients SET full_name = 'Sneha Patel' WHERE user_id = '1c000000-0000-0000-0000-000000000010';
UPDATE public.patients SET full_name = 'Vihaan Joshi' WHERE user_id = '1c000000-0000-0000-0000-000000000011';
UPDATE public.patients SET full_name = 'Ishaan Verma' WHERE user_id = '1c000000-0000-0000-0000-000000000012';
UPDATE public.patients SET full_name = 'Atharv Patel' WHERE user_id = '1c000000-0000-0000-0000-000000000013';
UPDATE public.patients SET full_name = 'Shruti Reddy' WHERE user_id = '1c000000-0000-0000-0000-000000000014';
UPDATE public.patients SET full_name = 'Shruti Patel' WHERE user_id = '1c000000-0000-0000-0000-000000000015';
UPDATE public.patients SET full_name = 'Amit Kumar' WHERE user_id = '1c000000-0000-0000-0000-000000000016';
UPDATE public.patients SET full_name = 'Suresh Joshi' WHERE user_id = '1c000000-0000-0000-0000-000000000017';
UPDATE public.patients SET full_name = 'Anjali Gupta' WHERE user_id = '1c000000-0000-0000-0000-000000000018';
UPDATE public.patients SET full_name = 'Rohan Gupta' WHERE user_id = '1c000000-0000-0000-0000-000000000019';
UPDATE public.patients SET full_name = 'Rahul Reddy' WHERE user_id = '1c000000-0000-0000-0000-000000000020';

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
UPDATE public.pharmacies SET business_name = 'TrueHealth Pharmacy (Marathahalli)' WHERE user_id = '1d000000-0000-0000-0000-000000000011';
UPDATE public.pharmacy_locations SET location_name = 'TrueHealth Pharmacy (Marathahalli)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000011';
UPDATE public.pharmacies SET business_name = 'Pulse Pharmacy (Bellandur)' WHERE user_id = '1d000000-0000-0000-0000-000000000012';
UPDATE public.pharmacy_locations SET location_name = 'Pulse Pharmacy (Bellandur)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000012';
UPDATE public.pharmacies SET business_name = 'LifeCare Pharmacy (Banashankari)' WHERE user_id = '1d000000-0000-0000-0000-000000000013';
UPDATE public.pharmacy_locations SET location_name = 'LifeCare Pharmacy (Banashankari)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000013';
UPDATE public.pharmacies SET business_name = 'Wellness Pharmacy (Basavanagudi)' WHERE user_id = '1d000000-0000-0000-0000-000000000014';
UPDATE public.pharmacy_locations SET location_name = 'Wellness Pharmacy (Basavanagudi)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000014';
UPDATE public.pharmacies SET business_name = 'LifeCare Pharmacy (MG Road)' WHERE user_id = '1d000000-0000-0000-0000-000000000015';
UPDATE public.pharmacy_locations SET location_name = 'LifeCare Pharmacy (MG Road)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000015';
UPDATE public.pharmacies SET business_name = 'Arogya Pharmacy (Shivajinagar)' WHERE user_id = '1d000000-0000-0000-0000-000000000016';
UPDATE public.pharmacy_locations SET location_name = 'Arogya Pharmacy (Shivajinagar)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000016';
UPDATE public.pharmacies SET business_name = 'Wellness Pharmacy (Koramangala)' WHERE user_id = '1d000000-0000-0000-0000-000000000017';
UPDATE public.pharmacy_locations SET location_name = 'Wellness Pharmacy (Koramangala)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000017';
UPDATE public.pharmacies SET business_name = 'GoodHealth Pharmacy (Indiranagar)' WHERE user_id = '1d000000-0000-0000-0000-000000000018';
UPDATE public.pharmacy_locations SET location_name = 'GoodHealth Pharmacy (Indiranagar)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000018';
UPDATE public.pharmacies SET business_name = 'Arogya Pharmacy (HSR Layout)' WHERE user_id = '1d000000-0000-0000-0000-000000000019';
UPDATE public.pharmacy_locations SET location_name = 'Arogya Pharmacy (HSR Layout)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000019';
UPDATE public.pharmacies SET business_name = 'Sanjeevani Pharmacy (Whitefield)' WHERE user_id = '1d000000-0000-0000-0000-000000000020';
UPDATE public.pharmacy_locations SET location_name = 'Sanjeevani Pharmacy (Whitefield)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000020';
UPDATE public.pharmacies SET business_name = 'Wellness Pharmacy (Electronic City)' WHERE user_id = '1d000000-0000-0000-0000-000000000021';
UPDATE public.pharmacy_locations SET location_name = 'Wellness Pharmacy (Electronic City)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000021';
UPDATE public.pharmacies SET business_name = 'TrueHealth Pharmacy (Jayanagar)' WHERE user_id = '1d000000-0000-0000-0000-000000000022';
UPDATE public.pharmacy_locations SET location_name = 'TrueHealth Pharmacy (Jayanagar)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000022';
UPDATE public.pharmacies SET business_name = 'Pulse Pharmacy (JP Nagar)' WHERE user_id = '1d000000-0000-0000-0000-000000000023';
UPDATE public.pharmacy_locations SET location_name = 'Pulse Pharmacy (JP Nagar)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000023';
UPDATE public.pharmacies SET business_name = 'Arogya Pharmacy (Malleshwaram)' WHERE user_id = '1d000000-0000-0000-0000-000000000024';
UPDATE public.pharmacy_locations SET location_name = 'Arogya Pharmacy (Malleshwaram)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000024';
UPDATE public.pharmacies SET business_name = 'Pulse Pharmacy (Rajajinagar)' WHERE user_id = '1d000000-0000-0000-0000-000000000025';
UPDATE public.pharmacy_locations SET location_name = 'Pulse Pharmacy (Rajajinagar)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000025';
UPDATE public.pharmacies SET business_name = 'Sanjeevani Pharmacy (Hebbal)' WHERE user_id = '1d000000-0000-0000-0000-000000000026';
UPDATE public.pharmacy_locations SET location_name = 'Sanjeevani Pharmacy (Hebbal)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000026';
UPDATE public.pharmacies SET business_name = 'Sanjeevani Pharmacy (Yelahanka)' WHERE user_id = '1d000000-0000-0000-0000-000000000027';
UPDATE public.pharmacy_locations SET location_name = 'Sanjeevani Pharmacy (Yelahanka)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000027';
UPDATE public.pharmacies SET business_name = 'GoodHealth Pharmacy (Marathahalli)' WHERE user_id = '1d000000-0000-0000-0000-000000000028';
UPDATE public.pharmacy_locations SET location_name = 'GoodHealth Pharmacy (Marathahalli)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000028';
UPDATE public.pharmacies SET business_name = 'Sanjeevani Pharmacy (Bellandur)' WHERE user_id = '1d000000-0000-0000-0000-000000000029';
UPDATE public.pharmacy_locations SET location_name = 'Sanjeevani Pharmacy (Bellandur)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000029';
UPDATE public.pharmacies SET business_name = 'LifeCare Pharmacy (Banashankari)' WHERE user_id = '1d000000-0000-0000-0000-000000000030';
UPDATE public.pharmacy_locations SET location_name = 'LifeCare Pharmacy (Banashankari)' WHERE pharmacy_id = '3d000000-0000-0000-0000-000000000030';

COMMIT;


