-- ==============================================================================
-- Migration: 08_OTP_function.sql
-- Description: Creates a secure table for storing 4-digit Delivery OTPs to confirm medicine deliveries.
-- ==============================================================================

BEGIN;

-- 1. Create delivery_otps table
CREATE TABLE IF NOT EXISTS delivery_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES medicine_orders(id) ON DELETE CASCADE,
    otp_code VARCHAR(4) NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (order_id)
);

-- 2. Enable Row Level Security
ALTER TABLE delivery_otps ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policy: Patients can view OTPs for their own orders
DROP POLICY IF EXISTS "Patients can view their own delivery OTPs" ON delivery_otps;
CREATE POLICY "Patients can view their own delivery OTPs"
ON delivery_otps FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM medicine_orders mo
        WHERE mo.id = delivery_otps.order_id
        AND mo.patient_id = auth.uid()
    )
);

-- 4. RLS Policy: Pharmacies can view and update OTPs for orders assigned to them
DROP POLICY IF EXISTS "Pharmacies can view assigned delivery OTPs" ON delivery_otps;
CREATE POLICY "Pharmacies can view assigned delivery OTPs"
ON delivery_otps FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM medicine_orders mo
        WHERE mo.id = delivery_otps.order_id
        AND mo.pharmacy_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Pharmacies can update assigned delivery OTPs" ON delivery_otps;
CREATE POLICY "Pharmacies can update assigned delivery OTPs"
ON delivery_otps FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM medicine_orders mo
        WHERE mo.id = delivery_otps.order_id
        AND mo.pharmacy_id = auth.uid()
    )
);

COMMIT;
