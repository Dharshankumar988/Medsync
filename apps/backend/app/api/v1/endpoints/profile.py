from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies.db import get_db
from app.dependencies.auth import RoleChecker, AuthenticatedPrincipal
from app.schemas.response import APIResponse
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.pharmacy import Pharmacy
import uuid
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import io
import magic
from PIL import Image
from app.services.storage import StorageService

router = APIRouter()
require_doctor = RoleChecker([UserRole.DOCTOR])

class ProfileCompletionRequest(BaseModel):
    # Patients
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
    medical_alerts: Optional[str] = None
    allergies: Optional[str] = None
    
    # Doctors
    qualifications: Optional[str] = None
    clinic_name: Optional[str] = None
    clinic_address: Optional[str] = None
    clinic_phone: Optional[str] = None
    clinic_email: Optional[str] = None
    languages: Optional[str] = None
    consultation_hours: Optional[str] = None
    hospital_id: Optional[uuid.UUID] = None
    medical_council_reg_number: Optional[str] = None
    license_number: Optional[str] = None
    experience_years: Optional[int] = None
    bio: Optional[str] = None
    consultation_fee: Optional[int] = None

    # Pharmacy
    gst_number: Optional[str] = None
    operating_hours: Optional[str] = None
    owner_details: Optional[str] = None
    branch_information: Optional[str] = None
    business_registration_number: Optional[str] = None
    contact_number: Optional[str] = None

    # Common
    profile_completion_percentage: int

@router.put("/{user_id}/completion", response_model=APIResponse[dict])
async def update_profile_completion(user_id: uuid.UUID, payload: ProfileCompletionRequest, db: AsyncSession = Depends(get_db)):
    user = await db.execute(select(User).where(User.id == user_id))
    user = user.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    user.profile_completion_percentage = payload.profile_completion_percentage

    if user.role == UserRole.PATIENT:
        profile = await db.execute(select(Patient).where(Patient.user_id == user_id))
        profile = profile.scalar_one_or_none()
        if profile:
            profile.date_of_birth = payload.date_of_birth or profile.date_of_birth
            profile.gender = payload.gender or profile.gender
            profile.blood_group = payload.blood_group or profile.blood_group
            profile.phone_number = payload.phone_number or profile.phone_number
            profile.address = payload.address or profile.address
            profile.city = payload.city or profile.city
            profile.state = payload.state or profile.state
            profile.country = payload.country or profile.country
            profile.pincode = payload.pincode or profile.pincode
            profile.emergency_contact_name = payload.emergency_contact_name or profile.emergency_contact_name
            profile.emergency_contact_number = payload.emergency_contact_number or profile.emergency_contact_number
            profile.medical_alerts = payload.medical_alerts or profile.medical_alerts
            profile.allergies = payload.allergies or profile.allergies

    elif user.role == UserRole.DOCTOR:
        profile = await db.execute(select(Doctor).where(Doctor.user_id == user_id))
        profile = profile.scalar_one_or_none()
        if profile:
            profile.qualifications = payload.qualifications or profile.qualifications
            profile.clinic_name = payload.clinic_name or profile.clinic_name
            profile.clinic_address = payload.clinic_address or profile.clinic_address
            profile.city = payload.city or profile.city
            profile.state = payload.state or profile.state
            profile.country = payload.country or profile.country
            profile.pincode = payload.pincode or profile.pincode
            profile.clinic_phone = payload.clinic_phone or profile.clinic_phone
            profile.clinic_email = payload.clinic_email or profile.clinic_email
            profile.languages = payload.languages or profile.languages
            profile.consultation_hours = payload.consultation_hours or profile.consultation_hours
            profile.hospital_id = payload.hospital_id or profile.hospital_id
            profile.medical_council_reg_number = payload.medical_council_reg_number or profile.medical_council_reg_number
            profile.license_number = payload.license_number or profile.license_number
            if payload.experience_years is not None:
                profile.experience_years = payload.experience_years
            profile.bio = payload.bio or profile.bio
            if payload.consultation_fee is not None:
                profile.consultation_fee = payload.consultation_fee

    elif user.role == UserRole.PHARMACY:
        profile = await db.execute(select(Pharmacy).where(Pharmacy.user_id == user_id))
        profile = profile.scalar_one_or_none()
        if profile:
            profile.license_number = payload.license_number or profile.license_number
            profile.gst_number = payload.gst_number or profile.gst_number
            profile.address = payload.address or profile.address
            profile.city = payload.city or profile.city
            profile.state = payload.state or profile.state
            profile.country = payload.country or profile.country
            profile.pincode = payload.pincode or profile.pincode
            profile.operating_hours = payload.operating_hours or profile.operating_hours
            profile.owner_details = payload.owner_details or profile.owner_details
            profile.branch_information = payload.branch_information or profile.branch_information
            profile.business_registration_number = payload.business_registration_number or profile.business_registration_number
            profile.contact_number = payload.contact_number or profile.contact_number

    await db.commit()
    return APIResponse(message="Profile completion updated successfully", data={"completion_percentage": user.profile_completion_percentage})


@router.post("/image", response_model=APIResponse[dict])
async def upload_profile_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor)
):
    # Security checks
    if file.size and file.size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB allowed.")
        
    file_bytes = await file.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB allowed.")

    # Check magic bytes for secure mime type
    mime = magic.from_buffer(file_bytes, mime=True)
    allowed_mimes = ["image/jpeg", "image/png", "image/webp"]
    if mime not in allowed_mimes:
        raise HTTPException(status_code=400, detail=f"Invalid file type: {mime}. Only JPG, PNG, and WEBP are allowed.")

    try:
        # Process image with Pillow (strip metadata, resize, create thumbnail)
        img = Image.open(io.BytesIO(file_bytes))
        
        # Convert to RGB if it's RGBA/P to save as JPEG safely (or we can just keep WEBP/PNG)
        if img.mode in ("RGBA", "P") and mime == "image/jpeg":
            img = img.convert("RGB")

        # Strip metadata by copying the image data without exif
        data = list(img.getdata())
        clean_img = Image.new(img.mode, img.size)
        clean_img.putdata(data)

        # Full size compressed (max 1024x1024)
        clean_img.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        out_full = io.BytesIO()
        clean_img.save(out_full, format=img.format or "WEBP", quality=85)
        full_bytes = out_full.getvalue()

        # Thumbnail (150x150)
        thumb_img = clean_img.copy()
        thumb_img.thumbnail((150, 150), Image.Resampling.LANCZOS)
        out_thumb = io.BytesIO()
        thumb_img.save(out_thumb, format=img.format or "WEBP", quality=80)
        thumb_bytes = out_thumb.getvalue()
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")

    # Upload to storage
    ext = "jpg" if mime == "image/jpeg" else mime.split("/")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    
    full_path = f"doctors/{current_user.id}/{filename}"
    thumb_path = f"doctors/{current_user.id}/thumb_{filename}"

    # Supabase upload via StorageService
    await StorageService.upload_bytes(full_path, full_bytes, mime)
    await StorageService.upload_bytes(thumb_path, thumb_bytes, mime)
    
    # Get signed URLs for immediate UI update (though DB will store relative paths)
    full_url = await StorageService.create_signed_download_url(full_path, expires_in=3600)
    thumb_url = await StorageService.create_signed_download_url(thumb_path, expires_in=3600)

    # Update DB
    stmt = select(Doctor).where(Doctor.user_id == current_user.id)
    result = await db.execute(stmt)
    doctor = result.scalar_one_or_none()
    
    if doctor:
        doctor.profile_image = full_path
        doctor.thumbnail = thumb_path
        doctor.image_uploaded_at = datetime.utcnow()
        await db.commit()

    return APIResponse(
        message="Profile image uploaded securely",
        data={
            "profile_image_url": full_url,
            "thumbnail_url": thumb_url
        }
    )
