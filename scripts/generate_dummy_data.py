import uuid
import random
import datetime

def generate_sql():
    sql = "BEGIN;\n\n"

    # Define standard users
    admin1_id = "a1000000-0000-0000-0000-000000000000"
    admin2_id = "a2000000-0000-0000-0000-000000000000"
    doc1_id = "b1000000-0000-0000-0000-000000000000"
    doc2_id = "b2000000-0000-0000-0000-000000000000"
    doc3_id = "00000000-0000-0000-0000-000000000001"
    doc4_id = "00000000-0000-0000-0000-000000000002"
    pat1_id = "c1000000-0000-0000-0000-000000000000"
    pat2_id = "c2000000-0000-0000-0000-000000000000"
    
    pharmacy_users = [str(uuid.uuid4()) for _ in range(10)]
    supplier_ids = [str(uuid.uuid4()) for _ in range(10)]
    category_ids = [str(uuid.uuid4()) for _ in range(10)]

    sql += "-- Users\n"
    sql += "INSERT INTO users (id, email, password_hash, role, status, created_at, updated_at) VALUES \n"
    
    users = [
        f"('{admin1_id}', 'admin1@medsync.com', 'admin', 'ADMIN', 'ACTIVE', NOW(), NOW())",
        f"('{admin2_id}', 'admin2@medsync.com', 'admin', 'ADMIN', 'ACTIVE', NOW(), NOW())",
        f"('{doc1_id}', 'doctor1@medsync.com', 'doctor', 'DOCTOR', 'ACTIVE', NOW(), NOW())",
        f"('{doc2_id}', 'doctor2@medsync.com', 'doctor', 'DOCTOR', 'ACTIVE', NOW(), NOW())",
        f"('{doc3_id}', 'dr.rao@manipal.com', 'doctor', 'DOCTOR', 'ACTIVE', NOW(), NOW())",
        f"('{doc4_id}', 'dr.shetty@apollo.com', 'doctor', 'DOCTOR', 'ACTIVE', NOW(), NOW())",
        f"('{pat1_id}', 'patient1@medsync.com', 'patient', 'PATIENT', 'ACTIVE', NOW(), NOW())",
        f"('{pat2_id}', 'patient2@medsync.com', 'patient', 'PATIENT', 'ACTIVE', NOW(), NOW())"
    ]
    
    for i, p_id in enumerate(pharmacy_users):
        users.append(f"('{p_id}', 'pharmacy{i+1}@medsync.com', 'pharma', 'PHARMACY', 'ACTIVE', NOW(), NOW())")
    
    sql += ",\n".join(users) + ";\n\n"

    # Pharmacies
    sql += "-- Pharmacies\n"
    sql += "INSERT INTO pharmacies (id, user_id, business_name, license_number, gst_number, address, contact_number, created_at, updated_at) VALUES \n"
    pharmacies = []
    for i, p_id in enumerate(pharmacy_users):
        pharm_id = str(uuid.uuid4())
        pharmacies.append(f"('{pharm_id}', '{p_id}', 'Medsync Pharmacy {i+1}', 'LIC-PHM-{i:03d}', 'GST{i:03d}', '{i} Pharmacy St, Bangalore', '9876543{i:03d}', NOW(), NOW())")
    sql += ",\n".join(pharmacies) + ";\n\n"

    # Suppliers
    sql += "-- Suppliers\n"
    sql += "INSERT INTO suppliers (id, name, contact_person, email, phone_number, address, license_number, gst_number, created_at, updated_at) VALUES \n"
    suppliers = []
    for i, s_id in enumerate(supplier_ids):
        suppliers.append(f"('{s_id}', 'Supplier {i+1} Pharma', 'Contact {i+1}', 'supplier{i+1}@pharma.com', '123456789{i}', 'Warehouse {i}', 'LIC-SUP-{i}', 'GST-SUP-{i}', NOW(), NOW())")
    sql += ",\n".join(suppliers) + ";\n\n"
    
    # Medicine Categories
    sql += "-- Medicine Categories\n"
    sql += "INSERT INTO medicine_categories (id, name, description, created_at, updated_at) VALUES \n"
    cat_names = ['Antibiotics', 'Analgesics', 'Antipyretics', 'Antihistamines', 'Antihypertensives', 'Antidiabetics', 'Vitamins', 'Antacids', 'Antidepressants', 'Statins']
    cats = []
    for i, c_id in enumerate(category_ids):
        cats.append(f"('{c_id}', '{cat_names[i]}', 'Category for {cat_names[i]}', NOW(), NOW())")
    sql += ",\n".join(cats) + ";\n\n"
    
    # Medicines (500+)
    generic_names = ['Paracetamol', 'Amoxicillin', 'Ibuprofen', 'Metformin', 'Amlodipine', 'Omeprazole', 'Azithromycin', 'Losartan', 'Atorvastatin', 'Cetirizine'] * 5
    manufacturers = ['Cipla', 'Sun Pharma', 'Lupin', 'Dr. Reddys', 'Torrent', 'Mankind', 'Abbott', 'GSK', 'Pfizer', 'Sanofi']
    dosage_forms = ['Tablet', 'Capsule', 'Syrup', 'Injection']
    strengths = ['100mg', '250mg', '500mg', '1g']
    pack_sizes = ['10s', '15s', '30s', '100ml']
    
    sql += "-- Medicines\n"
    sql += "INSERT INTO medicines (id, name, generic_name, brand_name, category_id, manufacturer, strength, dosage_form, pack_size, price, storage_requirements, prescription_required, controlled_drug, barcode, qr_code, image_url, description, created_at, updated_at) VALUES \n"
    
    medicine_ids = []
    medicine_inserts = []
    
    for i in range(550):
        med_id = str(uuid.uuid4())
        medicine_ids.append(med_id)
        generic = generic_names[i % len(generic_names)]
        brand = f"{generic[:3].capitalize()}Brand-{i}"
        name = brand
        cat_id = category_ids[i % 10]
        mfg = manufacturers[i % 10]
        strength = strengths[i % 4]
        form = dosage_forms[i % 4]
        pack = pack_sizes[i % 4]
        price = round(random.uniform(10.0, 500.0), 2)
        storage = "Room temperature"
        presc = "TRUE" if i % 3 == 0 else "FALSE"
        ctrl = "FALSE"
        barcode = f"8901234{i:06d}"
        qrcode = f"QR-{i:06d}"
        img = "https://via.placeholder.com/150"
        desc = f"Effective for treatment using {generic}"
        
        val = f"('{med_id}', '{name}', '{generic}', '{brand}', '{cat_id}', '{mfg}', '{strength}', '{form}', '{pack}', {price}, '{storage}', {presc}, {ctrl}, '{barcode}', '{qrcode}', '{img}', '{desc}', NOW(), NOW())"
        medicine_inserts.append(val)
        
    sql += ",\n".join(medicine_inserts) + ";\n\n"
    
    # Inventory
    sql += "-- Inventory\n"
    sql += "INSERT INTO medicine_inventory (id, pharmacy_id, medicine_id, supplier_id, batch_number, manufacturing_date, expiry_date, stock_quantity, minimum_stock, maximum_stock, unit_price, purchase_price, selling_price, gst, created_at, updated_at) VALUES \n"
    
    inventory_inserts = []
    for pharm_id in pharmacy_users:
        # Give each pharmacy 100 random medicines
        meds_for_pharm = random.sample(medicine_ids, 100)
        for med_id in meds_for_pharm:
            inv_id = str(uuid.uuid4())
            sup_id = random.choice(supplier_ids)
            batch = f"BAT-{random.randint(1000,9999)}"
            mfg_date = f"'{datetime.date.today() - datetime.timedelta(days=random.randint(30, 300))}'"
            exp_date = f"'{datetime.date.today() + datetime.timedelta(days=random.randint(10, 800))}'"
            stock = random.randint(0, 500)
            min_stk = 50
            max_stk = 1000
            pur_price = round(random.uniform(5.0, 300.0), 2)
            sell_price = round(pur_price * 1.3, 2)
            gst = 12.0
            
            val = f"('{inv_id}', '{pharm_id}', '{med_id}', '{sup_id}', '{batch}', {mfg_date}, {exp_date}, {stock}, {min_stk}, {max_stk}, {sell_price}, {pur_price}, {sell_price}, {gst}, NOW(), NOW())"
            inventory_inserts.append(val)
            
    sql += ",\n".join(inventory_inserts) + ";\n\n"

    sql += "COMMIT;\n"
    
    with open('dummy_values.sql', 'w', encoding='utf-8') as f:
        f.write(sql)
        
    print("Successfully generated dummy_values.sql with 500+ medicines and realistic inventory data.")

if __name__ == "__main__":
    generate_sql()
