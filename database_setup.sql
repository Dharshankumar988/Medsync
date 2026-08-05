BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL, 
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> 4563cc017e22

CREATE TABLE medical_record_categories (
    name VARCHAR(255) NOT NULL, 
    description TEXT, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    UNIQUE (name)
);

CREATE TABLE medical_record_tags (
    name VARCHAR(255) NOT NULL, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    UNIQUE (name)
);

CREATE TABLE medicine_categories (
    name VARCHAR(255) NOT NULL, 
    description TEXT, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    UNIQUE (name)
);

CREATE TYPE userrole AS ENUM ('PATIENT', 'DOCTOR', 'PHARMACY', 'ADMIN');

CREATE TYPE userstatus AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

CREATE TABLE users (
    email VARCHAR(255) NOT NULL, 
    password_hash VARCHAR(255) NOT NULL, 
    role userrole NOT NULL, 
    status userstatus NOT NULL, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    deleted_at TIMESTAMP WITHOUT TIME ZONE, 
    PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_users_email ON users (email);

CREATE TABLE admins (
    user_id UUID NOT NULL, 
    full_name VARCHAR(255) NOT NULL, 
    department VARCHAR(255), 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(user_id) REFERENCES users (id), 
    UNIQUE (user_id)
);

CREATE TABLE ai_chat_sessions (
    user_id UUID NOT NULL, 
    title VARCHAR(255) NOT NULL, 
    is_doctor_mode BOOLEAN NOT NULL, 
    is_pinned BOOLEAN NOT NULL, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE appointments (
    patient_id UUID NOT NULL, 
    doctor_id UUID NOT NULL, 
    appointment_date DATE NOT NULL, 
    start_time TIME WITHOUT TIME ZONE NOT NULL, 
    end_time TIME WITHOUT TIME ZONE NOT NULL, 
    status VARCHAR(50) NOT NULL, 
    notes TEXT, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(doctor_id) REFERENCES users (id), 
    FOREIGN KEY(patient_id) REFERENCES users (id)
);

CREATE TABLE consent_history (
    patient_id UUID NOT NULL, 
    doctor_id UUID NOT NULL, 
    action VARCHAR(50) NOT NULL, 
    blockchain_tx_hash VARCHAR(255), 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(doctor_id) REFERENCES users (id), 
    FOREIGN KEY(patient_id) REFERENCES users (id)
);

CREATE TABLE doctor_availability (
    doctor_id UUID NOT NULL, 
    day_of_week INTEGER NOT NULL, 
    start_time TIME WITHOUT TIME ZONE NOT NULL, 
    end_time TIME WITHOUT TIME ZONE NOT NULL, 
    is_available BOOLEAN NOT NULL, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(doctor_id) REFERENCES users (id)
);

CREATE TABLE doctors (
    user_id UUID NOT NULL, 
    full_name VARCHAR(255) NOT NULL, 
    specialization VARCHAR(255), 
    license_number VARCHAR(255), 
    experience_years INTEGER NOT NULL, 
    bio VARCHAR(1000), 
    consultation_fee INTEGER NOT NULL, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(user_id) REFERENCES users (id), 
    UNIQUE (license_number), 
    UNIQUE (user_id)
);

CREATE TABLE medical_records (
    patient_id UUID NOT NULL, 
    uploaded_by UUID NOT NULL, 
    category_id UUID, 
    title VARCHAR(255) NOT NULL, 
    description TEXT, 
    is_archived BOOLEAN NOT NULL, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    deleted_at TIMESTAMP WITHOUT TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(category_id) REFERENCES medical_record_categories (id), 
    FOREIGN KEY(patient_id) REFERENCES users (id), 
    FOREIGN KEY(uploaded_by) REFERENCES users (id)
);

CREATE TABLE medicines (
    name VARCHAR(255) NOT NULL, 
    generic_name VARCHAR(255), 
    brand_name VARCHAR(255), 
    category_id UUID NOT NULL, 
    manufacturer VARCHAR(255), 
    strength VARCHAR(100), 
    dosage_form VARCHAR(100), 
    pack_size VARCHAR(100), 
    price FLOAT, 
    storage_requirements VARCHAR(255), 
    prescription_required BOOLEAN DEFAULT FALSE, 
    controlled_drug BOOLEAN DEFAULT FALSE, 
    barcode VARCHAR(255), 
    qr_code VARCHAR(255), 
    image_url TEXT, 
    description TEXT, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(category_id) REFERENCES medicine_categories (id)
);

CREATE TABLE notification_preferences (
    user_id UUID NOT NULL, 
    email_enabled BOOLEAN NOT NULL, 
    push_enabled BOOLEAN NOT NULL, 
    in_app_enabled BOOLEAN NOT NULL, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(user_id) REFERENCES users (id), 
    UNIQUE (user_id)
);

CREATE TABLE notifications (
    user_id UUID NOT NULL, 
    title VARCHAR(255) NOT NULL, 
    message TEXT NOT NULL, 
    type VARCHAR(50) NOT NULL, 
    is_read BOOLEAN NOT NULL, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE patients (
    user_id UUID NOT NULL, 
    full_name VARCHAR(255) NOT NULL, 
    date_of_birth VARCHAR(50), 
    gender VARCHAR(50), 
    blood_group VARCHAR(10), 
    phone_number VARCHAR(20), 
    address VARCHAR(500), 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(user_id) REFERENCES users (id), 
    UNIQUE (user_id)
);

CREATE TABLE pharmacies (
    user_id UUID NOT NULL, 
    business_name VARCHAR(255) NOT NULL, 
    license_number VARCHAR(255), 
    gst_number VARCHAR(255), 
    address VARCHAR(500), 
    contact_number VARCHAR(20), 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(user_id) REFERENCES users (id), 
    UNIQUE (license_number), 
    UNIQUE (user_id)
);

CREATE TABLE ai_chat_messages (
    session_id UUID NOT NULL, 
    role VARCHAR(20) NOT NULL, 
    content TEXT NOT NULL, 
    model_used VARCHAR(100), 
    inference_time_ms INTEGER, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(session_id) REFERENCES ai_chat_sessions (id)
);

CREATE TABLE appointment_status_history (
    appointment_id UUID NOT NULL, 
    status VARCHAR(50) NOT NULL, 
    changed_by UUID NOT NULL, 
    reason TEXT, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(appointment_id) REFERENCES appointments (id), 
    FOREIGN KEY(changed_by) REFERENCES users (id)
);

CREATE TABLE medical_record_tag_mappings (
    record_id UUID NOT NULL, 
    tag_id UUID NOT NULL, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(record_id) REFERENCES medical_records (id), 
    FOREIGN KEY(tag_id) REFERENCES medical_record_tags (id)
);

CREATE TABLE medical_record_versions (
    record_id UUID NOT NULL, 
    version_number INTEGER NOT NULL, 
    ipfs_cid VARCHAR(255) NOT NULL, 
    file_type VARCHAR(50) NOT NULL, 
    file_size_bytes INTEGER NOT NULL, 
    change_description TEXT, 
    is_current BOOLEAN NOT NULL, 
    blockchain_tx_hash VARCHAR(255), 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(record_id) REFERENCES medical_records (id), 
    UNIQUE (ipfs_cid)
);

CREATE TABLE suppliers (
    name VARCHAR(255) NOT NULL, 
    contact_person VARCHAR(255), 
    email VARCHAR(255), 
    phone_number VARCHAR(20), 
    address TEXT, 
    license_number VARCHAR(100), 
    gst_number VARCHAR(100), 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id)
);

CREATE TABLE medicine_inventory (
    pharmacy_id UUID NOT NULL, 
    medicine_id UUID NOT NULL, 
    supplier_id UUID, 
    batch_number VARCHAR(100) NOT NULL, 
    manufacturing_date DATE, 
    expiry_date DATE NOT NULL, 
    stock_quantity INTEGER NOT NULL, 
    minimum_stock INTEGER DEFAULT 10, 
    maximum_stock INTEGER DEFAULT 1000, 
    unit_price FLOAT NOT NULL, 
    purchase_price FLOAT, 
    selling_price FLOAT, 
    gst FLOAT, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(medicine_id) REFERENCES medicines (id), 
    FOREIGN KEY(pharmacy_id) REFERENCES users (id), 
    FOREIGN KEY(supplier_id) REFERENCES suppliers (id)
);

CREATE TABLE prescriptions (
    appointment_id UUID NOT NULL, 
    patient_id UUID NOT NULL, 
    doctor_id UUID NOT NULL, 
    diagnosis TEXT, 
    notes TEXT, 
    is_finalized BOOLEAN NOT NULL, 
    is_dispensed BOOLEAN NOT NULL, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(appointment_id) REFERENCES appointments (id), 
    FOREIGN KEY(doctor_id) REFERENCES users (id), 
    FOREIGN KEY(patient_id) REFERENCES users (id), 
    UNIQUE (appointment_id)
);

CREATE TABLE record_permissions (
    record_id UUID NOT NULL, 
    granted_to UUID NOT NULL, 
    granted_by UUID NOT NULL, 
    access_level VARCHAR(50) NOT NULL, 
    expires_at TIMESTAMP WITHOUT TIME ZONE, 
    is_revoked BOOLEAN NOT NULL, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(granted_by) REFERENCES users (id), 
    FOREIGN KEY(granted_to) REFERENCES users (id), 
    FOREIGN KEY(record_id) REFERENCES medical_records (id)
);

CREATE TYPE roletype AS ENUM ('DOCTOR', 'PHARMACY');

CREATE TYPE verificationstatus AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED');

CREATE TABLE verification_requests (
    user_id UUID NOT NULL, 
    role_type roletype NOT NULL, 
    status verificationstatus NOT NULL, 
    reviewer_id UUID, 
    review_date TIMESTAMP WITHOUT TIME ZONE, 
    approval_date TIMESTAMP WITHOUT TIME ZONE, 
    rejection_reason TEXT, 
    blockchain_tx_hash VARCHAR(255), 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(reviewer_id) REFERENCES admins (id), 
    FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE ai_analyses (
    version_id UUID NOT NULL, 
    model_name VARCHAR(100) NOT NULL, 
    analysis_status VARCHAR(50) NOT NULL, 
    summary TEXT, 
    confidence_score FLOAT, 
    processing_time_ms INTEGER, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(version_id) REFERENCES medical_record_versions (id)
);

CREATE TABLE doctor_notes (
    version_id UUID NOT NULL, 
    doctor_id UUID NOT NULL, 
    note_text TEXT NOT NULL, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(doctor_id) REFERENCES users (id), 
    FOREIGN KEY(version_id) REFERENCES medical_record_versions (id)
);

CREATE TABLE file_metadata (
    version_id UUID NOT NULL, 
    supabase_storage_path VARCHAR(500), 
    mime_type VARCHAR(100), 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(version_id) REFERENCES medical_record_versions (id), 
    UNIQUE (version_id)
);

CREATE TABLE medicine_orders (
    patient_id UUID NOT NULL, 
    pharmacy_id UUID NOT NULL, 
    prescription_id UUID, 
    status VARCHAR(50) NOT NULL, 
    total_amount FLOAT NOT NULL, 
    delivery_address TEXT, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(patient_id) REFERENCES users (id), 
    FOREIGN KEY(pharmacy_id) REFERENCES users (id), 
    FOREIGN KEY(prescription_id) REFERENCES prescriptions (id)
);

CREATE TABLE ocr_results (
    version_id UUID NOT NULL, 
    extracted_text TEXT, 
    confidence FLOAT, 
    detected_fields JSONB, 
    status VARCHAR(50) NOT NULL, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(version_id) REFERENCES medical_record_versions (id), 
    UNIQUE (version_id)
);

CREATE TABLE prescription_items (
    prescription_id UUID NOT NULL, 
    medicine_name VARCHAR(255) NOT NULL, 
    dosage VARCHAR(100) NOT NULL, 
    frequency VARCHAR(100) NOT NULL, 
    duration_days INTEGER NOT NULL, 
    instructions TEXT, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(prescription_id) REFERENCES prescriptions (id)
);

CREATE TABLE delivery_tracking (
    order_id UUID NOT NULL, 
    tracking_number VARCHAR(255) NOT NULL, 
    current_status VARCHAR(100) NOT NULL, 
    delivery_partner VARCHAR(255), 
    estimated_delivery DATE, 
    notes TEXT, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(order_id) REFERENCES medicine_orders (id), 
    UNIQUE (order_id), 
    UNIQUE (tracking_number)
);

CREATE TABLE medicine_order_items (
    order_id UUID NOT NULL, 
    inventory_id UUID NOT NULL, 
    quantity INTEGER NOT NULL, 
    price_at_purchase FLOAT NOT NULL, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(inventory_id) REFERENCES medicine_inventory (id), 
    FOREIGN KEY(order_id) REFERENCES medicine_orders (id)
);

CREATE TABLE payments (
    user_id UUID NOT NULL, 
    order_id UUID, 
    appointment_id UUID, 
    amount FLOAT NOT NULL, 
    status VARCHAR(50) NOT NULL, 
    method VARCHAR(50) NOT NULL, 
    transaction_id VARCHAR(255), 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(appointment_id) REFERENCES appointments (id), 
    FOREIGN KEY(order_id) REFERENCES medicine_orders (id), 
    FOREIGN KEY(user_id) REFERENCES users (id), 
    UNIQUE (transaction_id)
);

CREATE TABLE invoices (
    payment_id UUID NOT NULL, 
    invoice_number VARCHAR(255) NOT NULL, 
    invoice_url VARCHAR(500), 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(payment_id) REFERENCES payments (id), 
    UNIQUE (invoice_number), 
    UNIQUE (payment_id)
);

INSERT INTO alembic_version (version_num) VALUES ('4563cc017e22') RETURNING alembic_version.version_num;

COMMIT;

-- Add hospital_name and hospital_address to doctors table
ALTER TABLE doctors
ADD COLUMN hospital_name VARCHAR(255),
ADD COLUMN hospital_address VARCHAR(500);
-- Note: The pharmacies table already has `address` and `license_number` fields.
-- No schema changes are required for pharmacies to support these fields.


-- ==============================================================================
﻿
-- ==============================================================================

-- PHASE 6: BLOCKCHAIN â†” SUPABASE SYNCHRONIZATION LAYER

-- ==============================================================================

BEGIN;

-- 1. Create Generalized Blockchain Transactions Table
-- Stores the actual on-chain transaction receipt metadata.
CREATE TABLE IF NOT EXISTS blockchain_transactions (
    transaction_hash VARCHAR(66) PRIMARY KEY,
    block_number INTEGER,
    block_timestamp TIMESTAMP WITHOUT TIME ZONE,
    gas_used INTEGER,
    gas_price VARCHAR(50),
    contract_address VARCHAR(42),
    contract_name VARCHAR(100),
    contract_version VARCHAR(20),
    network VARCHAR(50) NOT NULL,
    chain_id INTEGER,
    confirmation_count INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    wallet_address VARCHAR(42),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_blockchain_transactions_status ON blockchain_transactions(status);
CREATE INDEX IF NOT EXISTS ix_blockchain_transactions_contract ON blockchain_transactions(contract_address);

-- 2. Create Blockchain Sync Tasks Table (The Retry Queue & Sync Tracker)
-- Tracks the synchronization lifecycle of ANY database entity.
CREATE TABLE IF NOT EXISTS blockchain_sync_tasks (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- PRESCRIPTION, MEDICAL_RECORD, PATIENT, DOCTOR, PHARMACY
    entity_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- CREATE, UPDATE, REVOKE, VERIFY
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, SUBMITTED, CONFIRMING, CONFIRMED, FAILED, RETRYING, REVERTED, SYNCED
    transaction_hash VARCHAR(66) REFERENCES blockchain_transactions(transaction_hash),
    payload JSONB, -- Stores metadata or hashes required for the transaction
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 5,
    next_retry_time TIMESTAMP WITHOUT TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_blockchain_sync_tasks_status ON blockchain_sync_tasks(status);
CREATE INDEX IF NOT EXISTS ix_blockchain_sync_tasks_entity ON blockchain_sync_tasks(entity_type, entity_id);

-- 3. Update Existing Blockchain Audit Logs to be generalized
-- Drop the old table if it exists (assuming it was just tied to prescriptions and not yet used in prod)
DROP TABLE IF EXISTS blockchain_audit_logs CASCADE;

CREATE TABLE blockchain_audit_logs (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    transaction_hash VARCHAR(66) REFERENCES blockchain_transactions(transaction_hash),
    block_number INTEGER,
    contract_address VARCHAR(42),
    caller_address VARCHAR(42),
    event_data JSONB,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_blockchain_audit_logs_entity ON blockchain_audit_logs(entity_type, entity_id);

-- 4. Drop old blockchain_tasks table if it exists
DROP TABLE IF EXISTS blockchain_tasks CASCADE;

COMMIT;


-- ==============================================================================

-- PHASE 7: BLOCKCHAIN REST APIs

-- ==============================================================================

BEGIN;

-- Create API Request Logs table for auditing
CREATE TABLE IF NOT EXISTS api_request_logs (
    id UUID PRIMARY KEY,
    user_id UUID, -- Can be null if unauthenticated
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    ip_address VARCHAR(45),
    request_id VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_api_request_logs_user_id ON api_request_logs(user_id);
CREATE INDEX IF NOT EXISTS ix_api_request_logs_endpoint ON api_request_logs(endpoint);
CREATE INDEX IF NOT EXISTS ix_api_request_logs_created_at ON api_request_logs(created_at);

COMMIT;


-- ==============================================================================

-- PHASE 8: REAL-TIME BLOCKCHAIN EVENT PROCESSING

-- ==============================================================================

BEGIN;

-- 1. Create Blockchain Event Queue Table
-- Stores incoming events from the blockchain listeners for processing.
CREATE TABLE IF NOT EXISTS blockchain_event_queue (
    id UUID PRIMARY KEY,
    event_name VARCHAR(100) NOT NULL,
    contract_name VARCHAR(100) NOT NULL,
    contract_address VARCHAR(42) NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    block_number INTEGER NOT NULL,
    log_index INTEGER NOT NULL,
    event_data JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, PROCESSED, FAILED, DLQ
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 5,
    next_retry_time TIMESTAMP WITHOUT TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(transaction_hash, log_index)
);

CREATE INDEX IF NOT EXISTS ix_blockchain_event_queue_status ON blockchain_event_queue(status);
CREATE INDEX IF NOT EXISTS ix_blockchain_event_queue_event_name ON blockchain_event_queue(event_name);

-- 2. Create Blockchain Sync State Table
-- Tracks the last processed block for each contract to prevent missed events on restart.
CREATE TABLE IF NOT EXISTS blockchain_sync_state (
    id UUID PRIMARY KEY,
    contract_name VARCHAR(100) NOT NULL UNIQUE,
    last_processed_block INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Extend Blockchain Transactions for tracking
ALTER TABLE blockchain_transactions ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE blockchain_transactions ADD COLUMN IF NOT EXISTS execution_time_ms INTEGER;

COMMIT;


-- ==============================================================================

-- PHASE 10: DEEP BLOCKCHAIN INTEGRATION

-- ==============================================================================

BEGIN;

-- 1. Add tracking fields to Profile Tables
ALTER TABLE patients ADD COLUMN IF NOT EXISTS blockchain_status VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(66);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS verification_id VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS registered_at TIMESTAMP WITHOUT TIME ZONE;

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS blockchain_status VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(66);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS verification_id VARCHAR(100);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS registered_at TIMESTAMP WITHOUT TIME ZONE;

ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS blockchain_status VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(66);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS verification_id VARCHAR(100);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS registered_at TIMESTAMP WITHOUT TIME ZONE;

-- 2. Add tracking fields to AI Analyses Table
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(66);
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS inference_hash VARCHAR(66);
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS verification_metadata JSONB;
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS block_number INTEGER;
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS blockchain_status VARCHAR(50) DEFAULT 'PENDING';

-- 3. Add tracking fields to Medical Records Versions Table
ALTER TABLE medical_record_versions ADD COLUMN IF NOT EXISTS blockchain_status VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE medical_record_versions ADD COLUMN IF NOT EXISTS block_number INTEGER;

COMMIT;


-- ==============================================================================

-- PHASE 11: PRODUCTION SECURITY HARDENING & RLS POLICIES

-- ==============================================================================

BEGIN;

-- 1. Enable Row Level Security on all core tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_record_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_sync_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any (to remain idempotent)
DROP POLICY IF EXISTS "Patients can view their own profile" ON patients;
DROP POLICY IF EXISTS "Doctors can view their own profile" ON doctors;
DROP POLICY IF EXISTS "Patients can view their prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Doctors can view/edit prescriptions they wrote" ON prescriptions;
DROP POLICY IF EXISTS "Patients can view their medical records" ON medical_records;
DROP POLICY IF EXISTS "Patients can view their medical record versions" ON medical_record_versions;

-- 3. Create strictly scoped policies
-- PATIENTS
CREATE POLICY "Patients can view their own profile" ON patients
  FOR SELECT USING (auth.uid() = id);

-- DOCTORS
CREATE POLICY "Doctors can view their own profile" ON doctors
  FOR SELECT USING (auth.uid() = id);

-- PRESCRIPTIONS
CREATE POLICY "Patients can view their prescriptions" ON prescriptions
  FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view/edit prescriptions they wrote" ON prescriptions
  FOR ALL USING (auth.uid() = doctor_id);

-- MEDICAL RECORDS
CREATE POLICY "Patients can view their medical records" ON medical_records
  FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Patients can view their medical record versions" ON medical_record_versions
  FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM medical_records mr 
        WHERE mr.id = medical_record_versions.record_id 
        AND mr.patient_id = auth.uid()
    )
  );

-- 4. File Storage Security
-- Update medical-records bucket to be private
UPDATE storage.buckets SET public = false WHERE id = 'medical-records';

-- Drop existing storage policies
DROP POLICY IF EXISTS "Patients can access their own records" ON storage.objects;

-- Create storage policies (Assuming files are prefixed with patient_id/)
CREATE POLICY "Patients can access their own records" ON storage.objects
  FOR SELECT USING (bucket_id = 'medical-records' AND auth.uid()::text = (storage.foldername(name))[1]);

COMMIT;


-- ==============================================================================

-- PHASE 12: UI/UX AUDIT & PROFILE COMPLETION ENGINE

-- ==============================================================================

BEGIN;

-- 1. HOSPITALS TABLE
CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    pincode VARCHAR(20),
    phone_number VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS TABLE UPDATES
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- 3. PATIENTS TABLE UPDATES
ALTER TABLE patients ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_number VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(1024);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS government_id_url VARCHAR(1024);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_alerts TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS primary_physician_id UUID REFERENCES doctors(id);

-- 4. DOCTORS TABLE UPDATES
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS qualifications TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS clinic_name VARCHAR(255);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS clinic_address VARCHAR(500);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS clinic_phone VARCHAR(20);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS clinic_email VARCHAR(255);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS languages TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS consultation_hours TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS certificates_url TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS government_id_url VARCHAR(1024);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS professional_documents_url TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(1024);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS verification_documents_url TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS medical_council_reg_number VARCHAR(255);

-- 5. PHARMACIES TABLE UPDATES
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS operating_hours TEXT;


-- ==============================================================================

BEGIN;

-- 1. HOSPITALS TABLE
CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    pincode VARCHAR(20),
    phone_number VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS TABLE UPDATES
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- 3. PATIENTS TABLE UPDATES
ALTER TABLE patients ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_number VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(1024);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS government_id_url VARCHAR(1024);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_alerts TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS primary_physician_id UUID REFERENCES doctors(id);

-- 4. DOCTORS TABLE UPDATES
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS qualifications TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS clinic_name VARCHAR(255);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS clinic_address VARCHAR(500);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS clinic_phone VARCHAR(20);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS clinic_email VARCHAR(255);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS languages TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS consultation_hours TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS certificates_url TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS government_id_url VARCHAR(1024);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS professional_documents_url TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(1024);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS verification_documents_url TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS medical_council_reg_number VARCHAR(255);

-- 5. PHARMACIES TABLE UPDATES
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS operating_hours TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS owner_details TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS supporting_documents_url TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS logo_url VARCHAR(1024);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS verification_documents_url TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS branch_information TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS business_registration_number VARCHAR(255);

-- 6. BLOCKCHAIN SYNC STATE UPDATES
ALTER TABLE blockchain_sync_state ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE blockchain_sync_state ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;

COMMIT;

ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS pdf_url VARCHAR(1024);
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS qr_token TEXT;

-- ==============================================================================

-- PHASE 13: QR SECURITY & DOWNLOAD AUDIT

-- ==============================================================================

BEGIN;

-- Update prescriptions table
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN DEFAULT FALSE;

-- Update file_metadata table
ALTER TABLE file_metadata ADD COLUMN IF NOT EXISTS encrypted_filename VARCHAR(255);
ALTER TABLE file_metadata ADD COLUMN IF NOT EXISTS sha256_hash VARCHAR(64);
ALTER TABLE file_metadata ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id);
ALTER TABLE file_metadata ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;
ALTER TABLE file_metadata ADD COLUMN IF NOT EXISTS last_downloaded TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE file_metadata ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create qr_verification_logs table
CREATE TABLE IF NOT EXISTS qr_verification_logs (
    id UUID PRIMARY KEY,
    prescription_id UUID REFERENCES prescriptions(id),
    scanned_by UUID REFERENCES users(id),
    scanned_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create download_audit_logs table
CREATE TABLE IF NOT EXISTS download_audit_logs (
    id UUID PRIMARY KEY,
-- Create storage policies (Assuming files are prefixed with patient_id/)
CREATE POLICY "Patients can access their own records" ON storage.objects
  FOR SELECT USING (bucket_id = 'medical-records' AND auth.uid()::text = (storage.foldername(name))[1]);

COMMIT;


-- ==============================================================================

-- PHASE 12: UI/UX AUDIT & PROFILE COMPLETION ENGINE

-- ==============================================================================

BEGIN;

-- 1. HOSPITALS TABLE
CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    pincode VARCHAR(20),
    phone_number VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS TABLE UPDATES
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- 3. PATIENTS TABLE UPDATES
ALTER TABLE patients ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_number VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(1024);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS government_id_url VARCHAR(1024);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_alerts TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS primary_physician_id UUID REFERENCES doctors(id);

-- 4. DOCTORS TABLE UPDATES
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS qualifications TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS clinic_name VARCHAR(255);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS clinic_address VARCHAR(500);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS clinic_phone VARCHAR(20);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS clinic_email VARCHAR(255);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS languages TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS consultation_hours TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS certificates_url TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS government_id_url VARCHAR(1024);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS professional_documents_url TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(1024);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS verification_documents_url TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS medical_council_reg_number VARCHAR(255);

-- 5. PHARMACIES TABLE UPDATES
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS operating_hours TEXT;


-- ==============================================================================

BEGIN;

-- 1. HOSPITALS TABLE
CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    pincode VARCHAR(20),
    phone_number VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS TABLE UPDATES
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- 3. PATIENTS TABLE UPDATES
ALTER TABLE patients ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_number VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(1024);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS government_id_url VARCHAR(1024);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_alerts TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS primary_physician_id UUID REFERENCES doctors(id);

-- 4. DOCTORS TABLE UPDATES
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS qualifications TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS clinic_name VARCHAR(255);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS clinic_address VARCHAR(500);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS clinic_phone VARCHAR(20);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS clinic_email VARCHAR(255);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS languages TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS consultation_hours TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS certificates_url TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS government_id_url VARCHAR(1024);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS professional_documents_url TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(1024);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS verification_documents_url TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS medical_council_reg_number VARCHAR(255);

-- 5. PHARMACIES TABLE UPDATES
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS operating_hours TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS owner_details TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS supporting_documents_url TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS logo_url VARCHAR(1024);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS verification_documents_url TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS branch_information TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS business_registration_number VARCHAR(255);

-- 6. BLOCKCHAIN SYNC STATE UPDATES
ALTER TABLE blockchain_sync_state ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE blockchain_sync_state ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;

COMMIT;

ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS pdf_url VARCHAR(1024);
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS qr_token TEXT;

-- ==============================================================================

-- PHASE 13: QR SECURITY & DOWNLOAD AUDIT

-- ==============================================================================

BEGIN;

-- Update prescriptions table
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN DEFAULT FALSE;

-- Update file_metadata table
ALTER TABLE file_metadata ADD COLUMN IF NOT EXISTS encrypted_filename VARCHAR(255);
ALTER TABLE file_metadata ADD COLUMN IF NOT EXISTS sha256_hash VARCHAR(64);
ALTER TABLE file_metadata ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id);
ALTER TABLE file_metadata ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;
ALTER TABLE file_metadata ADD COLUMN IF NOT EXISTS last_downloaded TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE file_metadata ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create qr_verification_logs table
CREATE TABLE IF NOT EXISTS qr_verification_logs (
    id UUID PRIMARY KEY,
    prescription_id UUID REFERENCES prescriptions(id),
    scanned_by UUID REFERENCES users(id),
    scanned_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create download_audit_logs table
CREATE TABLE IF NOT EXISTS download_audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    ip_address VARCHAR(45),
    downloaded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMIT;

-- ==============================================================================
-- PHASE 14: DOCTOR APPROVALS AND IMAGE UPLOADS
-- ==============================================================================

BEGIN;

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS profile_image VARCHAR(1024);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(1024);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS image_uploaded_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS approval_notes TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS doctor_status VARCHAR(50) DEFAULT 'PENDING';

COMMIT;

-- ==============================================================================
-- PHASE 15: SIMULATED MEDICINE DELIVERY SYSTEM
-- ==============================================================================

BEGIN;

ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS delivery_started_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS delivery_completed_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS delivery_eta TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS delivery_progress INTEGER DEFAULT 0;
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS delivery_code_hash VARCHAR(255);
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS delivery_code_expiry TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS delivery_simulation TEXT; -- JSON
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS driver_name VARCHAR(255);
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS driver_avatar VARCHAR(1024);
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(100);
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(100);
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS delivery_speed INTEGER DEFAULT 40; -- km/h
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS current_latitude NUMERIC(10, 8);
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS current_longitude NUMERIC(11, 8);
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS start_latitude NUMERIC(10, 8);
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS start_longitude NUMERIC(11, 8);
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS end_latitude NUMERIC(10, 8);
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS end_longitude NUMERIC(11, 8);
-- Performance Indexes
CREATE INDEX IF NOT EXISTS ix_appointments_patient_id ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS ix_appointments_doctor_id ON appointments (doctor_id);
CREATE INDEX IF NOT EXISTS ix_appointments_status ON appointments (status);
CREATE INDEX IF NOT EXISTS ix_medical_records_patient_id ON medical_records (patient_id);
CREATE INDEX IF NOT EXISTS ix_medical_records_category_id ON medical_records (category_id);
CREATE INDEX IF NOT EXISTS ix_medicines_category_id ON medicines (category_id);
CREATE INDEX IF NOT EXISTS ix_prescriptions_patient_id ON prescriptions (patient_id);
CREATE INDEX IF NOT EXISTS ix_prescriptions_doctor_id ON prescriptions (doctor_id);
CREATE INDEX IF NOT EXISTS ix_prescriptions_status ON prescriptions (status);
CREATE INDEX IF NOT EXISTS ix_medicine_orders_patient_id ON medicine_orders (patient_id);
CREATE INDEX IF NOT EXISTS ix_medicine_orders_pharmacy_id ON medicine_orders (pharmacy_id);
CREATE INDEX IF NOT EXISTS ix_medicine_orders_status ON medicine_orders (status);
CREATE INDEX IF NOT EXISTS ix_delivery_tracking_order_id ON delivery_tracking (order_id);
CREATE INDEX IF NOT EXISTS ix_delivery_tracking_status ON delivery_tracking (status);
CREATE INDEX IF NOT EXISTS ix_blockchain_transactions_record_id ON blockchain_transactions (record_id);
CREATE INDEX IF NOT EXISTS ix_blockchain_transactions_status ON blockchain_transactions (status);

COMMIT;
