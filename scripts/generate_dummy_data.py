import uuid
import random
import datetime

def generate_sql():
    sql = "BEGIN;\n\n"

    # Minimal target: 1 Admin, 3 Doctors, 5 Patients, 2 Pharmacies, 4 Hospitals
    
    # 1. Hospitals (Bangalore)
    hospitals = [
        ('11111111-0000-0000-0000-000000000001', 'Manipal Hospital HAL Airport Road', '98, HAL Old Airport Rd, Kodihalli', 'Bangalore', 'Karnataka', 'India', '560017', '+91 80 2502 4444', '12.95920000', '77.65680000'),
        ('11111111-0000-0000-0000-000000000002', 'Apollo Hospitals Bannerghatta Road', '154/11, Opp IIM-B, Bannerghatta Road', 'Bangalore', 'Karnataka', 'India', '560076', '+91 80 2630 4050', '12.89400000', '77.59860000'),
        ('11111111-0000-0000-0000-000000000003', 'Fortis Hospital Cunningham Road', '14, Cunningham Rd, Vasanth Nagar', 'Bangalore', 'Karnataka', 'India', '560052', '+91 80 4199 4444', '12.98820000', '77.59370000'),
        ('11111111-0000-0000-0000-000000000004', 'Aster CMI Hospital Hebbal', 'No. 43/2, New Airport Road, NH 44', 'Bangalore', 'Karnataka', 'India', '560092', '+91 80 4342 0100', '13.05600000', '77.59000000')
    ]

    sql += "TRUNCATE TABLE \n"
    sql += "  medicine_order_items, delivery_tracking, medicine_orders, prescription_items, prescriptions, \n"
    sql += "  appointments, medicine_inventory, medicines, suppliers, medicine_categories, \n"
    sql += "  doctor_availability, patients, doctors, pharmacies, admins, users, hospitals CASCADE;\n\n"

    sql += "-- Hospitals\n"
    sql += "INSERT INTO hospitals (id, name, address, city, state, country, pincode, phone_number, latitude, longitude, is_verified, is_active, created_at, updated_at) VALUES \n"
    h_inserts = []
    for h in hospitals:
        h_inserts.append(f"('{h[0]}', '{h[1]}', '{h[2]}', '{h[3]}', '{h[4]}', '{h[5]}', '{h[6]}', '{h[7]}', {h[8]}, {h[9]}, TRUE, TRUE, NOW(), NOW())")
    sql += ",\n".join(h_inserts) + ";\n\n"

    # 2. Users
    pw_hash = "$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiNb/ALeZ1g0aFukw3w/pQ8eQ984jW" # password123
    
    admin_id = "a1000000-0000-0000-0000-000000000000"
    doc_ids = ["b1000000-0000-0000-0000-000000000001", "b1000000-0000-0000-0000-000000000002", "b1000000-0000-0000-0000-000000000003"]
    pat_ids = ["c1000000-0000-0000-0000-000000000001", "c1000000-0000-0000-0000-000000000002", "c1000000-0000-0000-0000-000000000003", "c1000000-0000-0000-0000-000000000004", "c1000000-0000-0000-0000-000000000005"]
    pharm_ids = ["d1000000-0000-0000-0000-000000000001", "d1000000-0000-0000-0000-000000000002"]

    sql += "-- Users\n"
    sql += "INSERT INTO users (id, email, password_hash, role, status, created_at, updated_at) VALUES \n"
    users = []
    users.append(f"('{admin_id}', 'admin@medsync.blr.in', '{pw_hash}', 'ADMIN', 'ACTIVE', NOW(), NOW())")
    for i, d_id in enumerate(doc_ids):
        users.append(f"('{d_id}', 'doctor{i+1}@medsync.blr.in', '{pw_hash}', 'DOCTOR', 'ACTIVE', NOW(), NOW())")
    for i, p_id in enumerate(pat_ids):
        users.append(f"('{p_id}', 'patient{i+1}@example.com', '{pw_hash}', 'PATIENT', 'ACTIVE', NOW(), NOW())")
    for i, ph_id in enumerate(pharm_ids):
        users.append(f"('{ph_id}', 'pharmacy{i+1}@medsync.blr.in', '{pw_hash}', 'PHARMACY', 'ACTIVE', NOW(), NOW())")
    sql += ",\n".join(users) + ";\n\n"

    # Admins
    sql += "-- Admins\n"
    sql += "INSERT INTO admins (id, user_id, full_name, department, created_at, updated_at) VALUES \n"
    sql += f"('{uuid.uuid4()}', '{admin_id}', 'Admin Chief', 'Operations', NOW(), NOW());\n\n"

    # Doctors
    sql += "-- Doctors\n"
    sql += "INSERT INTO doctors (id, user_id, full_name, specialization, license_number, hospital_name, hospital_address, experience_years, consultation_fee, hospital_id, created_at, updated_at) VALUES \n"
    docs = []
    docs.append(f"('{uuid.uuid4()}', '{doc_ids[0]}', 'Ramesh Rao', 'Cardiologist', 'LIC-DOC-101', '{hospitals[0][1]}', '{hospitals[0][2]}', 18, 1500, '{hospitals[0][0]}', NOW(), NOW())")
    docs.append(f"('{uuid.uuid4()}', '{doc_ids[1]}', 'Ananya Hegde', 'Neurologist', 'LIC-DOC-102', '{hospitals[1][1]}', '{hospitals[1][2]}', 12, 1200, '{hospitals[1][0]}', NOW(), NOW())")
    docs.append(f"('{uuid.uuid4()}', '{doc_ids[2]}', 'Suresh Kumar', 'Orthopedic', 'LIC-DOC-103', '{hospitals[2][1]}', '{hospitals[2][2]}', 8, 1000, '{hospitals[2][0]}', NOW(), NOW())")
    sql += ",\n".join(docs) + ";\n\n"

    # Patients
    sql += "-- Patients\n"
    sql += "INSERT INTO patients (id, user_id, full_name, date_of_birth, gender, blood_group, city, state, created_at, updated_at) VALUES \n"
    pats = []
    names = ["Rajesh Gowda", "Sneha Patil", "Karthik N", "Priya K", "Arjun Reddy"]
    for i, p_id in enumerate(pat_ids):
        pats.append(f"('{uuid.uuid4()}', '{p_id}', '{names[i]}', '1990-01-01', 'Male', 'O+', 'Bangalore', 'Karnataka', NOW(), NOW())")
    sql += ",\n".join(pats) + ";\n\n"

    # Pharmacies
    sql += "-- Pharmacies\n"
    sql += "INSERT INTO pharmacies (id, user_id, business_name, license_number, address, city, state, contact_number, created_at, updated_at) VALUES \n"
    pharms = []
    pharms.append(f"('{uuid.uuid4()}', '{pharm_ids[0]}', 'Apollo Pharmacy Indiranagar', 'LIC-PHM-01', 'Indiranagar 100ft road', 'Bangalore', 'Karnataka', '9876543210', NOW(), NOW())")
    pharms.append(f"('{uuid.uuid4()}', '{pharm_ids[1]}', 'MedPlus Koramangala', 'LIC-PHM-02', 'Koramangala 80ft road', 'Bangalore', 'Karnataka', '9876543211', NOW(), NOW())")
    sql += ",\n".join(pharms) + ";\n\n"

    # Medicine Categories
    sql += "-- Medicine Categories\n"
    cat_id = str(uuid.uuid4())
    sql += f"INSERT INTO medicine_categories (id, name, description, created_at, updated_at) VALUES ('{cat_id}', 'General', 'General Medicines', NOW(), NOW());\n\n"

    # Medicines
    sql += "-- Medicines\n"
    sql += "INSERT INTO medicines (id, name, generic_name, category_id, manufacturer, price, prescription_required, created_at, updated_at) VALUES \n"
    med_ids = [str(uuid.uuid4()) for _ in range(8)]
    med_names = ['Paracetamol', 'Amoxicillin', 'Ibuprofen', 'Cetirizine', 'Azithromycin', 'Omeprazole', 'Metformin', 'Amlodipine']
    meds = []
    for i, m_id in enumerate(med_ids):
        presc = "TRUE" if i % 2 == 0 else "FALSE"
        meds.append(f"('{m_id}', '{med_names[i]}', '{med_names[i]}', '{cat_id}', 'Cipla', {50.0 + i*10}, {presc}, NOW(), NOW())")
    sql += ",\n".join(meds) + ";\n\n"

    # Appointments
    sql += "-- Appointments\n"
    sql += "INSERT INTO appointments (id, patient_id, doctor_id, appointment_date, start_time, end_time, status, created_at, updated_at) VALUES \n"
    appts = []
    appt_ids = [str(uuid.uuid4()) for _ in range(10)]
    for i, a_id in enumerate(appt_ids):
        pat_id = random.choice(pat_ids)
        doc_id = random.choice(doc_ids)
        status = random.choice(['COMPLETED', 'PENDING', 'CONFIRMED'])
        date_offset = random.randint(-5, 5)
        appt_date = (datetime.date.today() + datetime.timedelta(days=date_offset)).isoformat()
        appts.append(f"('{a_id}', '{pat_id}', '{doc_id}', '{appt_date}', '10:00:00', '10:30:00', '{status}', NOW(), NOW())")
    sql += ",\n".join(appts) + ";\n\n"

    # Prescriptions
    sql += "-- Prescriptions\n"
    sql += "INSERT INTO prescriptions (id, appointment_id, patient_id, doctor_id, diagnosis, is_finalized, is_dispensed, created_at, updated_at) VALUES \n"
    rx_ids = [str(uuid.uuid4()) for _ in range(3)]
    rxs = []
    for i, rx_id in enumerate(rx_ids):
        rxs.append(f"('{rx_id}', '{appt_ids[i]}', '{pat_ids[0]}', '{doc_ids[0]}', 'Common Cold', TRUE, FALSE, NOW(), NOW())")
    sql += ",\n".join(rxs) + ";\n\n"

    # Orders
    sql += "-- Orders\n"
    sql += "INSERT INTO medicine_orders (id, patient_id, pharmacy_id, status, total_amount, created_at, updated_at) VALUES \n"
    ord_ids = [str(uuid.uuid4()) for _ in range(3)]
    ords = []
    for i, o_id in enumerate(ord_ids):
        ords.append(f"('{o_id}', '{pat_ids[0]}', '{pharm_ids[0]}', 'PENDING', 250.0, NOW(), NOW())")
    sql += ",\n".join(ords) + ";\n\n"

    sql += "COMMIT;\n"
    
    with open('dummy_values.sql', 'w', encoding='utf-8') as f:
        f.write(sql)
        
    print("Successfully generated dummy_values.sql with minimal Bangalore dataset.")

if __name__ == "__main__":
    generate_sql()
