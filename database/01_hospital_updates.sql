-- Add HOSPITAL role to userrole ENUM
ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'HOSPITAL';

-- Add user_id to hospitals table
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE;

-- Update the handle_new_user trigger function to handle HOSPITAL role
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, role, is_verified, password_hash)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'role')::userrole, 'PATIENT'::userrole),
        FALSE,
        'supabase_managed'
    );

    IF (NEW.raw_user_meta_data->>'role') = 'PATIENT' THEN
        INSERT INTO public.patients (user_id, full_name, contact_email)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Patient'),
            NEW.email
        );
    ELSIF (NEW.raw_user_meta_data->>'role') = 'DOCTOR' THEN
        INSERT INTO public.doctors (
            user_id, 
            full_name, 
            license_number, 
            hospital_id,
            hospital_name,
            hospital_address,
            clinic_name,
            clinic_address,
            latitude,
            longitude
        )
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Doctor'),
            NEW.raw_user_meta_data->>'license_number',
            NULLIF(NEW.raw_user_meta_data->>'hospital_id', '')::UUID,
            NEW.raw_user_meta_data->>'hospital_name',
            NEW.raw_user_meta_data->>'hospital_address',
            NEW.raw_user_meta_data->>'clinic_name',
            NEW.raw_user_meta_data->>'clinic_address',
            NULLIF(NEW.raw_user_meta_data->>'latitude', '')::NUMERIC,
            NULLIF(NEW.raw_user_meta_data->>'longitude', '')::NUMERIC
        );
    ELSIF (NEW.raw_user_meta_data->>'role') = 'PHARMACY' THEN
        INSERT INTO public.pharmacies (user_id, business_name, license_number, contact_number)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'business_name', 'New Pharmacy'),
            NEW.raw_user_meta_data->>'license_number',
            NEW.raw_user_meta_data->>'contact_number'
        );
    ELSIF (NEW.raw_user_meta_data->>'role') = 'HOSPITAL' THEN
        INSERT INTO public.hospitals (user_id, name, address)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Hospital'),
            COALESCE(NEW.raw_user_meta_data->>'hospital_address', 'Pending Address')
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
