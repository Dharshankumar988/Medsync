-- 09_patient_vitals_and_collaboration.sql
-- Non-destructive, safe migration adding patient vitals, public/private consent persistence, collaboration, and clinic pharmacy affiliations.

-- 1. Add vitals columns to patients table
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS height_cm NUMERIC(6, 2);
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(6, 2);

-- 2. Add is_public column to medical_records and consultations for permanent consent management
ALTER TABLE public.medical_records ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Ensure record_permissions allows system/public grants without FK violations
ALTER TABLE public.record_permissions ALTER COLUMN granted_to DROP NOT NULL;

-- 4. Create record_requests table (for doctor-to-doctor / patient record access requests)
CREATE TABLE IF NOT EXISTS public.record_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    requesting_doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    target_doctor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    record_id UUID REFERENCES public.medical_records(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. Create doctor_referrals table (for doctor referring a patient to another specialist)
CREATE TABLE IF NOT EXISTS public.doctor_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    referring_doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    referred_to_doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    specialization VARCHAR(255),
    reason TEXT NOT NULL,
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- 6. Create doctor_pharmacy_affiliations table (linking clinic/hospital pharmacies)
CREATE TABLE IF NOT EXISTS public.doctor_pharmacy_affiliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    clinic_name VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_doctor_pharmacy UNIQUE (doctor_id, pharmacy_id)
);

-- 7. Performance indexes
CREATE INDEX IF NOT EXISTS idx_record_requests_requesting_doctor ON public.record_requests(requesting_doctor_id);
CREATE INDEX IF NOT EXISTS idx_record_requests_target_doctor ON public.record_requests(target_doctor_id);
CREATE INDEX IF NOT EXISTS idx_record_requests_patient ON public.record_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_referrals_referring ON public.doctor_referrals(referring_doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_referrals_referred_to ON public.doctor_referrals(referred_to_doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_referrals_patient ON public.doctor_referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_pharmacy_doctor ON public.doctor_pharmacy_affiliations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_pharmacy_pharmacy ON public.doctor_pharmacy_affiliations(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_is_public ON public.medical_records(is_public);
CREATE INDEX IF NOT EXISTS idx_consultations_is_public ON public.consultations(is_public);

-- 8. Enable Row Level Security (RLS) safely
ALTER TABLE public.record_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_pharmacy_affiliations ENABLE ROW LEVEL SECURITY;

-- 9. Add idempotent RLS policies
DROP POLICY IF EXISTS "Users can view their record requests" ON public.record_requests;
CREATE POLICY "Users can view their record requests" ON public.record_requests
    FOR ALL USING (
        auth.uid() = requesting_doctor_id OR
        auth.uid() = target_doctor_id OR
        auth.uid() = patient_id OR
        EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can view their referrals" ON public.doctor_referrals;
CREATE POLICY "Users can view their referrals" ON public.doctor_referrals
    FOR ALL USING (
        auth.uid() = referring_doctor_id OR
        auth.uid() = referred_to_doctor_id OR
        auth.uid() = patient_id OR
        EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Doctors and pharmacies view affiliations" ON public.doctor_pharmacy_affiliations;
CREATE POLICY "Doctors and pharmacies view affiliations" ON public.doctor_pharmacy_affiliations
    FOR ALL USING (
        auth.uid() = doctor_id OR
        auth.uid() = pharmacy_id OR
        EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid())
    );
