import uuid
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class PatientProfile(BaseModel):
    id: uuid.UUID
    full_name: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_number: Optional[str] = None
    profile_picture_url: Optional[str] = None
    government_id_url: Optional[str] = None
    medical_alerts: Optional[str] = None
    allergies: Optional[str] = None
    primary_physician_id: Optional[uuid.UUID] = None
    
    model_config = {"from_attributes": True}

class DoctorProfile(BaseModel):
    id: uuid.UUID
    full_name: str
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    experience_years: Optional[int] = 0
    bio: Optional[str] = None
    consultation_fee: Optional[int] = 0
    qualifications: Optional[str] = None
    clinic_name: Optional[str] = None
    clinic_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    clinic_phone: Optional[str] = None
    clinic_email: Optional[str] = None
    languages: Optional[str] = None
    consultation_hours: Optional[str] = None
    certificates_url: Optional[str] = None
    government_id_url: Optional[str] = None
    professional_documents_url: Optional[str] = None
    profile_picture_url: Optional[str] = None
    verification_documents_url: Optional[str] = None
    hospital_id: Optional[uuid.UUID] = None
    medical_council_reg_number: Optional[str] = None
    
    model_config = {"from_attributes": True}

class PharmacyProfile(BaseModel):
    id: uuid.UUID
    business_name: str
    license_number: Optional[str] = None
    gst_number: Optional[str] = None
    address: Optional[str] = None
    contact_number: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    operating_hours: Optional[str] = None
    owner_details: Optional[str] = None
    supporting_documents_url: Optional[str] = None
    logo_url: Optional[str] = None
    verification_documents_url: Optional[str] = None
    branch_information: Optional[str] = None
    business_registration_number: Optional[str] = None
    
    model_config = {"from_attributes": True}

class AdminProfile(BaseModel):
    id: uuid.UUID
    full_name: str
    department: Optional[str] = None
    
    model_config = {"from_attributes": True}
