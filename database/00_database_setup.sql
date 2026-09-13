-- ==============================================================================
-- MEDSYNC COMPREHENSIVE DATABASE SETUP SCRIPT
-- ==============================================================================
-- This script configures the complete database schema, custom types, tables, 
-- performance indexes, RLS security policies, and an automatic user synchronization 
-- trigger linking Supabase Auth (auth.users) to application tables (public.users, etc.).
--
-- Can be executed safely in the Supabase SQL Editor.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. EXTENSIONS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ==============================================================================
-- 2. CUSTOM ENUM TYPES
-- ==============================================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
        CREATE TYPE userrole AS ENUM ('PATIENT', 'DOCTOR', 'PHARMACY', 'ADMIN');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userstatus') THEN
        CREATE TYPE userstatus AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'roletype') THEN
        CREATE TYPE roletype AS ENUM ('DOCTOR', 'PHARMACY');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verificationstatus') THEN
        CREATE TYPE verificationstatus AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blockchaintaskstatus') THEN
        CREATE TYPE blockchaintaskstatus AS ENUM ('PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED', 'RETRYING', 'CANCELLED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'paymentstatus') THEN
        CREATE TYPE paymentstatus AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'paymentmethod') THEN
        CREATE TYPE paymentmethod AS ENUM ('UPI', 'CARD', 'WALLET', 'COD', 'CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING', 'CASH');
    END IF;
END $$;

-- ==============================================================================
-- 3. CORE & RELATIONAL TABLES
-- ==============================================================================

-- Alembic Version Tracking
CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) PRIMARY KEY
);

-- Users (Central Identity & Profiles Table)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL DEFAULT 'supabase_managed',
    role userrole NOT NULL DEFAULT 'PATIENT',
    status userstatus NOT NULL DEFAULT 'ACTIVE',
    profile_completion_percentage INTEGER NOT NULL DEFAULT 0,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    cover_image_url VARCHAR(1024),
    bio TEXT,
    social_links JSONB,
    languages_spoken VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);
CREATE INDEX IF NOT EXISTS ix_users_status ON users(status);
CREATE INDEX IF NOT EXISTS ix_users_created_at ON users(created_at);

-- Hospitals Table
CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    google_maps_url VARCHAR(1024),
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    description TEXT,
    logo_url VARCHAR(1024),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Doctors Table
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255),
    license_number VARCHAR(255) UNIQUE,
    experience_years INTEGER NOT NULL DEFAULT 0,
    bio VARCHAR(1000),
    consultation_fee INTEGER NOT NULL DEFAULT 0,
    hospital_name VARCHAR(255),
    hospital_address VARCHAR(500),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
    qualifications TEXT,
    clinic_name VARCHAR(255),
    clinic_address VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    pincode VARCHAR(20),
    clinic_phone VARCHAR(20),
    clinic_email VARCHAR(255),
    languages TEXT,
    consultation_hours TEXT,
    consultation_timings JSONB,
    certificates_url TEXT,
    government_id_url VARCHAR(1024),
    professional_documents_url TEXT,
    profile_picture_url VARCHAR(1024),
    profile_image VARCHAR(1024),
    thumbnail VARCHAR(1024),
    verification_documents_url TEXT,
    medical_council_reg_number VARCHAR(255),
    image_uploaded_at TIMESTAMP WITHOUT TIME ZONE,
    approval_date TIMESTAMP WITHOUT TIME ZONE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approval_notes TEXT,
    doctor_status VARCHAR(50) DEFAULT 'PENDING',
    blockchain_status VARCHAR(50) DEFAULT 'PENDING',
    blockchain_tx_hash VARCHAR(66),
    verification_id VARCHAR(100),
    registered_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    date_of_birth VARCHAR(50),
    gender VARCHAR(50),
    blood_group VARCHAR(10),
    phone_number VARCHAR(20),
    contact_email VARCHAR(255),
    address VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    pincode VARCHAR(20),
    emergency_contact_name VARCHAR(255),
    emergency_contact_number VARCHAR(20),
    profile_picture_url VARCHAR(1024),
    government_id_url VARCHAR(1024),
    medical_alerts TEXT,
    allergies TEXT,
    primary_physician_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    chronic_diseases TEXT,
    blockchain_status VARCHAR(50) DEFAULT 'PENDING',
    blockchain_tx_hash VARCHAR(66),
    pin_hash VARCHAR(255),
    verification_id VARCHAR(100),
    registered_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Pharmacies Table
CREATE TABLE IF NOT EXISTS pharmacies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    license_number VARCHAR(255) UNIQUE,
    gst_number VARCHAR(255),
    address VARCHAR(500),
    contact_number VARCHAR(20),
    contact_email VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    pincode VARCHAR(20),
    description TEXT,
    operating_hours TEXT,
    working_days TEXT,
    location JSONB,
    owner_details TEXT,
    supporting_documents_url TEXT,
    logo_url VARCHAR(1024),
    verification_documents_url TEXT,
    branch_information TEXT,
    business_registration_number VARCHAR(255),
    is_24x7 BOOLEAN DEFAULT FALSE,
    blockchain_status VARCHAR(50) DEFAULT 'PENDING',
    blockchain_tx_hash VARCHAR(66),
    qr_identifier VARCHAR(255) UNIQUE,
    qr_status VARCHAR(50) DEFAULT 'ACTIVE',
    verification_id VARCHAR(100),
    registered_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Doctor Locations Table
CREATE TABLE IF NOT EXISTS doctor_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    location_type VARCHAR(30) NOT NULL DEFAULT 'HOSPITAL',
    location_name VARCHAR(255),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
    address VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    pincode VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    google_maps_url VARCHAR(1024),
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    working_days TEXT,
    consultation_hours TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    verification_status VARCHAR(30) DEFAULT 'PENDING',
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Pharmacy Locations Table
CREATE TABLE IF NOT EXISTS pharmacy_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    location_name VARCHAR(255),
    address VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    pincode VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    google_maps_url VARCHAR(1024),
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    operating_hours TEXT,
    working_days TEXT,
    delivery_available BOOLEAN DEFAULT FALSE,
    pickup_available BOOLEAN DEFAULT TRUE,
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    verification_status VARCHAR(30) DEFAULT 'PENDING',
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Doctor Availability Table
CREATE TABLE IF NOT EXISTS doctor_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Verification Requests Table
CREATE TABLE IF NOT EXISTS verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_type roletype NOT NULL,
    status verificationstatus NOT NULL DEFAULT 'PENDING',
    reviewer_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    review_date TIMESTAMP WITHOUT TIME ZONE,
    approval_date TIMESTAMP WITHOUT TIME ZONE,
    rejection_reason TEXT,
    blockchain_tx_hash VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_id UUID REFERENCES doctor_locations(id) ON DELETE SET NULL,
    appointment_date DATE NOT NULL,
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    cancelled_at TIMESTAMP WITHOUT TIME ZONE,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS ix_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS ix_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS ix_appointments_status ON appointments(status);

-- Appointment Status History Table
CREATE TABLE IF NOT EXISTS appointment_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Prescriptions Table
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL UNIQUE,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    diagnosis TEXT,
    notes TEXT,
    is_finalized BOOLEAN NOT NULL DEFAULT FALSE,
    is_dispensed BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by_pharmacy_id UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITHOUT TIME ZONE,
    verification_method VARCHAR(50),
    pdf_url VARCHAR(1024),
    qr_token TEXT,
    expires_at TIMESTAMP WITHOUT TIME ZONE,
    is_revoked BOOLEAN DEFAULT FALSE,
    blockchain_status VARCHAR(50) DEFAULT 'PENDING',
    blockchain_tx_hash VARCHAR(66),
    block_number INTEGER,
    hash VARCHAR(64),
    version INTEGER NOT NULL DEFAULT 1,
    registered_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS ix_prescriptions_doctor_id ON prescriptions(doctor_id);

-- Prescription Items Table
CREATE TABLE IF NOT EXISTS prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medicine_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration_days INTEGER NOT NULL,
    instructions TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Patient Security Credentials Table
CREATE TABLE IF NOT EXISTS patient_security_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    authorization_pin_hash VARCHAR(255) NOT NULL,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITHOUT TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Patient Biometric Profiles Table
CREATE TABLE IF NOT EXISTS patient_biometric_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    encrypted_template TEXT NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50),
    embedding_version VARCHAR(50),
    enrollment_status VARCHAR(50) DEFAULT 'COMPLETED',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Prescription Download Authorizations Table
CREATE TABLE IF NOT EXISTS prescription_download_authorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    authorization_reference VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    used_at TIMESTAMP WITHOUT TIME ZONE,
    password_verified BOOLEAN DEFAULT FALSE,
    pin_verified BOOLEAN DEFAULT FALSE,
    face_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_pda_patient_id ON prescription_download_authorizations(patient_id);
CREATE INDEX IF NOT EXISTS ix_pda_prescription_id ON prescription_download_authorizations(prescription_id);

-- Prescription Transfers Table
CREATE TABLE IF NOT EXISTS prescription_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transfer_request_id VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'CREATED',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    authorized_at TIMESTAMP WITHOUT TIME ZONE,
    delivered_at TIMESTAMP WITHOUT TIME ZONE,
    expires_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS ix_prescription_transfers_patient_id ON prescription_transfers(patient_id);
CREATE INDEX IF NOT EXISTS ix_prescription_transfers_pharmacy_id ON prescription_transfers(pharmacy_id);
CREATE INDEX IF NOT EXISTS ix_prescription_transfers_request_id ON prescription_transfers(transfer_request_id);

-- Prescription Dispensing Log Table
CREATE TABLE IF NOT EXISTS prescription_dispensing_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES users(id),
    patient_id UUID NOT NULL REFERENCES users(id),
    dispensed_by_name VARCHAR(255),
    dispensed_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    medicines_prescribed JSONB NOT NULL DEFAULT '[]'::jsonb,
    medicines_dispensed JSONB NOT NULL DEFAULT '[]'::jsonb,
    prescribed_count INTEGER NOT NULL DEFAULT 0,
    dispensed_count INTEGER NOT NULL DEFAULT 0,
    count_mismatch BOOLEAN NOT NULL DEFAULT FALSE,
    mismatch_details TEXT,
    patient_contact VARCHAR(50),
    pharmacy_contact VARCHAR(50),
    verification_method VARCHAR(50) DEFAULT 'QR_OFFLINE',
    verified_at TIMESTAMP WITHOUT TIME ZONE,
    notes TEXT,
    blockchain_tx_hash VARCHAR(66),
    blockchain_status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_dispensing_log_prescription ON prescription_dispensing_log(prescription_id);
CREATE INDEX IF NOT EXISTS ix_dispensing_log_pharmacy ON prescription_dispensing_log(pharmacy_id);
CREATE INDEX IF NOT EXISTS ix_dispensing_log_patient ON prescription_dispensing_log(patient_id);
CREATE INDEX IF NOT EXISTS ix_dispensing_log_dispensed_at ON prescription_dispensing_log(dispensed_at);



-- Consultations Table
CREATE TABLE IF NOT EXISTS consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE UNIQUE,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symptoms TEXT,
    observations TEXT,
    diagnosis TEXT,
    treatment_plan TEXT,
    clinical_notes TEXT,
    follow_up_date DATE,
    follow_up_notes TEXT,
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_consultations_patient_id ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS ix_consultations_doctor_id ON consultations(doctor_id);

-- Medical Record Categories Table
CREATE TABLE IF NOT EXISTS medical_record_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Medical Record Tags Table
CREATE TABLE IF NOT EXISTS medical_record_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Medical Records Table
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES medical_record_categories(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS ix_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS ix_medical_records_category_id ON medical_records(category_id);

-- Medical Record Tag Mappings Table
CREATE TABLE IF NOT EXISTS medical_record_tag_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES medical_record_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Medical Record Versions Table
CREATE TABLE IF NOT EXISTS medical_record_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    ipfs_cid VARCHAR(255) NOT NULL UNIQUE,
    file_type VARCHAR(50) NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    change_description TEXT,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    blockchain_status VARCHAR(50) DEFAULT 'PENDING',
    blockchain_tx_hash VARCHAR(255),
    block_number INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- File Metadata Table
CREATE TABLE IF NOT EXISTS file_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL UNIQUE REFERENCES medical_record_versions(id) ON DELETE CASCADE,
    supabase_storage_path VARCHAR(500),
    mime_type VARCHAR(100),
    encrypted_filename VARCHAR(255),
    sha256_hash VARCHAR(64),
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    download_count INTEGER DEFAULT 0,
    last_downloaded TIMESTAMP WITHOUT TIME ZONE,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Record Permissions Table
CREATE TABLE IF NOT EXISTS record_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    granted_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_level VARCHAR(50) NOT NULL DEFAULT 'READ',
    expires_at TIMESTAMP WITHOUT TIME ZONE,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Doctor Notes Table
CREATE TABLE IF NOT EXISTS doctor_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES medical_record_versions(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- AI Analyses Table
CREATE TABLE IF NOT EXISTS ai_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES medical_record_versions(id) ON DELETE CASCADE,
    model_name VARCHAR(100) NOT NULL,
    analysis_status VARCHAR(50) NOT NULL,
    summary TEXT,
    confidence_score FLOAT,
    processing_time_ms INTEGER,
    scan_type VARCHAR(50),
    prediction_label VARCHAR(255),
    findings JSONB DEFAULT '[]'::jsonb,
    clinical_considerations JSONB DEFAULT '[]'::jsonb,
    medication_considerations JSONB DEFAULT '[]'::jsonb,
    procedure_considerations JSONB DEFAULT '[]'::jsonb,
    warnings JSONB DEFAULT '[]'::jsonb,
    patient_explanation JSONB,
    doctor_review_status VARCHAR(50) DEFAULT 'PENDING',
    doctor_review_notes TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITHOUT TIME ZONE,
    patient_id UUID REFERENCES users(id) ON DELETE SET NULL,
    blockchain_status VARCHAR(50) DEFAULT 'PENDING',
    blockchain_tx_hash VARCHAR(66),
    inference_hash VARCHAR(66),
    verification_metadata JSONB,
    block_number INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ai_analyses_doctor_review ON ai_analyses(doctor_review_status);
CREATE INDEX IF NOT EXISTS ix_ai_analyses_patient_id ON ai_analyses(patient_id);
CREATE INDEX IF NOT EXISTS ix_ai_analyses_scan_type ON ai_analyses(scan_type);

-- OCR Results Table
CREATE TABLE IF NOT EXISTS ocr_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL UNIQUE REFERENCES medical_record_versions(id) ON DELETE CASCADE,
    extracted_text TEXT,
    confidence FLOAT,
    detected_fields JSONB,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Medical History Shares Table
CREATE TABLE IF NOT EXISTS medical_history_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
    shared_records JSONB,
    access_scope VARCHAR(50) DEFAULT 'CONSULTATION',
    expires_at TIMESTAMP WITHOUT TIME ZONE,
    revoked_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Consent History Table
CREATE TABLE IF NOT EXISTS consent_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    blockchain_tx_hash VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Medicine Categories Table
CREATE TABLE IF NOT EXISTS medicine_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Medicines Table
CREATE TABLE IF NOT EXISTS medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    brand_name VARCHAR(255),
    category_id UUID NOT NULL REFERENCES medicine_categories(id) ON DELETE RESTRICT,
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
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_medicines_category_id ON medicines(category_id);

-- Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone_number VARCHAR(20),
    address TEXT,
    license_number VARCHAR(100),
    gst_number VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Medicine Inventory Table
CREATE TABLE IF NOT EXISTS medicine_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    batch_number VARCHAR(100) NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    minimum_stock INTEGER DEFAULT 10,
    maximum_stock INTEGER DEFAULT 1000,
    unit_price FLOAT NOT NULL,
    purchase_price FLOAT,
    selling_price FLOAT,
    gst FLOAT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Medicine Orders Table
CREATE TABLE IF NOT EXISTS medicine_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    total_amount FLOAT NOT NULL,
    delivery_address TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_medicine_orders_patient_id ON medicine_orders(patient_id);
CREATE INDEX IF NOT EXISTS ix_medicine_orders_pharmacy_id ON medicine_orders(pharmacy_id);
CREATE INDEX IF NOT EXISTS ix_medicine_orders_status ON medicine_orders(status);

-- Medicine Order Items Table
CREATE TABLE IF NOT EXISTS medicine_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES medicine_orders(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES medicine_inventory(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    price_at_purchase FLOAT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Delivery Tracking Table
CREATE TABLE IF NOT EXISTS delivery_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES medicine_orders(id) ON DELETE CASCADE,
    tracking_number VARCHAR(255) NOT NULL UNIQUE,
    current_status VARCHAR(100) NOT NULL DEFAULT 'ORDER_PLACED',
    delivery_partner VARCHAR(255),
    estimated_delivery DATE,
    notes TEXT,
    delivery_started_at TIMESTAMP WITHOUT TIME ZONE,
    delivery_completed_at TIMESTAMP WITHOUT TIME ZONE,
    delivery_eta TIMESTAMP WITHOUT TIME ZONE,
    delivery_progress INTEGER DEFAULT 0,
    delivery_code_hash VARCHAR(255),
    delivery_code_expiry TIMESTAMP WITHOUT TIME ZONE,
    delivery_simulation TEXT,
    driver_name VARCHAR(255),
    driver_avatar VARCHAR(1024),
    vehicle_number VARCHAR(100),
    vehicle_type VARCHAR(100),
    delivery_speed INTEGER DEFAULT 40,
    current_latitude NUMERIC(10, 8),
    current_longitude NUMERIC(11, 8),
    start_latitude NUMERIC(10, 8),
    start_longitude NUMERIC(11, 8),
    end_latitude NUMERIC(10, 8),
    end_longitude NUMERIC(11, 8),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_delivery_tracking_order_id ON delivery_tracking(order_id);
CREATE INDEX IF NOT EXISTS ix_delivery_tracking_status ON delivery_tracking(current_status);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES medicine_orders(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    amount FLOAT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    method VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
    invoice_number VARCHAR(255) NOT NULL UNIQUE,
    invoice_url VARCHAR(500),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'INFO',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- QR Authorization Tokens Table
CREATE TABLE IF NOT EXISTS qr_authorization_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash VARCHAR(64) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
    order_id UUID REFERENCES medicine_orders(id) ON DELETE SET NULL,
    pharmacy_id UUID REFERENCES users(id) ON DELETE CASCADE,
    delivery_id UUID,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    max_uses INTEGER DEFAULT 1,
    use_count INTEGER DEFAULT 0,
    created_ip VARCHAR(45),
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    used_at TIMESTAMP WITHOUT TIME ZONE,
    revoked_at TIMESTAMP WITHOUT TIME ZONE,
    verified_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_qr_auth_tokens_token_hash ON qr_authorization_tokens(token_hash);
CREATE INDEX IF NOT EXISTS ix_qr_auth_tokens_status ON qr_authorization_tokens(status);

-- QR Verification Logs Table
CREATE TABLE IF NOT EXISTS qr_verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
    scanned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    scanned_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Download Audit Logs Table
CREATE TABLE IF NOT EXISTS download_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_download_audit_logs_user_id ON download_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS ix_download_audit_logs_entity ON download_audit_logs(entity_type, entity_id);

-- General Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- API Request Logs Table
CREATE TABLE IF NOT EXISTS api_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
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

-- Blockchain Transactions Table
CREATE TABLE IF NOT EXISTS blockchain_transactions (
    transaction_hash VARCHAR(66) PRIMARY KEY,
    block_number INTEGER,
    block_timestamp TIMESTAMP WITHOUT TIME ZONE,
    gas_used INTEGER,
    gas_price VARCHAR(50),
    contract_address VARCHAR(42),
    contract_name VARCHAR(100),
    contract_version VARCHAR(20),
    network VARCHAR(50) NOT NULL DEFAULT 'polygon-amoy',
    chain_id INTEGER,
    confirmation_count INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    wallet_address VARCHAR(42),
    failure_reason TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_blockchain_transactions_status ON blockchain_transactions(status);

-- Blockchain Sync Tasks Table
CREATE TABLE IF NOT EXISTS blockchain_sync_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    transaction_hash VARCHAR(66) REFERENCES blockchain_transactions(transaction_hash) ON DELETE SET NULL,
    payload JSONB,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 5,
    next_retry_time TIMESTAMP WITHOUT TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_blockchain_sync_tasks_status ON blockchain_sync_tasks(status);
CREATE INDEX IF NOT EXISTS ix_blockchain_sync_tasks_entity ON blockchain_sync_tasks(entity_type, entity_id);

-- Blockchain Audit Logs Table
CREATE TABLE IF NOT EXISTS blockchain_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    transaction_hash VARCHAR(66) REFERENCES blockchain_transactions(transaction_hash) ON DELETE SET NULL,
    block_number INTEGER,
    contract_address VARCHAR(42),
    caller_address VARCHAR(42),
    event_data JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_blockchain_audit_logs_entity ON blockchain_audit_logs(entity_type, entity_id);

-- Blockchain Event Queue Table
CREATE TABLE IF NOT EXISTS blockchain_event_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(100) NOT NULL,
    contract_name VARCHAR(100) NOT NULL,
    contract_address VARCHAR(42) NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    block_number INTEGER NOT NULL,
    log_index INTEGER NOT NULL,
    event_data JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 5,
    next_retry_time TIMESTAMP WITHOUT TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(transaction_hash, log_index)
);

CREATE INDEX IF NOT EXISTS ix_blockchain_event_queue_status ON blockchain_event_queue(status);

-- Blockchain Sync State Table
CREATE TABLE IF NOT EXISTS blockchain_sync_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_name VARCHAR(100) NOT NULL UNIQUE,
    last_processed_block INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- RAG Knowledge Documents Table
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    source VARCHAR(255),
    file_name VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'UPLOADING',
    error_message TEXT,
    metadata_json JSONB,
    owner_type VARCHAR(50) NOT NULL DEFAULT 'system',
    owner_id UUID,
    visibility VARCHAR(50) NOT NULL DEFAULT 'internal',
    classification VARCHAR(50) NOT NULL DEFAULT 'internal',
    allowed_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_knowledge_documents_created_by ON knowledge_documents(created_by);
CREATE INDEX IF NOT EXISTS ix_knowledge_documents_status ON knowledge_documents(status);
CREATE INDEX IF NOT EXISTS ix_knowledge_documents_owner ON knowledge_documents(owner_type, owner_id);

-- Admin AI Audit Logs Table
CREATE TABLE IF NOT EXISTS admin_ai_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    fields_accessed JSONB,
    details TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_admin_ai_audit_logs_admin_id ON admin_ai_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS ix_admin_ai_audit_logs_action ON admin_ai_audit_logs(action);

-- RAG Knowledge Chunks Table
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(384),
    token_count INTEGER,
    metadata_json JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_knowledge_chunks_document_id ON knowledge_chunks(document_id);

-- ==============================================================================
-- 4. AUTOMATIC SUPABASE AUTH SYNCHRONIZATION TRIGGER
-- ==============================================================================
-- Automatically populates public.users and role-specific profile tables 
-- (patients, doctors, pharmacies, admins) whenever a user registers in auth.users.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
    user_role public.userrole;
    user_full_name TEXT;
    extracted_role TEXT;
BEGIN
    -- Extract role string safely
    extracted_role := COALESCE(
        NEW.raw_user_meta_data->>'role',
        NEW.raw_app_meta_data->>'role',
        'PATIENT'
    );

    -- Cast or map role
    IF UPPER(extracted_role) IN ('PATIENT', 'DOCTOR', 'PHARMACY', 'ADMIN') THEN
        user_role := UPPER(extracted_role)::public.userrole;
    ELSE
        user_role := 'PATIENT'::public.userrole;
    END IF;

    -- Extract full name
    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );

    -- Insert into public.users
    INSERT INTO public.users (
        id, 
        email, 
        password_hash, 
        role, 
        status, 
        is_verified, 
        profile_completion_percentage,
        created_at, 
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        'supabase_managed',
        user_role,
        CASE WHEN user_role = 'PATIENT' THEN 'ACTIVE'::public.userstatus ELSE 'PENDING'::public.userstatus END,
        CASE WHEN user_role = 'PATIENT' THEN TRUE ELSE FALSE END,
        CASE WHEN user_role = 'PATIENT' THEN 80 ELSE 40 END,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();

    -- Create role-specific profile record
    IF user_role = 'PATIENT' THEN
        INSERT INTO public.patients (id, user_id, full_name, created_at, updated_at)
        VALUES (gen_random_uuid(), NEW.id, user_full_name, NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING;
    ELSIF user_role = 'DOCTOR' THEN
        INSERT INTO public.doctors (
            id, user_id, full_name, 
            license_number,
            hospital_name,
            hospital_address,
            experience_years, 
            consultation_fee, 
            doctor_status,
            created_at, 
            updated_at
        )
        VALUES (
            gen_random_uuid(), 
            NEW.id, 
            user_full_name,
            COALESCE(NEW.raw_user_meta_data->>'license_number', 'LIC-' || substr(NEW.id::text, 1, 8) || '-' || substr(NEW.id::text, 32, 5)),
            NEW.raw_user_meta_data->>'hospital_name',
            NEW.raw_user_meta_data->>'hospital_address',
            1, 
            500, 
            'PENDING',
            NOW(), 
            NOW()
        )
        ON CONFLICT (user_id) DO NOTHING;

        -- Create verification request
        INSERT INTO public.verification_requests (id, user_id, role_type, status, created_at, updated_at)
        VALUES (gen_random_uuid(), NEW.id, 'DOCTOR'::public.roletype, 'PENDING'::public.verificationstatus, NOW(), NOW())
        ON CONFLICT DO NOTHING;
    ELSIF user_role = 'PHARMACY' THEN
        INSERT INTO public.pharmacies (
            id, user_id, business_name, 
            license_number, 
            contact_number, 
            created_at, 
            updated_at
        )
        VALUES (
            gen_random_uuid(), 
            NEW.id, 
            COALESCE(NEW.raw_user_meta_data->>'business_name', user_full_name),
            COALESCE(NEW.raw_user_meta_data->>'license_number', 'LIC-PHM-' || substr(NEW.id::text, 1, 8) || '-' || substr(NEW.id::text, 32, 5)),
            NEW.raw_user_meta_data->>'contact_number',
            NOW(), 
            NOW()
        )
        ON CONFLICT (user_id) DO NOTHING;

        -- Create verification request
        INSERT INTO public.verification_requests (id, user_id, role_type, status, created_at, updated_at)
        VALUES (gen_random_uuid(), NEW.id, 'PHARMACY'::public.roletype, 'PENDING'::public.verificationstatus, NOW(), NOW())
        ON CONFLICT DO NOTHING;
    ELSIF user_role = 'ADMIN' THEN
        INSERT INTO public.admins (id, user_id, full_name, department, created_at, updated_at)
        VALUES (gen_random_uuid(), NEW.id, user_full_name, 'Administration', NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- Drop and recreate the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 5. HELPER SECURITY FUNCTIONS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.current_supabase_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
    SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_supabase_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        NULLIF(lower(auth.jwt() -> 'app_metadata' ->> 'role'), ''),
        NULLIF(lower(auth.jwt() -> 'user_metadata' ->> 'role'), ''),
        NULLIF(lower(auth.role()), '')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_medsync_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT public.current_supabase_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.can_access_medical_record(record_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        public.is_medsync_admin()
        OR EXISTS (
            SELECT 1
            FROM public.medical_records mr
            WHERE mr.id = record_uuid
            AND (
                mr.patient_id = public.current_supabase_user_id()
                OR mr.uploaded_by = public.current_supabase_user_id()
                OR EXISTS (
                    SELECT 1
                    FROM public.record_permissions rp
                    WHERE rp.record_id = record_uuid
                    AND rp.granted_to = public.current_supabase_user_id()
                    AND rp.is_revoked = FALSE
                    AND (rp.expires_at IS NULL OR rp.expires_at > NOW())
                )
            )
        );
$$;

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES & GRANTS
-- ==============================================================================

-- Base schema grants
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;


ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_record_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_authorization_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_history_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- Clean existing policies for idempotency
DROP POLICY IF EXISTS "Allow authenticated read users" ON users;
DROP POLICY IF EXISTS "Users can update own user record" ON users;
DROP POLICY IF EXISTS "Allow authenticated read patients" ON patients;
DROP POLICY IF EXISTS "Patients can update own profile" ON patients;
DROP POLICY IF EXISTS "Allow read doctors" ON doctors;
DROP POLICY IF EXISTS "Doctors can update own profile" ON doctors;
DROP POLICY IF EXISTS "Allow read pharmacies" ON pharmacies;
DROP POLICY IF EXISTS "Pharmacies can update own profile" ON pharmacies;
DROP POLICY IF EXISTS "Allow read admins" ON admins;
DROP POLICY IF EXISTS "Allow read hospitals" ON hospitals;
DROP POLICY IF EXISTS "Users can view their appointments" ON appointments;
DROP POLICY IF EXISTS "Patients can create appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update their appointments" ON appointments;
DROP POLICY IF EXISTS "Users can view their prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Doctors can manage prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Users can view prescription items" ON prescription_items;
DROP POLICY IF EXISTS "Users can access their medical records" ON medical_records;
DROP POLICY IF EXISTS "Users can insert their medical records" ON medical_records;
DROP POLICY IF EXISTS "Users can view versions of accessible records" ON medical_record_versions;
DROP POLICY IF EXISTS "Allow read medicine categories" ON medicine_categories;
DROP POLICY IF EXISTS "Allow read medicines" ON medicines;
DROP POLICY IF EXISTS "Allow read medicine inventory" ON medicine_inventory;
DROP POLICY IF EXISTS "Users can view their orders" ON medicine_orders;
DROP POLICY IF EXISTS "Patients can create orders" ON medicine_orders;
DROP POLICY IF EXISTS "Users can view their consultations" ON consultations;
DROP POLICY IF EXISTS "Patients can view their own QR tokens" ON qr_authorization_tokens;
DROP POLICY IF EXISTS "Pharmacies can view QR tokens for them" ON qr_authorization_tokens;
DROP POLICY IF EXISTS "Users can read ready knowledge documents" ON knowledge_documents;
DROP POLICY IF EXISTS "Users can read knowledge chunks" ON knowledge_chunks;

-- Users policies
CREATE POLICY "Allow authenticated read users" ON users
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own user record" ON users
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Patients policies
CREATE POLICY "Allow authenticated read patients" ON patients
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Patients can update own profile" ON patients
    FOR UPDATE USING (auth.uid() = user_id);

-- Doctors policies
CREATE POLICY "Allow read doctors" ON doctors
    FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Doctors can update own profile" ON doctors
    FOR UPDATE USING (auth.uid() = user_id);

-- Pharmacies policies
CREATE POLICY "Allow read pharmacies" ON pharmacies
    FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Pharmacies can update own profile" ON pharmacies
    FOR UPDATE USING (auth.uid() = user_id);

-- Admins & Hospitals policies
CREATE POLICY "Allow read admins" ON admins
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read hospitals" ON hospitals
    FOR SELECT TO authenticated, anon USING (true);

-- Appointments policies
CREATE POLICY "Users can view their appointments" ON appointments
    FOR SELECT USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

CREATE POLICY "Patients can create appointments" ON appointments
    FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Users can update their appointments" ON appointments
    FOR UPDATE USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

-- Prescriptions policies
CREATE POLICY "Users can view their prescriptions" ON prescriptions
    FOR SELECT USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

CREATE POLICY "Doctors can manage prescriptions" ON prescriptions
    FOR ALL USING (auth.uid() = doctor_id);

CREATE POLICY "Users can view prescription items" ON prescription_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM prescriptions p 
            WHERE p.id = prescription_items.prescription_id 
            AND (p.patient_id = auth.uid() OR p.doctor_id = auth.uid())
        )
    );

-- Medical Records policies
CREATE POLICY "Users can access their medical records" ON medical_records
    FOR SELECT USING (public.can_access_medical_record(id));

CREATE POLICY "Users can insert their medical records" ON medical_records
    FOR INSERT WITH CHECK (
        public.is_medsync_admin() 
        OR patient_id = public.current_supabase_user_id() 
        OR uploaded_by = public.current_supabase_user_id()
    );

CREATE POLICY "Users can view versions of accessible records" ON medical_record_versions
    FOR SELECT USING (public.can_access_medical_record(record_id));

-- Catalog & Inventory policies
CREATE POLICY "Allow read medicine categories" ON medicine_categories
    FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Allow read medicines" ON medicines
    FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Allow read medicine inventory" ON medicine_inventory
    FOR SELECT TO authenticated, anon USING (true);

-- Medicine Orders policies
CREATE POLICY "Users can view their orders" ON medicine_orders
    FOR SELECT USING (auth.uid() = patient_id OR auth.uid() = pharmacy_id);

CREATE POLICY "Patients can create orders" ON medicine_orders
    FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- Consultations policies
CREATE POLICY "Users can view their consultations" ON consultations
    FOR SELECT USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

-- QR Tokens policies
CREATE POLICY "Patients can view their own QR tokens" ON qr_authorization_tokens
    FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Pharmacies can view QR tokens for them" ON qr_authorization_tokens
    FOR SELECT USING (auth.uid() = pharmacy_id);

-- RAG Knowledge policies
CREATE POLICY "Users can read ready knowledge documents" ON knowledge_documents
    FOR SELECT USING (status = 'READY' OR created_by = auth.uid());

CREATE POLICY "Users can read knowledge chunks" ON knowledge_chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM knowledge_documents kd
            WHERE kd.id = knowledge_chunks.document_id
            AND (kd.status = 'READY' OR kd.created_by = auth.uid())
        )
    );

-- ==============================================================================
-- 7. AI PULSE CHAT TABLES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT 'New Conversation',
    is_doctor_mode BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ai_chat_sessions_user_id ON ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS ix_ai_chat_sessions_patient_id ON ai_chat_sessions(patient_id);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    model_used VARCHAR(100),
    inference_time_ms INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ai_chat_messages_session_id ON ai_chat_messages(session_id);

-- ==============================================================================
-- 8. RECORD ALEMBIC MIGRATION BASELINE
-- ==============================================================================
INSERT INTO alembic_version (version_num) 
VALUES ('ec15d6e1c21e')
ON CONFLICT (version_num) DO NOTHING;

-- ==============================================================================
-- 9. ADDITIONAL PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_status ON appointments(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_status ON appointments(doctor_id, status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_uploaded_by ON medical_records(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_id ON ai_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_status ON blockchain_transactions(status);
CREATE INDEX IF NOT EXISTS idx_blockchain_event_queue_status ON blockchain_event_queue(status);
CREATE INDEX IF NOT EXISTS idx_blockchain_event_queue_status_created ON blockchain_event_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_blockchain_audit_logs_entity_id ON blockchain_audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_sync_tasks_status ON blockchain_sync_tasks(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON verification_requests(user_id);

COMMIT;
