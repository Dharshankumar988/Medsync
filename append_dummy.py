import sys

bangalore_data = """
-- 50. BANGALORE HOSPITALS
INSERT INTO hospitals (id, name, address, city, state, country, pincode, phone_number, email, website, is_verified, is_active) VALUES
('b0000000-0000-0000-0000-000000000001', 'Manipal Hospital Whitefield', 'ITPL Main Rd, Whitefield', 'Bangalore', 'Karnataka', 'India', '560066', '080-2502-3333', 'contact@manipalwhitefield.com', 'https://manipalhospitals.com', TRUE, TRUE),
('b0000000-0000-0000-0000-000000000002', 'Apollo Hospitals Jayanagar', '14th Cross, 3rd Block, Jayanagar', 'Bangalore', 'Karnataka', 'India', '560011', '080-2630-4050', 'info@apollojayanagar.com', 'https://apollohospitals.com', TRUE, TRUE),
('b0000000-0000-0000-0000-000000000003', 'Fortis Hospital Bannerghatta', '154/9, Bannerghatta Road, Opp IIM-B', 'Bangalore', 'Karnataka', 'India', '560076', '080-6621-4444', 'bgroad@fortishealthcare.com', 'https://fortishealthcare.com', TRUE, TRUE);

-- 51. BANGALORE DOCTORS
INSERT INTO doctors (id, user_id, specialization, license_number, hospital_id, qualifications, clinic_name, clinic_address, city, state, country, pincode, clinic_phone, clinic_email, is_verified) VALUES
('d0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Cardiology', 'KMC12345', 'b0000000-0000-0000-0000-000000000001', 'MBBS, MD', 'Manipal Heart Care', 'ITPL Main Rd, Whitefield', 'Bangalore', 'Karnataka', 'India', '560066', '9876543210', 'dr.rao@manipal.com', TRUE),
('d0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Neurology', 'KMC54321', 'b0000000-0000-0000-0000-000000000002', 'MBBS, DM', 'Apollo Neuro', 'Jayanagar', 'Bangalore', 'Karnataka', 'India', '560011', '9876543211', 'dr.shetty@apollo.com', TRUE);

-- 52. BANGALORE PHARMACIES
INSERT INTO pharmacies (id, user_id, license_number, address, city, state, country, pincode, is_verified) VALUES
('p0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'PHARM-BLR-001', 'Koramangala 5th Block', 'Bangalore', 'Karnataka', 'India', '560095', TRUE),
('p0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'PHARM-BLR-002', 'HSR Layout Sector 2', 'Bangalore', 'Karnataka', 'India', '560102', TRUE);
"""

with open('dummy_values.sql', 'a', encoding='utf-8') as f:
    f.write('\n\n' + bangalore_data)
