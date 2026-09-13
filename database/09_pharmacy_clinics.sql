-- ==============================================================================
-- ADD CLINIC/HOSPITAL FIELDS TO PHARMACIES
-- ==============================================================================

ALTER TABLE public.pharmacies
ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS clinic_name VARCHAR(255);

-- Create an index on hospital_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_pharmacies_hospital_id ON public.pharmacies(hospital_id);
