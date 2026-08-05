BEGIN;

TRUNCATE TABLE 
    medical_record_categories,
    medical_record_tags,
    medicine_categories,
    users,
    admins,
    ai_chat_sessions,
    appointments,
    consent_history,
    doctor_availability,
    doctors,
    medical_records,
    medicines,
    notification_preferences,
    notifications,
    patients,
    pharmacies,
    ai_chat_messages,
    appointment_status_history,
    medical_record_tag_mappings,
    medical_record_versions,
    suppliers,
    medicine_inventory,
    prescriptions,
    record_permissions,
    verification_requests,
    ai_analyses,
    doctor_notes,
    file_metadata,
    medicine_orders,
    ocr_results,
    prescription_items,
    delivery_tracking,
    medicine_order_items,
    payments,
    invoices,
    blockchain_transactions,
    blockchain_sync_tasks,
    blockchain_audit_logs,
    api_request_logs,
    blockchain_event_queue,
    blockchain_sync_state,
    hospitals,
    qr_verification_logs,
    download_audit_logs
CASCADE;

-- Users (Total 10: 2 Admin, 2 Doctor, 4 Patient, 2 Pharmacy)
INSERT INTO users (id, email, password_hash, role, status, created_at, updated_at) VALUES 
('cb85f4bd-eef1-4db7-b224-e4c9f5d44398', 'admin1@medsync.com', 'admin', 'ADMIN', 'ACTIVE', NOW(), NOW()),
('a293d435-24b1-4578-90af-fb652dd2998e', 'admin2@medsync.com', 'admin', 'ADMIN', 'ACTIVE', NOW(), NOW()),
('8325b2fa-1117-4854-91a2-fce5b9b5dfae', 'doctor1@medsync.com', 'doctor', 'DOCTOR', 'ACTIVE', NOW(), NOW()),
('9f7ba5b0-da85-44ec-8ab9-f1dbd5c0272b', 'doctor2@medsync.com', 'doctor', 'DOCTOR', 'ACTIVE', NOW(), NOW()),
('028c8f92-9b00-4eea-8c9b-c394a5d18d4f', 'patient1@medsync.com', 'patient', 'PATIENT', 'ACTIVE', NOW(), NOW()),
('74b86e1e-58e6-4fe9-b6e7-51810456b8a3', 'patient2@medsync.com', 'patient', 'PATIENT', 'ACTIVE', NOW(), NOW()),
('8d13ae90-9043-45e2-9ebe-7caf44fc89db', 'patient3@medsync.com', 'patient', 'PATIENT', 'ACTIVE', NOW(), NOW()),
('5584c0f5-b6c6-4c7e-9936-096527d7d758', 'patient4@medsync.com', 'patient', 'PATIENT', 'ACTIVE', NOW(), NOW()),
('24c1699d-4ebd-40f0-ab60-255890213ca0', 'pharmacy1@medsync.com', 'pharma', 'PHARMACY', 'ACTIVE', NOW(), NOW()),
('737fcdef-2562-440c-862f-a9f2a6bd6546', 'pharmacy2@medsync.com', 'pharma', 'PHARMACY', 'ACTIVE', NOW(), NOW());

-- Admins
INSERT INTO admins (id, user_id, full_name, department, created_at, updated_at) VALUES 
('90b33e14-03ef-436b-8aab-3c3740d5bb15', 'cb85f4bd-eef1-4db7-b224-e4c9f5d44398', 'Admin Name 1', 'IT', NOW(), NOW()),
('7e2b9a94-78d1-4b0b-898d-93557ef75e21', 'a293d435-24b1-4578-90af-fb652dd2998e', 'Admin Name 2', 'IT', NOW(), NOW());

-- Hospitals
INSERT INTO hospitals (id, name, address, city, state, country, pincode, is_verified, is_active, created_at, updated_at) VALUES 
('92ffabd1-0979-43f4-8216-e9d8763504a6', 'Hospital 1', '1 Main Rd', 'Bangalore', 'Karnataka', 'India', '560001', TRUE, TRUE, NOW(), NOW()),
('fe65f841-dff2-42c1-8f46-80dd5af027bc', 'Hospital 2', '2 Main Rd', 'Bangalore', 'Karnataka', 'India', '560001', TRUE, TRUE, NOW(), NOW()),
('3efa13e6-d183-4257-aebd-49c7e4012311', 'Hospital 3', '3 Main Rd', 'Bangalore', 'Karnataka', 'India', '560001', TRUE, TRUE, NOW(), NOW()),
('08b3a84d-1a26-4be2-a926-ff2a3908e958', 'Hospital 4', '4 Main Rd', 'Bangalore', 'Karnataka', 'India', '560001', TRUE, TRUE, NOW(), NOW());

-- Doctors
INSERT INTO doctors (id, user_id, full_name, specialization, license_number, experience_years, consultation_fee, hospital_id, doctor_status, created_at, updated_at) VALUES 
('f596cda6-eecc-4cd8-b7cc-76f59ac5a96a', '8325b2fa-1117-4854-91a2-fce5b9b5dfae', 'Dr. Doctor 1', 'General', 'LIC-DOC-1', 5, 500, '92ffabd1-0979-43f4-8216-e9d8763504a6', 'APPROVED', NOW(), NOW()),
('58848e2c-8476-4f75-8555-d27033f143a8', '9f7ba5b0-da85-44ec-8ab9-f1dbd5c0272b', 'Dr. Doctor 2', 'General', 'LIC-DOC-2', 5, 500, 'fe65f841-dff2-42c1-8f46-80dd5af027bc', 'APPROVED', NOW(), NOW());

-- Pharmacies
INSERT INTO pharmacies (id, user_id, business_name, license_number, gst_number, address, contact_number, created_at, updated_at) VALUES 
('826b022a-d5bf-4458-ae85-f657f6bac8b4', '24c1699d-4ebd-40f0-ab60-255890213ca0', 'Pharmacy 1', 'LIC-PHM-1', 'GST-1', '1 Pharma St, Bangalore', '9876543210', NOW(), NOW()),
('9dfc0211-ea3d-4229-a416-786975931be1', '737fcdef-2562-440c-862f-a9f2a6bd6546', 'Pharmacy 2', 'LIC-PHM-2', 'GST-2', '2 Pharma St, Bangalore', '9876543210', NOW(), NOW());

-- Suppliers
INSERT INTO suppliers (id, name, contact_person, email, phone_number, address, license_number, gst_number, created_at, updated_at) VALUES 
('ac945578-6b7d-438f-9301-08ac12e59af4', 'Supplier 1', 'Contact 1', 'sup1@test.com', '123456', 'Address 1', 'LIC-SUP-1', 'GST-1', NOW(), NOW()),
('2e51d6ca-983d-48cc-8570-e1184030fb72', 'Supplier 2', 'Contact 2', 'sup2@test.com', '123456', 'Address 2', 'LIC-SUP-2', 'GST-2', NOW(), NOW()),
('3cd4def1-81de-40fb-b352-79474b208c84', 'Supplier 3', 'Contact 3', 'sup3@test.com', '123456', 'Address 3', 'LIC-SUP-3', 'GST-3', NOW(), NOW()),
('3118070e-a4d9-4034-b22a-fe24536613d7', 'Supplier 4', 'Contact 4', 'sup4@test.com', '123456', 'Address 4', 'LIC-SUP-4', 'GST-4', NOW(), NOW());

-- Medicine Categories
INSERT INTO medicine_categories (id, name, description, created_at, updated_at) VALUES 
('2a385e3e-6130-49df-8cde-379711ad0343', 'Antibiotics', 'Kills bacteria', NOW(), NOW()),
('8644c1fb-67a3-459d-9dfc-71f5d0cce689', 'Analgesics', 'Pain relievers', NOW(), NOW()),
('2b5a33ba-cc37-4c10-9f71-a48bc69cf831', 'Antipyretics', 'Reduces fever', NOW(), NOW()),
('16e12955-b9b2-4cff-b5c4-d321198fa809', 'Antiseptics', 'Prevents infection', NOW(), NOW()),
('41e19c03-5764-4149-aad3-9018ddcf77aa', 'Vitamins', 'Dietary supplements', NOW(), NOW());

-- Medicines
INSERT INTO medicines (id, name, generic_name, brand_name, category_id, manufacturer, strength, dosage_form, pack_size, price, storage_requirements, prescription_required, controlled_drug, created_at, updated_at) VALUES 
('fe928f50-c49f-4a47-a3f1-96d989ed1325', 'Medicine 1', 'Generic 1', 'Brand 1', '2a385e3e-6130-49df-8cde-379711ad0343', 'Manufacturer 1', '500mg', 'Tablet', '10s', 10.5, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('0d4aa913-8930-485f-8c21-7e4bd1e37c9d', 'Medicine 2', 'Generic 2', 'Brand 2', '8644c1fb-67a3-459d-9dfc-71f5d0cce689', 'Manufacturer 2', '500mg', 'Tablet', '10s', 21.0, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('e8b0b66f-674c-4a01-b03e-04f6ea59d4fb', 'Medicine 3', 'Generic 3', 'Brand 3', '2b5a33ba-cc37-4c10-9f71-a48bc69cf831', 'Manufacturer 3', '500mg', 'Tablet', '10s', 31.5, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('8ed15e21-72fe-45b9-937a-56cddacb5fef', 'Medicine 4', 'Generic 4', 'Brand 4', '16e12955-b9b2-4cff-b5c4-d321198fa809', 'Manufacturer 1', '500mg', 'Tablet', '10s', 42.0, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('7f28b6b4-10bb-4569-86e9-22942e38f58b', 'Medicine 5', 'Generic 5', 'Brand 5', '41e19c03-5764-4149-aad3-9018ddcf77aa', 'Manufacturer 2', '500mg', 'Tablet', '10s', 52.5, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('23a27cdc-b84d-4aa1-9fdf-e9be668adc5c', 'Medicine 6', 'Generic 6', 'Brand 6', '2a385e3e-6130-49df-8cde-379711ad0343', 'Manufacturer 3', '500mg', 'Tablet', '10s', 63.0, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('b3d9dc8b-881b-48fc-81bc-745ee1488a97', 'Medicine 7', 'Generic 7', 'Brand 7', '8644c1fb-67a3-459d-9dfc-71f5d0cce689', 'Manufacturer 1', '500mg', 'Tablet', '10s', 73.5, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('2f484544-b7cd-4acb-aa6c-5458d081036c', 'Medicine 8', 'Generic 8', 'Brand 8', '2b5a33ba-cc37-4c10-9f71-a48bc69cf831', 'Manufacturer 2', '500mg', 'Tablet', '10s', 84.0, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('e1d0ff26-0938-44d5-9d10-da4577ac585a', 'Medicine 9', 'Generic 9', 'Brand 9', '16e12955-b9b2-4cff-b5c4-d321198fa809', 'Manufacturer 3', '500mg', 'Tablet', '10s', 94.5, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('49410dd6-556f-428c-af64-bdbdb95bb3a3', 'Medicine 10', 'Generic 10', 'Brand 10', '41e19c03-5764-4149-aad3-9018ddcf77aa', 'Manufacturer 1', '500mg', 'Tablet', '10s', 105.0, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('4e1ee755-fa18-4bad-8728-b613273467b7', 'Medicine 11', 'Generic 11', 'Brand 11', '2a385e3e-6130-49df-8cde-379711ad0343', 'Manufacturer 2', '500mg', 'Tablet', '10s', 115.5, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('c1a81b13-0e70-45dc-ae55-ee6f9a71675c', 'Medicine 12', 'Generic 12', 'Brand 12', '8644c1fb-67a3-459d-9dfc-71f5d0cce689', 'Manufacturer 3', '500mg', 'Tablet', '10s', 126.0, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('e875b33e-0c89-4dbc-81da-961f7269085a', 'Medicine 13', 'Generic 13', 'Brand 13', '2b5a33ba-cc37-4c10-9f71-a48bc69cf831', 'Manufacturer 1', '500mg', 'Tablet', '10s', 136.5, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('6c0cf227-ef40-4b80-847f-50d44599c658', 'Medicine 14', 'Generic 14', 'Brand 14', '16e12955-b9b2-4cff-b5c4-d321198fa809', 'Manufacturer 2', '500mg', 'Tablet', '10s', 147.0, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('41746cb6-f203-4299-af8b-1c2222801e41', 'Medicine 15', 'Generic 15', 'Brand 15', '41e19c03-5764-4149-aad3-9018ddcf77aa', 'Manufacturer 3', '500mg', 'Tablet', '10s', 157.5, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('9fd7c0e8-3566-46c1-9596-ec2784fe8c9b', 'Medicine 16', 'Generic 16', 'Brand 16', '2a385e3e-6130-49df-8cde-379711ad0343', 'Manufacturer 1', '500mg', 'Tablet', '10s', 168.0, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('b884d2a7-fce7-474e-9073-4883f24633a1', 'Medicine 17', 'Generic 17', 'Brand 17', '8644c1fb-67a3-459d-9dfc-71f5d0cce689', 'Manufacturer 2', '500mg', 'Tablet', '10s', 178.5, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('e8a3e573-9a65-4b1e-bacc-4f1aa96b8d79', 'Medicine 18', 'Generic 18', 'Brand 18', '2b5a33ba-cc37-4c10-9f71-a48bc69cf831', 'Manufacturer 3', '500mg', 'Tablet', '10s', 189.0, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('a9257a80-68ff-4485-a455-0cdd590ee87b', 'Medicine 19', 'Generic 19', 'Brand 19', '16e12955-b9b2-4cff-b5c4-d321198fa809', 'Manufacturer 1', '500mg', 'Tablet', '10s', 199.5, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('85a53084-35ef-4e56-ba38-ac750f336bc9', 'Medicine 20', 'Generic 20', 'Brand 20', '41e19c03-5764-4149-aad3-9018ddcf77aa', 'Manufacturer 2', '500mg', 'Tablet', '10s', 210.0, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('42754a0d-03fd-410d-8165-d379520c45a2', 'Medicine 21', 'Generic 21', 'Brand 21', '2a385e3e-6130-49df-8cde-379711ad0343', 'Manufacturer 3', '500mg', 'Tablet', '10s', 220.5, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('4fc5aa6c-47f6-4a94-b914-f95bdb5a5ad0', 'Medicine 22', 'Generic 22', 'Brand 22', '8644c1fb-67a3-459d-9dfc-71f5d0cce689', 'Manufacturer 1', '500mg', 'Tablet', '10s', 231.0, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('3f445017-c16e-451d-9c4f-d37b020c27ec', 'Medicine 23', 'Generic 23', 'Brand 23', '2b5a33ba-cc37-4c10-9f71-a48bc69cf831', 'Manufacturer 2', '500mg', 'Tablet', '10s', 241.5, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('b8502a92-91d5-4042-a2d2-8c826ce2cab1', 'Medicine 24', 'Generic 24', 'Brand 24', '16e12955-b9b2-4cff-b5c4-d321198fa809', 'Manufacturer 3', '500mg', 'Tablet', '10s', 252.0, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('bac935d7-d9ca-4632-a00c-4726663483f1', 'Medicine 25', 'Generic 25', 'Brand 25', '41e19c03-5764-4149-aad3-9018ddcf77aa', 'Manufacturer 1', '500mg', 'Tablet', '10s', 262.5, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('b2b05698-a70d-4010-8c77-c954bada6041', 'Medicine 26', 'Generic 26', 'Brand 26', '2a385e3e-6130-49df-8cde-379711ad0343', 'Manufacturer 2', '500mg', 'Tablet', '10s', 273.0, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('fad1f964-5c72-4357-9aa3-ec99da000363', 'Medicine 27', 'Generic 27', 'Brand 27', '8644c1fb-67a3-459d-9dfc-71f5d0cce689', 'Manufacturer 3', '500mg', 'Tablet', '10s', 283.5, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('00c997c5-c8f8-4a88-86fe-7a0df44fe8c4', 'Medicine 28', 'Generic 28', 'Brand 28', '2b5a33ba-cc37-4c10-9f71-a48bc69cf831', 'Manufacturer 1', '500mg', 'Tablet', '10s', 294.0, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('1f5db56a-5c44-4dac-bf3a-11263cc51535', 'Medicine 29', 'Generic 29', 'Brand 29', '16e12955-b9b2-4cff-b5c4-d321198fa809', 'Manufacturer 2', '500mg', 'Tablet', '10s', 304.5, 'Room Temp', FALSE, FALSE, NOW(), NOW()),
('7509e94b-5fae-47d9-b61b-2fcf22fde783', 'Medicine 30', 'Generic 30', 'Brand 30', '41e19c03-5764-4149-aad3-9018ddcf77aa', 'Manufacturer 3', '500mg', 'Tablet', '10s', 315.0, 'Room Temp', FALSE, FALSE, NOW(), NOW());

COMMIT;
