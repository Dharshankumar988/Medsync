import uuid
import random
import os

LOCALITIES = [
    {"name": "Koramangala", "lat": 12.9352, "lng": 77.6245, "pin": "560034"},
    {"name": "Indiranagar", "lat": 12.9784, "lng": 77.6408, "pin": "560038"},
    {"name": "HSR Layout", "lat": 12.9121, "lng": 77.6446, "pin": "560102"},
    {"name": "Whitefield", "lat": 12.9698, "lng": 77.7499, "pin": "560066"},
    {"name": "Electronic City", "lat": 12.8399, "lng": 77.6770, "pin": "560100"},
    {"name": "Jayanagar", "lat": 12.9299, "lng": 77.5824, "pin": "560041"},
    {"name": "JP Nagar", "lat": 12.9063, "lng": 77.5857, "pin": "560078"},
    {"name": "Malleshwaram", "lat": 13.0031, "lng": 77.5643, "pin": "560003"},
    {"name": "Rajajinagar", "lat": 12.9982, "lng": 77.5530, "pin": "560010"},
    {"name": "Hebbal", "lat": 13.0354, "lng": 77.5988, "pin": "560024"},
    {"name": "Yelahanka", "lat": 13.1007, "lng": 77.5963, "pin": "560064"},
    {"name": "Marathahalli", "lat": 12.9569, "lng": 77.7011, "pin": "560037"},
    {"name": "Bellandur", "lat": 12.9304, "lng": 77.6784, "pin": "560103"},
    {"name": "Banashankari", "lat": 12.9255, "lng": 77.5468, "pin": "560050"},
    {"name": "Basavanagudi", "lat": 12.9406, "lng": 77.5738, "pin": "560004"},
    {"name": "MG Road", "lat": 12.9738, "lng": 77.6119, "pin": "560001"},
    {"name": "Shivajinagar", "lat": 12.9857, "lng": 77.6057, "pin": "560051"}
]

def add_jitter(coord):
    return coord + random.uniform(-0.015, 0.015)

# Generate stable UUIDs to maintain idempotency
def gen_uuid(prefix, index):
    return f"{prefix}000000-0000-0000-0000-{index:012d}"

sql_lines = []

header = """-- ============================================================
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

"""
sql_lines.append(header)

auth_users = []
auth_identities = []
public_users = []

# Admin
admin_id = gen_uuid("1a", 1)
auth_users.append(f"('00000000-0000-0000-0000-000000000000', '{admin_id}', 'authenticated', 'authenticated', 'admin@medsync.com', crypt('admin', gen_salt('bf', 10)), NOW(), '{{\"provider\": \"email\", \"providers\": [\"email\"]}}'::jsonb, '{{\"role\": \"ADMIN\", \"full_name\": \"Super Admin\"}}'::jsonb, NOW(), NOW(), '', '', '', '')")
auth_identities.append(f"(gen_random_uuid(), '{admin_id}', '{admin_id}', '{{\"sub\":\"{admin_id}\",\"email\":\"admin@medsync.com\"}}'::jsonb, 'email', NOW(), NOW(), NOW())")
public_users.append(f"('{admin_id}', 'admin@medsync.com', 'supabase_managed', 'ADMIN', 'ACTIVE', TRUE, 100, NOW(), NOW())")
admin_sql = f"INSERT INTO public.admins (id, user_id, full_name, department, created_at, updated_at) VALUES ('{gen_uuid('3a', 1)}', '{admin_id}', 'Super Admin', 'IT', NOW(), NOW());\n"

# Doctors (15)
doctors_data = []
doctor_specializations = ['General Medicine', 'Cardiology', 'Pediatrics', 'Orthopedics', 'Dermatology', 'Neurology', 'Gynecology', 'Ophthalmology', 'Psychiatry', 'ENT']
for i in range(1, 16):
    d_id = gen_uuid("1b", i)
    auth_users.append(f"('00000000-0000-0000-0000-000000000000', '{d_id}', 'authenticated', 'authenticated', 'doctor{i}@medsync.com', crypt('doctor', gen_salt('bf', 10)), NOW(), '{{\"provider\": \"email\", \"providers\": [\"email\"]}}'::jsonb, '{{\"role\": \"DOCTOR\", \"full_name\": \"Dr. Demo {i}\"}}'::jsonb, NOW(), NOW(), '', '', '', '')")
    auth_identities.append(f"(gen_random_uuid(), '{d_id}', '{d_id}', '{{\"sub\":\"{d_id}\",\"email\":\"doctor{i}@medsync.com\"}}'::jsonb, 'email', NOW(), NOW(), NOW())")
    public_users.append(f"('{d_id}', 'doctor{i}@medsync.com', 'supabase_managed', 'DOCTOR', 'ACTIVE', TRUE, 100, NOW(), NOW())")
    doctors_data.append({
        "user_id": d_id,
        "name": f"Dr. Demo {i}",
        "spec": random.choice(doctor_specializations),
        "exp": random.randint(3, 20),
        "fee": random.choice([500, 750, 1000, 1200]),
        "doc_id": gen_uuid("3b", i)
    })

# Patients (20)
patients_data = []
for i in range(1, 21):
    p_id = gen_uuid("1c", i)
    auth_users.append(f"('00000000-0000-0000-0000-000000000000', '{p_id}', 'authenticated', 'authenticated', 'patient{i}@medsync.com', crypt('patient', gen_salt('bf', 10)), NOW(), '{{\"provider\": \"email\", \"providers\": [\"email\"]}}'::jsonb, '{{\"role\": \"PATIENT\", \"full_name\": \"Patient Demo {i}\"}}'::jsonb, NOW(), NOW(), '', '', '', '')")
    auth_identities.append(f"(gen_random_uuid(), '{p_id}', '{p_id}', '{{\"sub\":\"{p_id}\",\"email\":\"patient{i}@medsync.com\"}}'::jsonb, 'email', NOW(), NOW(), NOW())")
    public_users.append(f"('{p_id}', 'patient{i}@medsync.com', 'supabase_managed', 'PATIENT', 'ACTIVE', TRUE, 100, NOW(), NOW())")
    patients_data.append({
        "user_id": p_id,
        "name": f"Patient Demo {i}",
        "pat_id": gen_uuid("3c", i)
    })

# Pharmacies (30)
pharmacies_data = []
for i in range(1, 31):
    ph_id = gen_uuid("1d", i)
    auth_users.append(f"('00000000-0000-0000-0000-000000000000', '{ph_id}', 'authenticated', 'authenticated', 'pharmacy{i}@medsync.com', crypt('pharma', gen_salt('bf', 10)), NOW(), '{{\"provider\": \"email\", \"providers\": [\"email\"]}}'::jsonb, '{{\"role\": \"PHARMACY\", \"full_name\": \"Pharmacy Demo {i}\"}}'::jsonb, NOW(), NOW(), '', '', '', '')")
    auth_identities.append(f"(gen_random_uuid(), '{ph_id}', '{ph_id}', '{{\"sub\":\"{ph_id}\",\"email\":\"pharmacy{i}@medsync.com\"}}'::jsonb, 'email', NOW(), NOW(), NOW())")
    public_users.append(f"('{ph_id}', 'pharmacy{i}@medsync.com', 'supabase_managed', 'PHARMACY', 'ACTIVE', TRUE, 100, NOW(), NOW())")
    loc = LOCALITIES[i % len(LOCALITIES)]
    pharmacies_data.append({
        "user_id": ph_id,
        "name": f"Pharmacy Demo {i} ({loc['name']})",
        "address": f"Near {loc['name']}, Bengaluru",
        "loc": loc,
        "lat": add_jitter(loc['lat']),
        "lng": add_jitter(loc['lng']),
        "phar_id": gen_uuid("3d", i)
    })

# Write auth inserts
sql_lines.append("INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change) VALUES\n" + ",\n".join(auth_users) + ";\n\n")
sql_lines.append("INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at) VALUES\n" + ",\n".join(auth_identities) + ";\n\n")
sql_lines.append("INSERT INTO public.users (id, email, password_hash, role, status, is_verified, profile_completion_percentage, created_at, updated_at) VALUES\n" + ",\n".join(public_users) + ";\n\n")
sql_lines.append(admin_sql)

# Hospitals (25)
hospital_names = [
    "Manipal Hospital", "Narayana Health City", "Apollo Hospitals", "Fortis Hospital", 
    "Aster CMI Hospital", "Sakra World Hospital", "Columbia Asia Hospital", 
    "BGS Gleneagles Global Hospitals", "St. Johns Medical College Hospital", 
    "Sparsh Hospital", "Victoria Hospital", "Bowring and Lady Curzon Hospital",
    "Mallya Hospital", "Rainbow Childrens Hospital", "Cloudnine Hospital",
    "Sagar Hospitals", "KIMS Hospital", "M. S. Ramaiah Memorial Hospital",
    "HCG Cancer Hospital", "Vydehi Hospital", "RxDx Healthcare", "Motherhood Hospital",
    "People Tree Hospitals", "Koshys Hospital", "Kauvery Hospital"
]
hospitals_data = []
hospitals_sql = []
for i in range(1, 26):
    h_id = gen_uuid("2a", i)
    loc = LOCALITIES[i % len(LOCALITIES)]
    name = f"{hospital_names[i-1]} - {loc['name']}"
    lat = add_jitter(loc['lat'])
    lng = add_jitter(loc['lng'])
    hospitals_data.append({
        "id": h_id,
        "name": name,
        "address": f"{loc['name']}, Bengaluru",
        "loc": loc,
        "lat": lat,
        "lng": lng
    })
    hospitals_sql.append(f"('{h_id}', '{name}', '{loc['name']}, Bengaluru', 'Bengaluru', 'Karnataka', 'India', '{loc['pin']}', {lat:.6f}, {lng:.6f}, TRUE, TRUE, NOW(), NOW())")

sql_lines.append("INSERT INTO public.hospitals (id, name, address, city, state, country, pincode, latitude, longitude, is_verified, is_active, created_at, updated_at) VALUES\n" + ",\n".join(hospitals_sql) + ";\n\n")

# Assign Doctors to Hospitals
doctors_sql = []
doctor_locs_sql = []
for i, d in enumerate(doctors_data):
    # Map doctor to 1 or 2 hospitals
    hosp = hospitals_data[i % len(hospitals_data)]
    doctors_sql.append(f"('{d['doc_id']}', '{d['user_id']}', '{d['name']}', '{d['spec']}', 'LIC-DOC-{i+1}', '{hosp['name']}', '{hosp['address']}', {d['exp']}, {d['fee']}, '{hosp['id']}', 'APPROVED', NOW(), NOW())")
    
    doctor_locs_sql.append(f"('{gen_uuid('4a', i+1)}', '{d['doc_id']}', 'HOSPITAL', '{hosp['name']}', '{hosp['id']}', '{hosp['address']}', 'Bengaluru', 'Karnataka', 'India', '{hosp['loc']['pin']}', {hosp['lat']:.6f}, {hosp['lng']:.6f}, TRUE, TRUE, 'APPROVED', NOW(), NOW())")

sql_lines.append("INSERT INTO public.doctors (id, user_id, full_name, specialization, license_number, hospital_name, hospital_address, experience_years, consultation_fee, hospital_id, doctor_status, created_at, updated_at) VALUES\n" + ",\n".join(doctors_sql) + ";\n\n")
sql_lines.append("INSERT INTO public.doctor_locations (id, doctor_id, location_type, location_name, hospital_id, address, city, state, country, pincode, latitude, longitude, is_primary, is_active, verification_status, created_at, updated_at) VALUES\n" + ",\n".join(doctor_locs_sql) + ";\n\n")

# Patients SQL
patients_sql = []
for i, p in enumerate(patients_data):
    loc = LOCALITIES[i % len(LOCALITIES)]
    patients_sql.append(f"('{p['pat_id']}', '{p['user_id']}', '{p['name']}', '1990-01-01', 'Male', 'O+', 'Bengaluru', 'Karnataka', '{loc['pin']}', '$2b$12$TestPinHashForPatient1DemoUser12345678901234567', NOW(), NOW())")

sql_lines.append("INSERT INTO public.patients (id, user_id, full_name, date_of_birth, gender, blood_group, city, state, pincode, pin_hash, created_at, updated_at) VALUES\n" + ",\n".join(patients_sql) + ";\n\n")

# Pharmacies SQL
pharma_sql = []
pharma_locs_sql = []
for i, ph in enumerate(pharmacies_data):
    pharma_sql.append(f"('{ph['phar_id']}', '{ph['user_id']}', '{ph['name']}', 'LIC-PHM-{i+1}', '{ph['address']}', 'Bengaluru', 'Karnataka', '1234567890', 'QR-PHM-{i+1}-ABC', NOW(), NOW())")
    pharma_locs_sql.append(f"('{gen_uuid('4b', i+1)}', '{ph['phar_id']}', '{ph['name']}', '{ph['address']}', 'Bengaluru', 'Karnataka', 'India', '{ph['loc']['pin']}', {ph['lat']:.6f}, {ph['lng']:.6f}, TRUE, TRUE, 'APPROVED', NOW(), NOW())")

sql_lines.append("INSERT INTO public.pharmacies (id, user_id, business_name, license_number, address, city, state, contact_number, qr_identifier, created_at, updated_at) VALUES\n" + ",\n".join(pharma_sql) + ";\n\n")
sql_lines.append("INSERT INTO public.pharmacy_locations (id, pharmacy_id, location_name, address, city, state, country, pincode, latitude, longitude, is_primary, is_active, verification_status, created_at, updated_at) VALUES\n" + ",\n".join(pharma_locs_sql) + ";\n\n")

footer = """
SET session_replication_role = 'origin';
COMMIT;
"""
sql_lines.append(footer)

with open(r'c:\IMP PROJECTS\Medsync\database\dummy_values.sql', 'w', encoding='utf-8') as f:
    f.writelines(sql_lines)

print("Generated database/dummy_values.sql successfully!")
