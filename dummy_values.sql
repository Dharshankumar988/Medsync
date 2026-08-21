-- ==============================================================================
-- MEDSYNC COMPREHENSIVE DUMMY / SEED DATA SCRIPT
-- ==============================================================================
-- This script seeds a complete, realistic, healthy database for MedSync.
-- All 11 test accounts use role-specific passwords:
--
-- Account List:
-- 1.  Admin:      admin@medsync.com      | admin
-- 2.  Doctor 1:   doctor1@medsync.com    | doctor (Cardiologist, Manipal Hospital)
-- 3.  Doctor 2:   doctor2@medsync.com    | doctor (Neurologist, Apollo Hospitals)
-- 4.  Doctor 3:   doctor3@medsync.com    | doctor (Orthopedic, Fortis Hospital)
-- 5.  Patient 1:  patient1@medsync.com   | patient (Rajesh Gowda, O+)
-- 6.  Patient 2:  patient2@medsync.com   | patient (Sneha Patil, B+)
-- 7.  Patient 3:  patient3@medsync.com   | patient (Karthik N, A+)
-- 8.  Patient 4:  patient4@medsync.com   | patient (Priya K, AB+)
-- 9.  Patient 5:  patient5@medsync.com   | patient (Arjun Reddy, O-)
-- 10. Pharmacy 1: pharmacy1@medsync.com  | pharma (Apollo Pharmacy Indiranagar)
-- 11. Pharmacy 2: pharmacy2@medsync.com  | pharma (MedPlus Koramangala)
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. TRUNCATE APPLICATION TABLES
-- ==============================================================================
TRUNCATE TABLE 
  qr_authorization_tokens, download_audit_logs, audit_logs, api_request_logs,
  consultations, medical_history_shares, consent_history,
  invoices, payments, delivery_tracking, medicine_order_items, medicine_orders, 
  prescription_items, prescriptions, appointment_status_history, appointments, 
  medicine_inventory, medicines, suppliers, medicine_categories, 
  doctor_locations, pharmacy_locations, doctor_availability, verification_requests,
  ai_chat_messages, ai_chat_sessions, doctor_notes, ai_analyses, ocr_results,
  file_metadata, medical_record_versions, medical_record_tag_mappings, medical_records, medical_record_tags, medical_record_categories,
  notifications, notification_preferences,
  patients, doctors, pharmacies, admins, users, hospitals 
  CASCADE;

-- ==============================================================================
-- 2. CLEAN UP EXISTING DUMMY AUTH ACCOUNTS
-- ==============================================================================
DELETE FROM auth.identities WHERE user_id IN (
  'a1000000-0000-0000-0000-000000000000',
  'b1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000003',
  'c1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000003',
  'c1000000-0000-0000-0000-000000000004',
  'c1000000-0000-0000-0000-000000000005',
  'd1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000002'
) OR user_id IN (
  SELECT id FROM auth.users WHERE email IN (
    'admin@medsync.com', 'doctor1@medsync.com', 'doctor2@medsync.com', 'doctor3@medsync.com',
    'patient1@medsync.com', 'patient2@medsync.com', 'patient3@medsync.com', 'patient4@medsync.com', 'patient5@medsync.com',
    'pharmacy1@medsync.com', 'pharmacy2@medsync.com'
  )
);

DELETE FROM auth.users WHERE id IN (
  'a1000000-0000-0000-0000-000000000000',
  'b1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000003',
  'c1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000003',
  'c1000000-0000-0000-0000-000000000004',
  'c1000000-0000-0000-0000-000000000005',
  'd1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000002'
) OR email IN (
  'admin@medsync.com', 'doctor1@medsync.com', 'doctor2@medsync.com', 'doctor3@medsync.com',
  'patient1@medsync.com', 'patient2@medsync.com', 'patient3@medsync.com', 'patient4@medsync.com', 'patient5@medsync.com',
  'pharmacy1@medsync.com', 'pharmacy2@medsync.com'
);

-- ==============================================================================
-- 3. INSERT INTO auth.users (With role-specific passwords)
-- ==============================================================================
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES 
('00000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@medsync.com', crypt('admin', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "ADMIN", "full_name": "Admin Chief"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'doctor1@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Dr. Ramesh Rao", "license_number": "LIC-DOC-101"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'doctor2@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Dr. Ananya Hegde", "license_number": "LIC-DOC-102"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'doctor3@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "DOCTOR", "full_name": "Dr. Suresh Kumar", "license_number": "LIC-DOC-103"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'patient1@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Rajesh Gowda"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'patient2@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Sneha Patil"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'patient3@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Karthik N"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'patient4@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Priya K"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'patient5@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PATIENT", "full_name": "Arjun Reddy"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', 'd1000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'pharmacy1@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "Apollo Pharmacy Indiranagar", "license_number": "LIC-PHM-01"}'::jsonb, NOW(), NOW(), '', '', '', ''),
('00000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'pharmacy2@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"role": "PHARMACY", "full_name": "MedPlus Koramangala", "license_number": "LIC-PHM-02"}'::jsonb, NOW(), NOW(), '', '', '', '');

-- ==============================================================================
-- 4. INSERT INTO auth.identities
-- ==============================================================================
INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at
) VALUES 
(gen_random_uuid(), 'a1000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', '{"sub":"a1000000-0000-0000-0000-000000000000","email":"admin@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), 'b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '{"sub":"b1000000-0000-0000-0000-000000000001","email":"doctor1@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), 'b1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', '{"sub":"b1000000-0000-0000-0000-000000000002","email":"doctor2@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), 'b1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', '{"sub":"b1000000-0000-0000-0000-000000000003","email":"doctor3@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), 'c1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', '{"sub":"c1000000-0000-0000-0000-000000000001","email":"patient1@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), 'c1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', '{"sub":"c1000000-0000-0000-0000-000000000002","email":"patient2@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), 'c1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', '{"sub":"c1000000-0000-0000-0000-000000000003","email":"patient3@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), 'c1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000004', '{"sub":"c1000000-0000-0000-0000-000000000004","email":"patient4@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), 'c1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000005', '{"sub":"c1000000-0000-0000-0000-000000000005","email":"patient5@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), 'd1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', '{"sub":"d1000000-0000-0000-0000-000000000001","email":"pharmacy1@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), 'd1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', '{"sub":"d1000000-0000-0000-0000-000000000002","email":"pharmacy2@medsync.com"}'::jsonb, 'email', NOW(), NOW(), NOW());

-- ==============================================================================
-- 5. CLEAN UP AUTO-CREATED PROFILES (Ensures deterministic IDs from this script)
-- ==============================================================================
DELETE FROM public.verification_requests WHERE user_id IN (
  'a1000000-0000-0000-0000-000000000000',
  'b1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000003',
  'c1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000003',
  'c1000000-0000-0000-0000-000000000004',
  'c1000000-0000-0000-0000-000000000005',
  'd1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000002'
);
DELETE FROM public.patients WHERE user_id IN (
  'c1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000003',
  'c1000000-0000-0000-0000-000000000004',
  'c1000000-0000-0000-0000-000000000005'
);
DELETE FROM public.doctors WHERE user_id IN (
  'b1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000003'
);
DELETE FROM public.pharmacies WHERE user_id IN (
  'd1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000002'
);
DELETE FROM public.admins WHERE user_id IN (
  'a1000000-0000-0000-0000-000000000000'
);
DELETE FROM public.users WHERE id IN (
  'a1000000-0000-0000-0000-000000000000',
  'b1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000003',
  'c1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000003',
  'c1000000-0000-0000-0000-000000000004',
  'c1000000-0000-0000-0000-000000000005',
  'd1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000002'
);

-- ==============================================================================
-- 6. INSERT INTO public.users
-- ==============================================================================
INSERT INTO public.users (id, email, password_hash, role, status, is_verified, profile_completion_percentage, created_at, updated_at) VALUES 
('a1000000-0000-0000-0000-000000000000', 'admin@medsync.com', 'supabase_managed', 'ADMIN', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('b1000000-0000-0000-0000-000000000001', 'doctor1@medsync.com', 'supabase_managed', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('b1000000-0000-0000-0000-000000000002', 'doctor2@medsync.com', 'supabase_managed', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('b1000000-0000-0000-0000-000000000003', 'doctor3@medsync.com', 'supabase_managed', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('c1000000-0000-0000-0000-000000000001', 'patient1@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('c1000000-0000-0000-0000-000000000002', 'patient2@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('c1000000-0000-0000-0000-000000000003', 'patient3@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('c1000000-0000-0000-0000-000000000004', 'patient4@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('c1000000-0000-0000-0000-000000000005', 'patient5@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('d1000000-0000-0000-0000-000000000001', 'pharmacy1@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW()),
('d1000000-0000-0000-0000-000000000002', 'pharmacy2@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW());

-- ==============================================================================
-- 7. INSERT INTO public.hospitals
-- ==============================================================================
INSERT INTO public.hospitals (id, name, address, city, state, country, pincode, phone_number, latitude, longitude, is_verified, is_active, created_at, updated_at) VALUES 
('11111111-0000-0000-0000-000000000001', 'Manipal Hospital HAL Airport Road', '98, HAL Old Airport Rd, Kodihalli', 'Bangalore', 'Karnataka', 'India', '560017', '+91 80 2502 4444', 12.95920000, 77.65680000, TRUE, TRUE, NOW(), NOW()),
('11111111-0000-0000-0000-000000000002', 'Apollo Hospitals Bannerghatta Road', '154/11, Opp IIM-B, Bannerghatta Road', 'Bangalore', 'Karnataka', 'India', '560076', '+91 80 2630 4050', 12.89400000, 77.59860000, TRUE, TRUE, NOW(), NOW()),
('11111111-0000-0000-0000-000000000003', 'Fortis Hospital Cunningham Road', '14, Cunningham Rd, Vasanth Nagar', 'Bangalore', 'Karnataka', 'India', '560052', '+91 80 4199 4444', 12.98820000, 77.59370000, TRUE, TRUE, NOW(), NOW()),
('11111111-0000-0000-0000-000000000004', 'Aster CMI Hospital Hebbal', 'No. 43/2, New Airport Road, NH 44', 'Bangalore', 'Karnataka', 'India', '560092', '+91 80 4342 0100', 13.05600000, 77.59000000, TRUE, TRUE, NOW(), NOW());

-- ==============================================================================
-- 8. INSERT INTO public.admins
-- ==============================================================================
INSERT INTO public.admins (id, user_id, full_name, department, created_at, updated_at) VALUES 
('ec7eca68-f636-470e-8e77-a48d283cf68a', 'a1000000-0000-0000-0000-000000000000', 'Admin Chief', 'Operations & Compliance', NOW(), NOW());

-- ==============================================================================
-- 9. INSERT INTO public.doctors
-- ==============================================================================
INSERT INTO public.doctors (
  id, user_id, full_name, specialization, license_number, 
  hospital_name, hospital_address, experience_years, consultation_fee, 
  hospital_id, doctor_status, created_at, updated_at
) VALUES 
('67ff15ef-7ad3-409e-8396-fe818cab195c', 'b1000000-0000-0000-0000-000000000001', 'Dr. Ramesh Rao', 'Cardiologist', 'LIC-DOC-101', 'Manipal Hospital HAL Airport Road', '98, HAL Old Airport Rd, Kodihalli', 18, 1500, '11111111-0000-0000-0000-000000000001', 'APPROVED', NOW(), NOW()),
('cd6b9b87-8d3f-4b4d-aa73-46d38bcc60f8', 'b1000000-0000-0000-0000-000000000002', 'Dr. Ananya Hegde', 'Neurologist', 'LIC-DOC-102', 'Apollo Hospitals Bannerghatta Road', '154/11, Opp IIM-B, Bannerghatta Road', 12, 1200, '11111111-0000-0000-0000-000000000002', 'APPROVED', NOW(), NOW()),
('d9a2d271-41bb-4aaa-9c8f-8513cb7c68f0', 'b1000000-0000-0000-0000-000000000003', 'Dr. Suresh Kumar', 'Orthopedic', 'LIC-DOC-103', 'Fortis Hospital Cunningham Road', '14, Cunningham Rd, Vasanth Nagar', 8, 1000, '11111111-0000-0000-0000-000000000003', 'APPROVED', NOW(), NOW());

-- ==============================================================================
-- 10. INSERT INTO public.patients (With valid primary_physician_id references)
-- ==============================================================================
INSERT INTO public.patients (
  id, user_id, full_name, date_of_birth, gender, blood_group, city, state, primary_physician_id, created_at, updated_at
) VALUES 
('8c3ed3fe-1c92-4013-9e6c-d5b311476d99', 'c1000000-0000-0000-0000-000000000001', 'Rajesh Gowda', '1990-01-01', 'Male', 'O+', 'Bangalore', 'Karnataka', '67ff15ef-7ad3-409e-8396-fe818cab195c', NOW(), NOW()),
('e5723505-f590-4903-9194-012ab7d7c3e3', 'c1000000-0000-0000-0000-000000000002', 'Sneha Patil', '1992-05-14', 'Female', 'B+', 'Bangalore', 'Karnataka', 'cd6b9b87-8d3f-4b4d-aa73-46d38bcc60f8', NOW(), NOW()),
('34b66e78-0896-4dad-a1e8-4a531c879e38', 'c1000000-0000-0000-0000-000000000003', 'Karthik N', '1988-11-20', 'Male', 'A+', 'Bangalore', 'Karnataka', 'd9a2d271-41bb-4aaa-9c8f-8513cb7c68f0', NOW(), NOW()),
('0f4274e1-3e54-4993-8a54-a6370225d9f3', 'c1000000-0000-0000-0000-000000000004', 'Priya K', '1995-03-08', 'Female', 'AB+', 'Bangalore', 'Karnataka', '67ff15ef-7ad3-409e-8396-fe818cab195c', NOW(), NOW()),
('b076d4b9-71ff-41f9-aba5-92f9d2793108', 'c1000000-0000-0000-0000-000000000005', 'Arjun Reddy', '1985-08-25', 'Male', 'O-', 'Bangalore', 'Karnataka', 'd9a2d271-41bb-4aaa-9c8f-8513cb7c68f0', NOW(), NOW());

-- ==============================================================================
-- 11. INSERT INTO public.pharmacies
-- ==============================================================================
INSERT INTO public.pharmacies (
  id, user_id, business_name, license_number, address, city, state, contact_number, created_at, updated_at
) VALUES 
('3b0e42cb-2a75-4e06-a84b-643e85c486f0', 'd1000000-0000-0000-0000-000000000001', 'Apollo Pharmacy Indiranagar', 'LIC-PHM-01', 'Indiranagar 100ft road', 'Bangalore', 'Karnataka', '9876543210', NOW(), NOW()),
('2519776d-a165-4148-88a0-bc43daea4188', 'd1000000-0000-0000-0000-000000000002', 'MedPlus Koramangala', 'LIC-PHM-02', 'Koramangala 80ft road', 'Bangalore', 'Karnataka', '9876543211', NOW(), NOW());

-- ==============================================================================
-- 12. INSERT INTO public.doctor_locations
-- ==============================================================================
INSERT INTO public.doctor_locations (
  id, doctor_id, location_type, location_name, hospital_id, 
  address, city, state, country, pincode, is_primary, is_active, verification_status, created_at, updated_at
) VALUES 
('22222222-0000-0000-0000-000000000001', '67ff15ef-7ad3-409e-8396-fe818cab195c', 'HOSPITAL', 'Manipal Hospital Cardiology OPD', '11111111-0000-0000-0000-000000000001', '98, HAL Old Airport Rd', 'Bangalore', 'Karnataka', 'India', '560017', TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('22222222-0000-0000-0000-000000000002', 'cd6b9b87-8d3f-4b4d-aa73-46d38bcc60f8', 'HOSPITAL', 'Apollo Neurology Block', '11111111-0000-0000-0000-000000000002', '154/11 Bannerghatta Road', 'Bangalore', 'Karnataka', 'India', '560076', TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('22222222-0000-0000-0000-000000000003', 'd9a2d271-41bb-4aaa-9c8f-8513cb7c68f0', 'HOSPITAL', 'Fortis Ortho Care Center', '11111111-0000-0000-0000-000000000003', '14 Cunningham Rd', 'Bangalore', 'Karnataka', 'India', '560052', TRUE, TRUE, 'APPROVED', NOW(), NOW());

-- ==============================================================================
-- 13. INSERT INTO public.pharmacy_locations
-- ==============================================================================
INSERT INTO public.pharmacy_locations (
  id, pharmacy_id, location_name, address, city, state, country, pincode, phone, delivery_available, is_primary, is_active, verification_status, created_at, updated_at
) VALUES 
('33333333-0000-0000-0000-000000000001', '3b0e42cb-2a75-4e06-a84b-643e85c486f0', 'Apollo Pharmacy - Indiranagar Branch', 'Indiranagar 100ft road', 'Bangalore', 'Karnataka', 'India', '560038', '9876543210', TRUE, TRUE, TRUE, 'APPROVED', NOW(), NOW()),
('33333333-0000-0000-0000-000000000002', '2519776d-a165-4148-88a0-bc43daea4188', 'MedPlus - Koramangala 4th Block', 'Koramangala 80ft road', 'Bangalore', 'Karnataka', 'India', '560034', '9876543211', TRUE, TRUE, TRUE, 'APPROVED', NOW(), NOW());

-- ==============================================================================
-- 14. INSERT INTO public.doctor_availability
-- ==============================================================================
INSERT INTO public.doctor_availability (id, doctor_id, day_of_week, start_time, end_time, is_available, created_at, updated_at) VALUES
(gen_random_uuid(), 'b1000000-0000-0000-0000-000000000001', 1, '09:00:00', '17:00:00', TRUE, NOW(), NOW()),
(gen_random_uuid(), 'b1000000-0000-0000-0000-000000000001', 2, '09:00:00', '17:00:00', TRUE, NOW(), NOW()),
(gen_random_uuid(), 'b1000000-0000-0000-0000-000000000001', 3, '09:00:00', '17:00:00', TRUE, NOW(), NOW()),
(gen_random_uuid(), 'b1000000-0000-0000-0000-000000000002', 1, '10:00:00', '18:00:00', TRUE, NOW(), NOW()),
(gen_random_uuid(), 'b1000000-0000-0000-0000-000000000002', 2, '10:00:00', '18:00:00', TRUE, NOW(), NOW()),
(gen_random_uuid(), 'b1000000-0000-0000-0000-000000000003', 1, '08:30:00', '16:30:00', TRUE, NOW(), NOW()),
(gen_random_uuid(), 'b1000000-0000-0000-0000-000000000003', 3, '08:30:00', '16:30:00', TRUE, NOW(), NOW());

-- ==============================================================================
-- 15. INSERT INTO public.verification_requests
-- ==============================================================================
INSERT INTO public.verification_requests (id, user_id, role_type, status, reviewer_id, review_date, approval_date, created_at, updated_at) VALUES 
('44444444-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'DOCTOR', 'APPROVED', 'ec7eca68-f636-470e-8e77-a48d283cf68a', NOW(), NOW(), NOW(), NOW()),
('44444444-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'DOCTOR', 'APPROVED', 'ec7eca68-f636-470e-8e77-a48d283cf68a', NOW(), NOW(), NOW(), NOW()),
('44444444-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', 'DOCTOR', 'APPROVED', 'ec7eca68-f636-470e-8e77-a48d283cf68a', NOW(), NOW(), NOW(), NOW()),
('44444444-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000001', 'PHARMACY', 'APPROVED', 'ec7eca68-f636-470e-8e77-a48d283cf68a', NOW(), NOW(), NOW(), NOW()),
('44444444-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000002', 'PHARMACY', 'APPROVED', 'ec7eca68-f636-470e-8e77-a48d283cf68a', NOW(), NOW(), NOW(), NOW());

-- ==============================================================================
-- 16. INSERT INTO public.medicine_categories
-- ==============================================================================
INSERT INTO public.medicine_categories (id, name, description, created_at, updated_at) VALUES 
('0bff6a99-2ff6-47c9-9ef8-6f58afaab860', 'Analgesics & Antipyretics', 'Pain relievers and fever reducers', NOW(), NOW()),
('0bff6a99-2ff6-47c9-9ef8-6f58afaab861', 'Antibiotics & Antivirals', 'Anti-infective medications', NOW(), NOW()),
('0bff6a99-2ff6-47c9-9ef8-6f58afaab862', 'Cardiovascular & Diabetes', 'Heart and blood sugar management', NOW(), NOW()),
('0bff6a99-2ff6-47c9-9ef8-6f58afaab863', 'Respiratory & Antihistamines', 'Allergy and respiratory care', NOW(), NOW()),
('0bff6a99-2ff6-47c9-9ef8-6f58afaab864', 'Gastrointestinal', 'Digestive health and antacids', NOW(), NOW());

-- ==============================================================================
-- 17. INSERT INTO public.medicines
-- ==============================================================================
INSERT INTO public.medicines (id, name, generic_name, brand_name, category_id, manufacturer, strength, dosage_form, pack_size, price, prescription_required, created_at, updated_at) VALUES 
('ef799ece-17f0-4236-9984-2fbab8e16712', 'Paracetamol 650mg', 'Paracetamol', 'Dolo 650', '0bff6a99-2ff6-47c9-9ef8-6f58afaab860', 'Micro Labs', '650mg', 'Tablet', '15 Tablets', 50.0, FALSE, NOW(), NOW()),
('ea53927a-cfa5-4b7c-91a4-7c8f11389fe6', 'Amoxicillin 500mg', 'Amoxicillin', 'Novamox 500', '0bff6a99-2ff6-47c9-9ef8-6f58afaab861', 'Cipla', '500mg', 'Capsule', '10 Capsules', 85.0, TRUE, NOW(), NOW()),
('167c9f2a-0e4e-444d-989f-807de63b477f', 'Ibuprofen 400mg', 'Ibuprofen', 'Brufen 400', '0bff6a99-2ff6-47c9-9ef8-6f58afaab860', 'Abbott', '400mg', 'Tablet', '15 Tablets', 45.0, FALSE, NOW(), NOW()),
('2856e2e2-4759-4d77-8649-3086da654e47', 'Cetirizine 10mg', 'Cetirizine', 'Cetzine', '0bff6a99-2ff6-47c9-9ef8-6f58afaab863', 'Dr. Reddy', '10mg', 'Tablet', '10 Tablets', 35.0, FALSE, NOW(), NOW()),
('a84715f1-4057-495d-862c-a07b85ab045f', 'Azithromycin 500mg', 'Azithromycin', 'Azithral 500', '0bff6a99-2ff6-47c9-9ef8-6f58afaab861', 'Alembic', '500mg', 'Tablet', '5 Tablets', 120.0, TRUE, NOW(), NOW()),
('c76900c4-5eb7-4ae8-8078-2a97aae6eef5', 'Omeprazole 20mg', 'Omeprazole', 'Omez', '0bff6a99-2ff6-47c9-9ef8-6f58afaab864', 'Dr. Reddy', '20mg', 'Capsule', '20 Capsules', 95.0, FALSE, NOW(), NOW()),
('7b9daba0-eaf2-4ad1-93fb-7b61662fb94e', 'Metformin 500mg', 'Metformin', 'Glycomet 500', '0bff6a99-2ff6-47c9-9ef8-6f58afaab862', 'USV', '500mg', 'Tablet', '20 Tablets', 42.0, TRUE, NOW(), NOW()),
('47e0ea17-47db-45ef-a0a8-c4b506db4adf', 'Amlodipine 5mg', 'Amlodipine', 'Amlong 5', '0bff6a99-2ff6-47c9-9ef8-6f58afaab862', 'Micro Labs', '5mg', 'Tablet', '15 Tablets', 58.0, TRUE, NOW(), NOW());

-- ==============================================================================
-- 18. INSERT INTO public.suppliers
-- ==============================================================================
INSERT INTO public.suppliers (id, name, contact_person, email, phone_number, address, license_number, created_at, updated_at) VALUES 
('55555555-0000-0000-0000-000000000001', 'Cipla Health Distribution', 'Vikram Mehra', 'supply@cipla.com', '9845012345', 'Peenya Industrial Area, Bangalore', 'SUP-LIC-01', NOW(), NOW()),
('55555555-0000-0000-0000-000000000002', 'Sun Pharma Logistics', 'Pooja Nair', 'distribution@sunpharma.com', '9845067890', 'Electronic City, Bangalore', 'SUP-LIC-02', NOW(), NOW());

-- ==============================================================================
-- 19. INSERT INTO public.medicine_inventory
-- ==============================================================================
INSERT INTO public.medicine_inventory (id, pharmacy_id, medicine_id, supplier_id, batch_number, expiry_date, stock_quantity, unit_price, selling_price, created_at, updated_at) VALUES 
('66666666-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'ef799ece-17f0-4236-9984-2fbab8e16712', '55555555-0000-0000-0000-000000000001', 'BATCH-DOLO-2026', '2028-12-31', 450, 40.0, 50.0, NOW(), NOW()),
('66666666-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'ea53927a-cfa5-4b7c-91a4-7c8f11389fe6', '55555555-0000-0000-0000-000000000001', 'BATCH-NOVA-2026', '2028-06-30', 200, 70.0, 85.0, NOW(), NOW()),
('66666666-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', 'c76900c4-5eb7-4ae8-8078-2a97aae6eef5', '55555555-0000-0000-0000-000000000002', 'BATCH-OMEZ-2026', '2027-11-30', 320, 75.0, 95.0, NOW(), NOW()),
('66666666-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000002', 'ef799ece-17f0-4236-9984-2fbab8e16712', '55555555-0000-0000-0000-000000000001', 'BATCH-DOLO-2026B', '2028-12-31', 500, 40.0, 50.0, NOW(), NOW()),
('66666666-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000002', 'a84715f1-4057-495d-862c-a07b85ab045f', '55555555-0000-0000-0000-000000000002', 'BATCH-AZITH-2026', '2027-08-31', 150, 95.0, 120.0, NOW(), NOW());

-- ==============================================================================
-- 20. INSERT INTO public.appointments
-- ==============================================================================
INSERT INTO public.appointments (id, patient_id, doctor_id, location_id, appointment_date, start_time, end_time, status, notes, created_at, updated_at) VALUES 
('5f4f4a3e-ecea-4eb7-bff0-54f4f444daa4', 'c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', CURRENT_DATE, '10:00:00', '10:30:00', 'CONFIRMED', 'Regular cardiac check-up & BP review', NOW(), NOW()),
('afa79ca8-6d9b-4d49-bd41-afbb2dfd3166', 'c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', CURRENT_DATE + 1, '11:00:00', '11:30:00', 'CONFIRMED', 'Migraine follow-up consultation', NOW(), NOW()),
('56d3d5ba-24da-47fa-ac6e-db03335d5560', 'c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000003', CURRENT_DATE + 2, '14:00:00', '14:30:00', 'PENDING', 'Knee joint discomfort and stiffness', NOW(), NOW()),
('618b3a07-c95d-4ff5-8c6b-077ca26b631f', 'c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', CURRENT_DATE - 5, '09:30:00', '10:00:00', 'COMPLETED', 'Initial ECG and consultation', NOW(), NOW()),
('9abb8f9b-d92e-4dda-9dc5-7a8ae51c5cb1', 'c1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000003', CURRENT_DATE - 3, '15:00:00', '15:30:00', 'COMPLETED', 'Post-fracture rehabilitation check', NOW(), NOW());

-- ==============================================================================
-- 21. INSERT INTO public.consultations
-- ==============================================================================
INSERT INTO public.consultations (id, appointment_id, patient_id, doctor_id, symptoms, diagnosis, treatment_plan, clinical_notes, completed_at, created_at, updated_at) VALUES 
('77777777-0000-0000-0000-000000000001', '618b3a07-c95d-4ff5-8c6b-077ca26b631f', 'c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 'Occasional palpitations and fatigue', 'Mild sinus tachycardia / Stress induced', 'Prescribed low-dose beta blocker and lifestyle modifications', 'Vitals: BP 124/82, HR 88 bpm. Heart sounds normal.', NOW(), NOW(), NOW()),
('77777777-0000-0000-0000-000000000002', '9abb8f9b-d92e-4dda-9dc5-7a8ae51c5cb1', 'c1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000003', 'Reduced range of motion in right wrist', 'Wrist tendonitis recovering well', 'Continue physiotherapy exercises twice daily', 'X-ray clear, no residual bone displacement.', NOW(), NOW(), NOW());

-- ==============================================================================
-- 22. INSERT INTO public.prescriptions
-- ==============================================================================
INSERT INTO public.prescriptions (id, appointment_id, patient_id, doctor_id, diagnosis, notes, is_finalized, is_dispensed, version, created_at, updated_at) VALUES 
('5d5e3031-1d25-4cce-8bad-5872de2bdac2', '5f4f4a3e-ecea-4eb7-bff0-54f4f444daa4', 'c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Hypertension Stage 1 & High Stress', 'Take medications after breakfast', TRUE, FALSE, 1, NOW(), NOW()),
('e564cc08-386c-472b-8558-07cc1a3caa07', 'afa79ca8-6d9b-4d49-bd41-afbb2dfd3166', 'c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'Chronic Tension Headache', 'Ensure adequate hydration and regular sleep', TRUE, FALSE, 1, NOW(), NOW()),
('454f0ee8-4c59-478c-ac2e-85c788f6001a', '618b3a07-c95d-4ff5-8c6b-077ca26b631f', 'c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 'Sinus Tachycardia', 'Avoid excessive caffeine', TRUE, TRUE, 1, NOW(), NOW());

-- ==============================================================================
-- 23. INSERT INTO public.prescription_items
-- ==============================================================================
INSERT INTO public.prescription_items (id, prescription_id, medicine_name, dosage, frequency, duration_days, instructions, created_at, updated_at) VALUES 
('88888888-0000-0000-0000-000000000001', '5d5e3031-1d25-4cce-8bad-5872de2bdac2', 'Amlodipine 5mg', '5mg', 'Once daily in morning', 30, 'Take after food', NOW(), NOW()),
('88888888-0000-0000-0000-000000000002', '5d5e3031-1d25-4cce-8bad-5872de2bdac2', 'Paracetamol 650mg', '650mg', 'As needed for headache', 5, 'Maximum 3 times daily', NOW(), NOW()),
('88888888-0000-0000-0000-000000000003', 'e564cc08-386c-472b-8558-07cc1a3caa07', 'Ibuprofen 400mg', '400mg', 'Twice daily', 7, 'Take with water after meals', NOW(), NOW()),
('88888888-0000-0000-0000-000000000004', 'e564cc08-386c-472b-8558-07cc1a3caa07', 'Omeprazole 20mg', '20mg', 'Once daily before breakfast', 14, 'Take on empty stomach', NOW(), NOW());

-- ==============================================================================
-- 24. INSERT INTO public.medicine_orders
-- ==============================================================================
INSERT INTO public.medicine_orders (id, patient_id, pharmacy_id, prescription_id, status, total_amount, delivery_address, created_at, updated_at) VALUES 
('8343d507-0406-40c6-8757-027e80d10b24', 'c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', '5d5e3031-1d25-4cce-8bad-5872de2bdac2', 'OUT_FOR_DELIVERY', 245.0, 'Flat 402, Green Acres Apt, Indiranagar, Bangalore', NOW(), NOW()),
('5d9263b2-e14c-4e2b-87bb-90381ade9c12', 'c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 'e564cc08-386c-472b-8558-07cc1a3caa07', 'PROCESSING', 180.0, 'No. 24, 5th Cross, Koramangala 4th Block, Bangalore', NOW(), NOW()),
('74e54e0d-1fce-483e-aa27-a65ab9dea3bb', 'c1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000001', '454f0ee8-4c59-478c-ac2e-85c788f6001a', 'DELIVERED', 120.0, 'House 112, Defence Colony, Indiranagar, Bangalore', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day');

-- ==============================================================================
-- 25. INSERT INTO public.medicine_order_items
-- ==============================================================================
INSERT INTO public.medicine_order_items (id, order_id, inventory_id, quantity, price_at_purchase, created_at, updated_at) VALUES 
('99999999-0000-0000-0000-000000000001', '8343d507-0406-40c6-8757-027e80d10b24', '66666666-0000-0000-0000-000000000001', 2, 50.0, NOW(), NOW()),
('99999999-0000-0000-0000-000000000002', '8343d507-0406-40c6-8757-027e80d10b24', '66666666-0000-0000-0000-000000000003', 1, 95.0, NOW(), NOW()),
('99999999-0000-0000-0000-000000000003', '5d9263b2-e14c-4e2b-87bb-90381ade9c12', '66666666-0000-0000-0000-000000000004', 2, 50.0, NOW(), NOW());

-- ==============================================================================
-- 26. INSERT INTO public.delivery_tracking
-- ==============================================================================
INSERT INTO public.delivery_tracking (
  id, order_id, tracking_number, current_status, delivery_partner, 
  driver_name, vehicle_number, delivery_speed, delivery_progress, 
  current_latitude, current_longitude, start_latitude, start_longitude, end_latitude, end_longitude,
  created_at, updated_at
) VALUES 
('aaaaaaaa-0000-0000-0000-000000000001', '8343d507-0406-40c6-8757-027e80d10b24', 'TRK-MED-849201', 'OUT_FOR_DELIVERY', 'MedSync Express', 'Ravi Shankar', 'KA 03 EN 4521', 35, 65, 12.9716, 77.6412, 12.9784, 77.6408, 12.9650, 77.6450, NOW(), NOW()),
('aaaaaaaa-0000-0000-0000-000000000002', '5d9263b2-e14c-4e2b-87bb-90381ade9c12', 'TRK-MED-849202', 'PROCESSING', 'MedSync Express', 'Manjunath K', 'KA 01 MG 8912', 0, 20, 12.9352, 77.6245, 12.9352, 77.6245, 12.9420, 77.6180, NOW(), NOW()),
('aaaaaaaa-0000-0000-0000-000000000003', '74e54e0d-1fce-483e-aa27-a65ab9dea3bb', 'TRK-MED-849203', 'DELIVERED', 'MedSync Express', 'Ravi Shankar', 'KA 03 EN 4521', 0, 100, 12.9650, 77.6450, 12.9784, 77.6408, 12.9650, 77.6450, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day');

-- ==============================================================================
-- 27. INSERT INTO public.payments & INVOICES
-- ==============================================================================
INSERT INTO public.payments (id, user_id, order_id, appointment_id, amount, status, method, transaction_id, created_at, updated_at) VALUES 
('cccccccc-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', '8343d507-0406-40c6-8757-027e80d10b24', NULL, 245.0, 'COMPLETED', 'UPI', 'TXN_MED_849201', NOW(), NOW()),
('cccccccc-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', '5d9263b2-e14c-4e2b-87bb-90381ade9c12', NULL, 180.0, 'COMPLETED', 'CARD', 'TXN_MED_849202', NOW(), NOW());

INSERT INTO public.invoices (id, payment_id, invoice_number, invoice_url, created_at, updated_at) VALUES 
(gen_random_uuid(), 'cccccccc-0000-0000-0000-000000000001', 'INV-2026-001', 'https://storage.medsync.internal/invoices/INV-2026-001.pdf', NOW(), NOW()),
(gen_random_uuid(), 'cccccccc-0000-0000-0000-000000000002', 'INV-2026-002', 'https://storage.medsync.internal/invoices/INV-2026-002.pdf', NOW(), NOW());

-- ==============================================================================
-- 28. INSERT INTO public.medical_record_categories & RECORDS
-- ==============================================================================
INSERT INTO public.medical_record_categories (id, name, description, created_at, updated_at) VALUES 
('eeeeeeee-0000-0000-0000-000000000001', 'Cardiology Reports', 'ECG, Echo, Lipid profiles and cardiac investigations', NOW(), NOW()),
('eeeeeeee-0000-0000-0000-000000000002', 'Laboratory Investigations', 'Blood tests, CBC, Liver Function and metabolic panels', NOW(), NOW()),
('eeeeeeee-0000-0000-0000-000000000003', 'Radiology & Imaging', 'X-rays, MRI, CT scans and ultrasound reports', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.medical_records (id, patient_id, uploaded_by, category_id, title, description, is_archived, created_at, updated_at) VALUES 
('ffffffff-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001', 'Annual 12-Lead ECG Report', 'Baseline resting ECG showing normal sinus rhythm', FALSE, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
('ffffffff-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'eeeeeeee-0000-0000-0000-000000000002', 'Comprehensive Blood Profile', 'Fasting glucose and lipid panel results', FALSE, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days');

INSERT INTO public.medical_record_versions (id, record_id, version_number, ipfs_cid, file_type, file_size_bytes, change_description, is_current, blockchain_status, created_at, updated_at) VALUES 
('ffffffff-1111-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000001', 1, 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG', 'application/pdf', 245760, 'Initial upload from lab', TRUE, 'CONFIRMED', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
('ffffffff-1111-0000-0000-000000000002', 'ffffffff-0000-0000-0000-000000000002', 1, 'QmZtmD2qtWBS7W5vDF2G5GLN38U5zO35pndJ365ndL7xXy', 'application/pdf', 184320, 'Initial upload from clinic', TRUE, 'CONFIRMED', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days');

INSERT INTO public.file_metadata (id, version_id, supabase_storage_path, mime_type, encrypted_filename, uploaded_by, created_at, updated_at) VALUES 
(gen_random_uuid(), 'ffffffff-1111-0000-0000-000000000001', 'records/c1000000-0000-0000-0000-000000000001/ecg_2026.enc', 'application/pdf', 'ecg_report_2026.pdf', 'c1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
(gen_random_uuid(), 'ffffffff-1111-0000-0000-000000000002', 'records/c1000000-0000-0000-0000-000000000002/blood_panel_2026.enc', 'application/pdf', 'blood_panel_2026.pdf', 'c1000000-0000-0000-0000-000000000002', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days');

-- ==============================================================================
-- 29. INSERT INTO public.notifications & PREFERENCES
-- ==============================================================================
INSERT INTO public.notifications (id, user_id, title, message, type, is_read, created_at, updated_at) VALUES 
('bbbbbbbb-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Appointment Confirmed', 'Your consultation with Dr. Ramesh Rao is confirmed for today at 10:00 AM.', 'APPOINTMENT', FALSE, NOW(), NOW()),
('bbbbbbbb-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'Medicine Order Dispatched', 'Order #TRK-MED-849201 is out for delivery with driver Ravi Shankar.', 'DELIVERY', FALSE, NOW(), NOW()),
('bbbbbbbb-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'New Appointment Booked', 'Patient Rajesh Gowda has confirmed an appointment for today at 10:00 AM.', 'APPOINTMENT', FALSE, NOW(), NOW()),
('bbbbbbbb-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000001', 'New Prescription Order', 'New order received from patient Rajesh Gowda.', 'ORDER', FALSE, NOW(), NOW());

INSERT INTO public.notification_preferences (id, user_id, email_enabled, push_enabled, in_app_enabled, created_at, updated_at) VALUES 
(gen_random_uuid(), 'a1000000-0000-0000-0000-000000000000', TRUE, TRUE, TRUE, NOW(), NOW()),
(gen_random_uuid(), 'b1000000-0000-0000-0000-000000000001', TRUE, TRUE, TRUE, NOW(), NOW()),
(gen_random_uuid(), 'b1000000-0000-0000-0000-000000000002', TRUE, TRUE, TRUE, NOW(), NOW()),
(gen_random_uuid(), 'b1000000-0000-0000-0000-000000000003', TRUE, TRUE, TRUE, NOW(), NOW()),
(gen_random_uuid(), 'c1000000-0000-0000-0000-000000000001', TRUE, TRUE, TRUE, NOW(), NOW()),
(gen_random_uuid(), 'c1000000-0000-0000-0000-000000000002', TRUE, TRUE, TRUE, NOW(), NOW()),
(gen_random_uuid(), 'c1000000-0000-0000-0000-000000000003', TRUE, TRUE, TRUE, NOW(), NOW()),
(gen_random_uuid(), 'c1000000-0000-0000-0000-000000000004', TRUE, TRUE, TRUE, NOW(), NOW()),
(gen_random_uuid(), 'c1000000-0000-0000-0000-000000000005', TRUE, TRUE, TRUE, NOW(), NOW()),
(gen_random_uuid(), 'd1000000-0000-0000-0000-000000000001', TRUE, TRUE, TRUE, NOW(), NOW()),
(gen_random_uuid(), 'd1000000-0000-0000-0000-000000000002', TRUE, TRUE, TRUE, NOW(), NOW());

COMMIT;
