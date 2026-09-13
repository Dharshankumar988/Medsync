-- ==============================================================================
-- STORAGE RLS POLICIES FOR 'prescriptions' BUCKET
-- ==============================================================================

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('prescriptions', 'prescriptions', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
-- (Commented out: In Supabase, this is already enabled by default and throws a permissions error if run by non-owner)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Patients can upload to their own folder
-- Assuming folder structure is `[user_id]/filename.pdf`
DROP POLICY IF EXISTS "Patients can upload own prescriptions" ON storage.objects;
CREATE POLICY "Patients can upload own prescriptions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'prescriptions' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Policy: Patients can view their own prescriptions
DROP POLICY IF EXISTS "Patients can view own prescriptions" ON storage.objects;
CREATE POLICY "Patients can view own prescriptions"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'prescriptions' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Policy: Doctors can view prescriptions they created or are linked to
DROP POLICY IF EXISTS "Doctors can view linked prescriptions" ON storage.objects;
CREATE POLICY "Doctors can view linked prescriptions"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'prescriptions' 
    AND EXISTS (
        SELECT 1 FROM public.prescriptions p
        WHERE p.pdf_url = storage.objects.name
        AND p.doctor_id = auth.uid()
    )
);

-- 5. Policy: Pharmacies can view prescriptions linked to them
DROP POLICY IF EXISTS "Pharmacies can view linked prescriptions" ON storage.objects;
CREATE POLICY "Pharmacies can view linked prescriptions"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'prescriptions' 
    AND EXISTS (
        SELECT 1 FROM public.prescriptions p
        LEFT JOIN public.prescription_transfers pt ON p.id = pt.prescription_id
        WHERE p.pdf_url = storage.objects.name
        AND (p.verified_by_pharmacy_id = auth.uid() OR pt.pharmacy_id = auth.uid())
    )
);

-- 6. Policy: Patients can update/delete their own prescriptions
DROP POLICY IF EXISTS "Patients can update own prescriptions" ON storage.objects;
CREATE POLICY "Patients can update own prescriptions"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'prescriptions' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Patients can delete own prescriptions" ON storage.objects;
CREATE POLICY "Patients can delete own prescriptions"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'prescriptions' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);
