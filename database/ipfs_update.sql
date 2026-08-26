-- ==============================================================================
-- MEDSYNC IPFS ADDITIVE MIGRATION SCRIPT
-- ==============================================================================
-- This script adds necessary IPFS metadata columns to existing tables.
-- It preserves all existing data, tables, constraints, and RLS.
-- ==============================================================================

BEGIN;

-- Add IPFS metadata to medical_record_versions (ipfs_cid already exists)
ALTER TABLE medical_record_versions 
ADD COLUMN IF NOT EXISTS ipfs_provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS ipfs_pin_status VARCHAR(50);

-- Add IPFS metadata to prescriptions
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS ipfs_cid VARCHAR(255),
ADD COLUMN IF NOT EXISTS ipfs_provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS ipfs_pin_status VARCHAR(50);

COMMIT;
