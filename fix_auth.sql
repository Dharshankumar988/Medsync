-- fix_auth.sql
-- This script creates the dummy admin user in Supabase's internal auth system.
-- Run this in the same Supabase SQL Editor.

BEGIN;

-- 1. Remove if already exists (to prevent errors if you run this multiple times)
DELETE FROM auth.identities WHERE user_id = 'a1000000-0000-0000-0000-000000000000';
DELETE FROM auth.users WHERE id = 'a1000000-0000-0000-0000-000000000000';

-- 2. Insert into auth.users
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
    '00000000-0000-0000-0000-000000000000', 
    'a1000000-0000-0000-0000-000000000000', 
    'authenticated', 
    'authenticated', 
    'admin@medsync.com', 
    crypt('admin', gen_salt('bf', 10)), 
    NOW(), 
    '{"provider": "email", "providers": ["email"]}', 
    '{"role": "ADMIN", "full_name": "Admin Chief"}'::jsonb, 
    NOW(), 
    NOW(), 
    '', '', '', ''
);

-- 3. Insert into auth.identities
INSERT INTO auth.identities (
    id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at
) VALUES (
    gen_random_uuid(), 
    'a1000000-0000-0000-0000-000000000000', 
    '{"sub":"a1000000-0000-0000-0000-000000000000","email":"admin@medsync.com"}'::jsonb, 
    'email', 
    NOW(), 
    NOW(),
    NOW()
);

COMMIT;
