import uuid

def gen_uuid(prefix, idx):
    return f'{prefix}00000-0000-0000-0000-{str(idx).zfill(12)}'

hospitals = [
    ('Manipal Hospital', 'Old Airport Road, Bengaluru', 12.9592, 77.6485),
    ('Narayana Health City', 'Bommasandra, Bengaluru', 12.8122, 77.6833),
    ('Apollo Hospitals', 'Bannerghatta Road, Bengaluru', 12.8953, 77.5991),
    ('Fortis Hospital', 'Bannerghatta Road, Bengaluru', 12.8943, 77.5997),
    ('Aster CMI Hospital', 'Hebbal, Bengaluru', 13.0450, 77.5878),
    ('Sakra World Hospital', 'Bellandur, Bengaluru', 12.9304, 77.6784),
    ('Columbia Asia Hospital', 'Yeshwanthpur, Bengaluru', 13.0118, 77.5552),
    ('BGS Gleneagles Global Hospitals', 'Kengeri, Bengaluru', 12.9056, 77.4939),
    ('St. Johns Medical College Hospital', 'Koramangala, Bengaluru', 12.9301, 77.6186),
    ('Sparsh Hospital', 'Vasanth Nagar, Bengaluru', 12.9922, 77.5936),
    ('Victoria Hospital', 'KR Market, Bengaluru', 12.9647, 77.5746),
    ('Bowring and Lady Curzon Hospital', 'Shivajinagar, Bengaluru', 12.9808, 77.6044),
    ('Mallya Hospital', 'Ashok Nagar, Bengaluru', 12.9691, 77.5947),
    ('Rainbow Childrens Hospital', 'Marathahalli, Bengaluru', 12.9482, 77.7011),
    ('Cloudnine Hospital', 'Jayanagar, Bengaluru', 12.9242, 77.5855),
    ('Sagar Hospitals', 'Tilak Nagar, Bengaluru', 12.9262, 77.5912),
    ('KIMS Hospital', 'VV Puram, Bengaluru', 12.9554, 77.5735),
    ('M. S. Ramaiah Memorial Hospital', 'MSR Nagar, Bengaluru', 13.0312, 77.5645),
    ('HCG Cancer Hospital', 'Kalinga Rao Road, Bengaluru', 12.9642, 77.5858),
    ('Vydehi Hospital', 'Whitefield, Bengaluru', 12.9772, 77.7288)
]

sql = ["""-- MedSync Comprehensive Demo Database Seed
-- Generated Script
BEGIN;

-- TRUNCATE existing tables aggressively
TRUNCATE TABLE qr_authorization_tokens, download_audit_logs, audit_logs, api_request_logs, consultations, medical_history_shares, consent_history, invoices, payments, delivery_tracking, medicine_order_items, medicine_orders, prescription_items, prescriptions, appointment_status_history, appointments, medicine_inventory, medicines, suppliers, medicine_categories, doctor_locations, pharmacy_locations, doctor_availability, verification_requests, ai_chat_messages, ai_chat_sessions, doctor_notes, ai_analyses, ocr_results, file_metadata, medical_record_versions, medical_record_tag_mappings, medical_records, medical_record_tags, medical_record_categories, notifications, notification_preferences, patients, doctors, pharmacies, admins, users, hospitals, knowledge_chunks, knowledge_documents, admin_ai_audit_logs CASCADE;

-- Clear Supabase Auth
DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@medsync.com');
DELETE FROM auth.users WHERE email LIKE '%@medsync.com';

-- Disable Triggers temporarily
SET session_replication_role = 'replica';
"""]

# Generate Auth Users
sql.append("INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change) VALUES ")
auth_entries = []

# Admin
auth_entries.append(f"('00000000-0000-0000-0000-000000000000', '{gen_uuid('1a', 1)}', 'authenticated', 'authenticated', 'admin@medsync.com', crypt('admin', gen_salt('bf', 10)), NOW(), '{{\"provider\": \"email\", \"providers\": [\"email\"]}}'::jsonb, '{{\"role\": \"ADMIN\", \"full_name\": \"Super Admin\"}}'::jsonb, NOW(), NOW(), '', '', '', '')")

# Doctors
for i in range(1, 11):
    auth_entries.append(f"('00000000-0000-0000-0000-000000000000', '{gen_uuid('1b', i)}', 'authenticated', 'authenticated', 'doctor{i}@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{{\"provider\": \"email\", \"providers\": [\"email\"]}}'::jsonb, '{{\"role\": \"DOCTOR\", \"full_name\": \"Dr. Demo {i}\"}}'::jsonb, NOW(), NOW(), '', '', '', '')")

# Patients
for i in range(1, 13):
    auth_entries.append(f"('00000000-0000-0000-0000-000000000000', '{gen_uuid('1c', i)}', 'authenticated', 'authenticated', 'patient{i}@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{{\"provider\": \"email\", \"providers\": [\"email\"]}}'::jsonb, '{{\"role\": \"PATIENT\", \"full_name\": \"Patient Demo {i}\"}}'::jsonb, NOW(), NOW(), '', '', '', '')")

# Pharmacies
for i in range(1, 7):
    auth_entries.append(f"('00000000-0000-0000-0000-000000000000', '{gen_uuid('1d', i)}', 'authenticated', 'authenticated', 'pharmacy{i}@medsync.com', crypt('phara', gen_salt('bf', 10)), NOW(), '{{\"provider\": \"email\", \"providers\": [\"email\"]}}'::jsonb, '{{\"role\": \"PHARMACY\", \"full_name\": \"Pharmacy Demo {i}\"}}'::jsonb, NOW(), NOW(), '', '', '', '')")

sql.append(',\n'.join(auth_entries) + ';')

# Generate Auth Identities
sql.append("INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at) VALUES ")
id_entries = []
id_entries.append(f"(gen_random_uuid(), '{gen_uuid('1a', 1)}', '{gen_uuid('1a', 1)}', '{{\"sub\":\"{gen_uuid('1a', 1)}\",\"email\":\"admin@medsync.com\"}}'::jsonb, 'email', NOW(), NOW(), NOW())")
for i in range(1, 11):
    id_entries.append(f"(gen_random_uuid(), '{gen_uuid('1b', i)}', '{gen_uuid('1b', i)}', '{{\"sub\":\"{gen_uuid('1b', i)}\",\"email\":\"doctor{i}@medsync.com\"}}'::jsonb, 'email', NOW(), NOW(), NOW())")
for i in range(1, 13):
    id_entries.append(f"(gen_random_uuid(), '{gen_uuid('1c', i)}', '{gen_uuid('1c', i)}', '{{\"sub\":\"{gen_uuid('1c', i)}\",\"email\":\"patient{i}@medsync.com\"}}'::jsonb, 'email', NOW(), NOW(), NOW())")
for i in range(1, 7):
    id_entries.append(f"(gen_random_uuid(), '{gen_uuid('1d', i)}', '{gen_uuid('1d', i)}', '{{\"sub\":\"{gen_uuid('1d', i)}\",\"email\":\"pharmacy{i}@medsync.com\"}}'::jsonb, 'email', NOW(), NOW(), NOW())")

sql.append(',\n'.join(id_entries) + ';')

# Generate Public Users
sql.append("INSERT INTO public.users (id, email, password_hash, role, status, is_verified, profile_completion_percentage, created_at, updated_at) VALUES ")
user_entries = []
user_entries.append(f"('{gen_uuid('1a', 1)}', 'admin@medsync.com', 'supabase_managed', 'ADMIN', 'ACTIVE', TRUE, 100, NOW(), NOW())")
for i in range(1, 11):
    user_entries.append(f"('{gen_uuid('1b', i)}', 'doctor{i}@medsync.com', 'supabase_managed', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW())")
for i in range(1, 13):
    user_entries.append(f"('{gen_uuid('1c', i)}', 'patient{i}@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW())")
for i in range(1, 7):
    user_entries.append(f"('{gen_uuid('1d', i)}', 'pharmacy{i}@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW())")

sql.append(',\n'.join(user_entries) + ';')

# Hospitals
sql.append("INSERT INTO public.hospitals (id, name, address, city, state, country, pincode, latitude, longitude, is_verified, is_active, created_at, updated_at) VALUES ")
hospital_entries = []
for i, h in enumerate(hospitals):
    hospital_entries.append(f"('{gen_uuid('2a', i+1)}', '{h[0]}', '{h[1]}', 'Bengaluru', 'Karnataka', 'India', '560001', {h[2]}, {h[3]}, TRUE, TRUE, NOW(), NOW())")
sql.append(',\n'.join(hospital_entries) + ';')

# Profiles
sql.append(f"INSERT INTO public.admins (id, user_id, full_name, department, created_at, updated_at) VALUES ('{gen_uuid('3a', 1)}', '{gen_uuid('1a', 1)}', 'Super Admin', 'IT', NOW(), NOW());")

doc_entries = []
for i in range(1, 11):
    doc_entries.append(f"('{gen_uuid('3b', i)}', '{gen_uuid('1b', i)}', 'Dr. Demo {i}', 'General Medicine', 'LIC-DOC-{i}', '{hospitals[i-1][0]}', '{hospitals[i-1][1]}', {5+i}, 500, '{gen_uuid('2a', i)}', 'APPROVED', NOW(), NOW())")
sql.append("INSERT INTO public.doctors (id, user_id, full_name, specialization, license_number, hospital_name, hospital_address, experience_years, consultation_fee, hospital_id, doctor_status, created_at, updated_at) VALUES " + ',\n'.join(doc_entries) + ';')

pat_entries = []
for i in range(1, 13):
    pat_entries.append(f"('{gen_uuid('3c', i)}', '{gen_uuid('1c', i)}', 'Patient Demo {i}', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', NOW(), NOW())")
sql.append("INSERT INTO public.patients (id, user_id, full_name, date_of_birth, gender, blood_group, city, state, created_at, updated_at) VALUES " + ',\n'.join(pat_entries) + ';')

pha_entries = []
for i in range(1, 7):
    pha_entries.append(f"('{gen_uuid('3d', i)}', '{gen_uuid('1d', i)}', 'Pharmacy Demo {i}', 'LIC-PHM-{i}', '{hospitals[i-1][1]}', 'Bengaluru', 'Karnataka', '1234567890', NOW(), NOW())")
sql.append("INSERT INTO public.pharmacies (id, user_id, business_name, license_number, address, city, state, contact_number, created_at, updated_at) VALUES " + ',\n'.join(pha_entries) + ';')

# Doctor Locations
dl_entries = []
for i in range(1, 11):
    dl_entries.append(f"('{gen_uuid('4a', i)}', '{gen_uuid('3b', i)}', 'HOSPITAL', '{hospitals[i-1][0]}', '{gen_uuid('2a', i)}', '{hospitals[i-1][1]}', 'Bengaluru', 'Karnataka', 'India', '560001', TRUE, TRUE, 'APPROVED', NOW(), NOW())")
sql.append("INSERT INTO public.doctor_locations (id, doctor_id, location_type, location_name, hospital_id, address, city, state, country, pincode, is_primary, is_active, verification_status, created_at, updated_at) VALUES " + ',\n'.join(dl_entries) + ';')

# Medicines
sql.append(f"INSERT INTO public.medicine_categories (id, name, description) VALUES ('{gen_uuid('5a', 1)}', 'Antibiotics', 'Antibiotics description'), ('{gen_uuid('5a', 2)}', 'Painkillers', 'Painkillers description');")

meds = [('Amoxicillin', '5a00000-0000-0000-0000-000000000001', 150), ('Paracetamol', '5a00000-0000-0000-0000-000000000002', 50), ('Ibuprofen', '5a00000-0000-0000-0000-000000000002', 100)]
med_entries = []
for i, m in enumerate(meds):
    med_entries.append(f"('{gen_uuid('5b', i+1)}', '{m[0]}', '{m[1]}', {m[2]}, NOW(), NOW())")
sql.append("INSERT INTO public.medicines (id, name, category_id, price, created_at, updated_at) VALUES " + ',\n'.join(med_entries) + ';')

# Medicine Inventory (Pharmacy 1 has all)
inv_entries = []
for i, m in enumerate(meds):
    inv_entries.append(f"('{gen_uuid('5c', i+1)}', '{gen_uuid('1d', 1)}', '{gen_uuid('5b', i+1)}', 'BATCH-{i}', CURRENT_DATE + 365, 500, {m[2]}, NOW(), NOW())")
sql.append("INSERT INTO public.medicine_inventory (id, pharmacy_id, medicine_id, batch_number, expiry_date, stock_quantity, unit_price, created_at, updated_at) VALUES " + ',\n'.join(inv_entries) + ';')

# Medical Records & AI Analyses (Mock diagnostic tests)
sql.append(f"""
-- Diagnostic Records Seed
INSERT INTO public.medical_records (id, patient_id, uploaded_by, title, description, created_at, updated_at) 
VALUES 
('{gen_uuid('6a', 1)}', '{gen_uuid('1c', 1)}', '{gen_uuid('1c', 1)}', 'Chest X-Ray', 'Routine checkup scan', NOW(), NOW()),
('{gen_uuid('6a', 2)}', '{gen_uuid('1c', 2)}', '{gen_uuid('1c', 2)}', 'Brain MRI', 'Post-concussion scan', NOW(), NOW());

INSERT INTO public.medical_record_versions (id, record_id, version_number, ipfs_cid, file_type, file_size_bytes, change_description, is_current, created_at, updated_at)
VALUES 
('{gen_uuid('6b', 1)}', '{gen_uuid('6a', 1)}', 1, 'dummy_xray.jpg', 'X_RAY', 102400, 'Initial', TRUE, NOW(), NOW()),
('{gen_uuid('6b', 2)}', '{gen_uuid('6a', 2)}', 1, 'dummy_mri.jpg', 'MRI', 204800, 'Initial', TRUE, NOW(), NOW());

INSERT INTO public.record_permissions (id, record_id, granted_to, granted_by, access_level, created_at, updated_at)
VALUES 
('{gen_uuid('6c', 1)}', '{gen_uuid('6a', 1)}', '{gen_uuid('1b', 1)}', '{gen_uuid('1c', 1)}', 'READ', NOW(), NOW()),
('{gen_uuid('6c', 2)}', '{gen_uuid('6a', 2)}', '{gen_uuid('1b', 2)}', '{gen_uuid('1c', 2)}', 'READ', NOW(), NOW());

INSERT INTO public.ai_analyses (id, version_id, model_name, analysis_status, summary, confidence_score, processing_time_ms, created_at, updated_at)
VALUES 
('{gen_uuid('6d', 1)}', '{gen_uuid('6b', 1)}', 'MedSync-Vision-v2', 'COMPLETED', 'No abnormal pulmonary opacities detected.', 0.94, 345, NOW(), NOW()),
('{gen_uuid('6d', 2)}', '{gen_uuid('6b', 2)}', 'NeuroScan-AI-v1', 'COMPLETED', 'Minor contusion detected in right frontal lobe.', 0.82, 1200, NOW(), NOW());
""")

# Knowledge Documents (RAG test)
sql.append(f"""
INSERT INTO public.knowledge_documents (id, title, description, file_name, storage_path, mime_type, created_by, status, owner_type, owner_id, visibility, allowed_roles, created_at, updated_at)
VALUES
('{gen_uuid('7a', 1)}', 'Internal Operations Manual', 'System administration guide', 'ops_manual.pdf', 'system/ops_manual.pdf', 'application/pdf', '{gen_uuid('1a', 1)}', 'READY', 'system', '{gen_uuid('1a', 1)}', 'internal', '["ADMIN"]', NOW(), NOW()),
('{gen_uuid('7a', 2)}', 'Patient 1 Clinical History', 'Past medical records summary', 'history.txt', 'patient/history.txt', 'text/plain', '{gen_uuid('1b', 1)}', 'READY', 'patient', '{gen_uuid('1c', 1)}', 'internal', '["PATIENT", "DOCTOR"]', NOW(), NOW());

INSERT INTO public.knowledge_chunks (id, document_id, chunk_index, content, token_count, created_at, updated_at)
VALUES
('{gen_uuid('7b', 1)}', '{gen_uuid('7a', 1)}', 0, 'The MedSync backend connects to a highly secure internal infrastructure. Never expose the GROQ_API_KEY.', 50, NOW(), NOW()),
('{gen_uuid('7b', 2)}', '{gen_uuid('7a', 2)}', 0, 'Patient 1 has a history of mild asthma and is allergic to penicillin.', 20, NOW(), NOW());
""")

# Re-enable triggers
sql.append("SET session_replication_role = 'origin';\nCOMMIT;")

with open('dummy_values.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql))

print('Successfully generated complete dummy_values.sql')
