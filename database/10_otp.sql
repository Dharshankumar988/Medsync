-- 10_otp.sql
-- Non-destructive database migration for OTP verification, login guard, and role-based lifecycle management.

-- 1. Create otp_verifications table for robust persistence of OTPs
CREATE TABLE IF NOT EXISTS public.otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    otp_code_hash VARCHAR(255) NOT NULL,
    purpose VARCHAR(50) NOT NULL, -- 'EMAIL_VERIFY' or 'PASSWORD_RESET'
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    consumed_at TIMESTAMP WITHOUT TIME ZONE,
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Indexes for high-throughput lookup and expiry filtering
CREATE INDEX IF NOT EXISTS idx_otp_email_purpose ON public.otp_verifications (email, purpose);
CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON public.otp_verifications (expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_email_created_at ON public.otp_verifications (email, created_at DESC);

-- 3. Ensure users table has indexes for rapid login verification guards
CREATE INDEX IF NOT EXISTS idx_users_role_status ON public.users (role, status);
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON public.users (lower(email));

-- 4. Enable RLS and setup permissive service policies on otp_verifications
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'otp_verifications' 
        AND policyname = 'service_role_all_otp_verifications'
    ) THEN
        CREATE POLICY service_role_all_otp_verifications ON public.otp_verifications
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
