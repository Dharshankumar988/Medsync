-- Migration: 03_profile_image.sql
-- Description: Add profile_image_url to users and doctor_profile_image_url to prescriptions.
-- This ensures doctors and patients can have profile images, and prescriptions capture the doctor's image as an immutable snapshot.

-- 1. Add profile_image_url to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(1024);

-- 2. Add doctor_profile_image_url to prescriptions
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS doctor_profile_image_url VARCHAR(1024);

-- 3. Seed default images for demo test accounts (emails match 07_seed_all_dummy_data.sql)

-- Doctor 1
UPDATE users 
SET profile_image_url = 'https://randomuser.me/api/portraits/men/32.jpg'
WHERE email = 'doctor1@medsync.com';

-- Patient 1
UPDATE users 
SET profile_image_url = 'https://randomuser.me/api/portraits/men/11.jpg'
WHERE email = 'patient1@medsync.com';
