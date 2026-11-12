import random
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from sqlalchemy.exc import IntegrityError
from app.dependencies.db import get_db
from app.schemas.response import APIResponse
from app.schemas.user import UserSyncRequest
from app.models.user import User, UserRole, UserStatus
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.pharmacy import Pharmacy
from app.models.hospital import Hospital
from app.models.doctor_location import DoctorLocation
from app.models.verification import VerificationRequest, VerificationStatus, RoleType

DEFAULT_MALE_AVATAR = "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4"
DEFAULT_FEMALE_AVATAR = "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=d1d4f9"

MALE_PATIENT_AVATARS = [DEFAULT_MALE_AVATAR]
FEMALE_PATIENT_AVATARS = [DEFAULT_FEMALE_AVATAR]

router = APIRouter()

@router.post("/register", status_code=status.HTTP_410_GONE)
async def register():
    raise HTTPException(status_code=status.HTTP_410_GONE, detail="Use Supabase Auth directly from the client.")

@router.post("/login", status_code=status.HTTP_410_GONE)
async def login():
    raise HTTPException(status_code=status.HTTP_410_GONE, detail="Use Supabase Auth directly from the client.")

from typing import Optional
from pydantic import BaseModel
from app.dependencies.auth import get_current_user
from app.schemas.session import AuthenticatedPrincipal
from app.schemas.auth import (
    ForgotPasswordRequest,
    ForgotPasswordResponseData,
    VerifyResetTokenResponseData,
    PatientResetPasswordRequest,
    ProviderResetPasswordRequest,
    ResetPasswordSuccessResponseData,
    AdminRegisterRequest,
    AdminRegisterResponseData,
    ForceResetRequest,
    ForceResetResponseData,
    SyncUserResponseData,
    SendOTPRequest,
    SendOTPResponseData,
    VerifyOTPRequest,
    VerifyOTPResponseData,
    ResetPasswordWithOTPRequest,
    LoginGuardRequest,
    LoginGuardResponseData,
    SetOAuthPasswordRequest,
)
from app.utils.reset_token import (
    create_patient_reset_token,
    verify_patient_reset_token,
    consume_patient_reset_token,
)
from app.utils.otp import (
    create_and_store_otp,
    verify_and_consume_otp,
)
from app.services.email_service import email_service
from app.core.config import settings

@router.post("/admin-register", response_model=APIResponse[AdminRegisterResponseData])
async def admin_register(payload: AdminRegisterRequest, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import text
    import uuid
    import json
    user_id = uuid.uuid4()
    clean_email = payload.email.strip().lower()

    # Determine requested role (default to ADMIN if not specified or unknown)
    raw_role = (payload.role or "").strip().upper()
    if raw_role in ["DOCTOR", "PHARMACY", "HOSPITAL", "PATIENT"]:
        target_role = raw_role
    else:
        target_role = "ADMIN"

    try:
        # Check if user already exists in public.users
        existing = await db.execute(select(User).where(func.lower(User.email) == clean_email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")
        
        # Check if user already exists in auth.users
        try:
            async with db.begin_nested():
                auth_existing = await db.execute(text("SELECT id FROM auth.users WHERE lower(email) = :email"), {"email": clean_email})
                if auth_existing.scalar_one_or_none():
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")
        except HTTPException:
            raise
        except Exception:
            pass

        app_meta = json.dumps({"role": target_role, "provider": "email"})
        user_meta = json.dumps({"role": target_role})
        params = {"id": user_id, "email": clean_email, "pwd": payload.password, "app_meta": app_meta, "user_meta": user_meta}

        try:
            async with db.begin_nested():
                await db.execute(
                    text("""
                    INSERT INTO auth.users (id, instance_id, email, encrypted_password, aud, role, raw_app_meta_data, raw_user_meta_data, email_confirmed_at)
                    VALUES (:id, '00000000-0000-0000-0000-000000000000', :email, extensions.crypt(:pwd, extensions.gen_salt('bf')), 'authenticated', 'authenticated', CAST(:app_meta AS jsonb), CAST(:user_meta AS jsonb), now())
                    """),
                    params
                )
        except Exception:
            await db.execute(
                text("""
                INSERT INTO auth.users (id, instance_id, email, encrypted_password, aud, role, raw_app_meta_data, raw_user_meta_data, email_confirmed_at)
                VALUES (:id, '00000000-0000-0000-0000-000000000000', :email, crypt(:pwd, gen_salt('bf')), 'authenticated', 'authenticated', CAST(:app_meta AS jsonb), CAST(:user_meta AS jsonb), now())
                """),
                params
            )
        
        # Only create public.users entry if target_role is ADMIN.
        # For DOCTOR, PHARMACY, HOSPITAL, or PATIENT, the client immediately calls
        # /api/v1/auth/sync to set up specific role profiles, clinics, locations,
        # and pending VerificationRequest records.
        if target_role == "ADMIN":
            admin_user = User(
                id=user_id,
                email=clean_email,
                password_hash="supabase_managed",
                role=UserRole.ADMIN,
                status=UserStatus.ACTIVE,
                is_verified=True,
                profile_completion_percentage=100
            )
            db.add(admin_user)
            await db.commit()
        else:
            await db.commit()

        return APIResponse(message="User created", data=AdminRegisterResponseData(id=str(user_id)))
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        err_str = str(e).lower()
        if "unique constraint" in err_str or "duplicate key" in err_str:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/force-reset-password", response_model=APIResponse[ForceResetResponseData])
async def force_reset_password(payload: ForceResetRequest, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import text
    try:
        result = await db.execute(text("UPDATE auth.users SET encrypted_password = crypt(:pwd, gen_salt('bf')) WHERE email = :email"), {"pwd": payload.new_password, "email": payload.email})
        await db.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="User not found")
        return APIResponse(message="Password reset successfully", data=ForceResetResponseData(email=payload.email))
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/forgot-password", response_model=APIResponse[ForgotPasswordResponseData])
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Unified forgot password entry point.
    - Admin, Doctor, Pharmacy, Hospital: Direct redirect to instant password reset portal.
    - Patient: Dispatches a 6-digit verification OTP code via Brevo SMTP (5-minute expiry).
    """
    target_email = payload.email.strip().lower()
    
    result = await db.execute(select(User).where(func.lower(User.email) == target_email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account registered with this email address."
        )
        
    # 1. Admin and Hospital -> Direct instant password reset portal
    if user.role in [UserRole.ADMIN, UserRole.HOSPITAL]:
        redirect_url = f"/provider-reset-password?email={target_email}"
        role_label = user.role.value.capitalize()
        return APIResponse(
            message=f"{role_label} redirecting to instant password reset",
            data=ForgotPasswordResponseData(
                action="REDIRECT",
                role=user.role.value,
                redirect_url=redirect_url,
                email=target_email,
                message=f"Redirecting {role_label} to instant password reset portal."
            )
        )

    # 2. Doctor and Pharmacy -> OTP with Dev OTP preview mode provided on screen
    if user.role in [UserRole.DOCTOR, UserRole.PHARMACY]:
        otp_code, expires_in_seconds = await create_and_store_otp(db, target_email, "PASSWORD_RESET")
        role_label = user.role.value.capitalize()
        # Attempt sending email in background / best-effort
        email_service.send_patient_reset_otp_email(
            to_email=target_email,
            patient_name=role_label,
            otp_code=otp_code
        )
        return APIResponse(
            message=f"A 6-digit verification code has been generated for {role_label}.",
            data=ForgotPasswordResponseData(
                action="EMAIL_SENT",
                role=user.role.value,
                redirect_url=None,
                email=target_email,
                message=f"A 6-digit verification code has been generated for {role_label}.",
                preview_url=otp_code  # Dev OTP is provided exclusively for Doctor & Pharmacy
            )
        )
        
    # 3. Patient Role -> Send 6-digit OTP code via Brevo SMTP to patient's real Gmail (strictly no Dev OTP on screen)
    if user.role == UserRole.PATIENT:
        patient_stmt = select(Patient).where(Patient.user_id == user.id)
        pat_res = await db.execute(patient_stmt)
        patient = pat_res.scalar_one_or_none()
        patient_name = patient.full_name if (patient and patient.full_name) else "Patient"

        otp_code, expires_in_seconds = await create_and_store_otp(db, target_email, "PASSWORD_RESET")
        email_service.send_patient_reset_otp_email(
            to_email=target_email,
            patient_name=patient_name,
            otp_code=otp_code
        )
        
        return APIResponse(
            message="A 6-digit verification code valid for 5 minutes has been sent to your registered email.",
            data=ForgotPasswordResponseData(
                action="EMAIL_SENT",
                role="PATIENT",
                redirect_url=None,
                email=target_email,
                message="A 6-digit verification code valid for 5 minutes has been sent to your email.",
                preview_url=None  # Patient OTP is delivered strictly to their Gmail; no Dev OTP preview
            )
        )
        
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported user role.")

@router.get("/verify-patient-token", response_model=APIResponse[VerifyResetTokenResponseData])
async def verify_patient_token(token: str, email: str = None):
    """
    Verifies that a reset token for a Patient is valid, authentic, and within the 5-minute timeout window.
    """
    valid, token_email, error_msg, remaining_seconds = verify_patient_reset_token(token)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error_msg or "Password reset link has expired or is invalid."
        )
        
    if email and token_email and token_email.lower() != email.strip().lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token does not match the provided email address."
        )
        
    return APIResponse(
        message="Token is valid and active",
        data=VerifyResetTokenResponseData(
            valid=True,
            email=token_email,
            role="PATIENT",
            remaining_seconds=remaining_seconds
        )
    )

@router.post("/patient-reset-password", response_model=APIResponse[ResetPasswordSuccessResponseData])
async def patient_reset_password(payload: PatientResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Resets the password for a verified Patient within the 5-minute window.
    Requires password confirmation and valid token.
    """
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
        
    valid, token_email, error_msg, _ = verify_patient_reset_token(payload.token)
    if not valid or not token_email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=error_msg or "Reset link has expired.")
        
    target_email = token_email.lower()
    if payload.email.lower() != target_email:
        raise HTTPException(status_code=400, detail="Token does not match provided email.")
        
    user_res = await db.execute(select(User).where(User.email == target_email))
    user = user_res.scalar_one_or_none()
    if not user or user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Reset password via this link is only allowed for Patient accounts.")
        
    from sqlalchemy import text
    try:
        try:
            result = await db.execute(
                text("""
                UPDATE auth.users 
                SET encrypted_password = extensions.crypt(:pwd, extensions.gen_salt('bf')),
                    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"has_password": true}'::jsonb
                WHERE lower(email) = :email
                """),
                {"pwd": payload.password, "email": target_email}
            )
        except Exception:
            result = await db.execute(
                text("""
                UPDATE auth.users 
                SET encrypted_password = crypt(:pwd, gen_salt('bf')),
                    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"has_password": true}'::jsonb
                WHERE lower(email) = :email
                """),
                {"pwd": payload.password, "email": target_email}
            )
        await db.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Auth user not found.")
            
        consume_patient_reset_token(payload.token)
        return APIResponse(
            message="Password reset successfully.",
            data=ResetPasswordSuccessResponseData(
                email=target_email,
                role="PATIENT",
                message="Password reset successfully. You may now log in."
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/provider-reset-password", response_model=APIResponse[ResetPasswordSuccessResponseData])
async def provider_reset_password(payload: ProviderResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Resets the password for Doctor, Pharmacy, Hospital, and Administrator accounts.
    Direct reset without requiring email OTP verification.
    Strictly forbids Patient accounts (patients must use OTP).
    """
    target_email = payload.email.strip().lower()
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    if payload.confirm_password and payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
        
    user_res = await db.execute(select(User).where(func.lower(User.email) == target_email))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email.")
        
    if user.role == UserRole.PATIENT:
        raise HTTPException(
            status_code=403,
            detail="Patient accounts must use the verified 5-minute email OTP code. Direct provider reset is disallowed."
        )
        
    from sqlalchemy import text
    try:
        try:
            result = await db.execute(
                text("""
                UPDATE auth.users 
                SET encrypted_password = extensions.crypt(:pwd, extensions.gen_salt('bf')),
                    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"has_password": true}'::jsonb
                WHERE lower(email) = :email
                """),
                {"pwd": payload.new_password, "email": target_email}
            )
        except Exception:
            result = await db.execute(
                text("""
                UPDATE auth.users 
                SET encrypted_password = crypt(:pwd, gen_salt('bf')),
                    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"has_password": true}'::jsonb
                WHERE lower(email) = :email
                """),
                {"pwd": payload.new_password, "email": target_email}
            )
        await db.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Auth user not found.")
            
        return APIResponse(
            message=f"{user.role.value.capitalize()} password updated successfully.",
            data=ResetPasswordSuccessResponseData(
                email=target_email,
                role=user.role.value,
                message="Password updated successfully. You can now log in."
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


async def _ensure_pending_verification_request(db: AsyncSession, user: User, role: UserRole) -> None:
    """Create a pending VerificationRequest if an unverified Doctor/Pharmacy lacks one."""
    if user.is_verified or user.status == UserStatus.SUSPENDED:
        return
    if role not in (UserRole.DOCTOR, UserRole.PHARMACY):
        return
    existing_vr = await db.execute(
        select(VerificationRequest).where(VerificationRequest.user_id == user.id)
    )
    if existing_vr.scalars().first() is None:
        role_type = RoleType.DOCTOR if role == UserRole.DOCTOR else RoleType.PHARMACY
        db.add(
            VerificationRequest(
                user_id=user.id,
                role_type=role_type,
                status=VerificationStatus.PENDING,
            )
        )


@router.post("/sync", response_model=APIResponse[SyncUserResponseData])
async def sync_user(payload: UserSyncRequest, db: AsyncSession = Depends(get_db)):
    """
    Called by the frontend immediately after Supabase signup to create the corresponding
    backend records and profiles, along with VerificationRequests if needed.
    """
    try:
        clean_email = payload.email.strip().lower()

        # 1. Check if user already exists by ID
        existing = await db.execute(select(User).where(User.id == payload.id))
        existing_user_id = existing.scalar_one_or_none()
        if existing_user_id:
            # Sync / update any profile fields provided in registration payload
            if payload.role == UserRole.PATIENT:
                # If verified via OAuth e.g. Google or explicitly verified, ensure active & verified status
                if payload.is_verified is True or (payload.auth_provider and payload.auth_provider.lower() == "google"):
                    existing_user_id.is_verified = True
                    existing_user_id.status = UserStatus.ACTIVE
                pat_res = await db.execute(select(Patient).where(Patient.user_id == existing_user_id.id))
                pat = pat_res.scalar_one_or_none()
                if pat:
                    if payload.full_name:
                        pat.full_name = payload.full_name
                    if payload.blood_group:
                        pat.blood_group = payload.blood_group
                    if payload.gender:
                        pat.gender = payload.gender
                    if payload.date_of_birth:
                        pat.date_of_birth = payload.date_of_birth
                    if payload.profile_picture_url:
                        pat.profile_picture_url = payload.profile_picture_url
                        existing_user_id.profile_image_url = payload.profile_picture_url
                    elif not pat.profile_picture_url and not existing_user_id.profile_image_url:
                        gender = (payload.gender or pat.gender or "").strip().upper()
                        allotted = random.choice(FEMALE_PATIENT_AVATARS) if gender == "FEMALE" else random.choice(MALE_PATIENT_AVATARS)
                        pat.profile_picture_url = allotted
                        existing_user_id.profile_image_url = allotted
                else:
                    gender = (payload.gender or "").strip().upper()
                    allotted = random.choice(FEMALE_PATIENT_AVATARS) if gender == "FEMALE" else random.choice(MALE_PATIENT_AVATARS)
                    pat = Patient(
                        user_id=existing_user_id.id,
                        full_name=payload.full_name,
                        blood_group=payload.blood_group,
                        gender=payload.gender,
                        date_of_birth=payload.date_of_birth,
                        profile_picture_url=payload.profile_picture_url or existing_user_id.profile_image_url or allotted
                    )
                    db.add(pat)
                await db.commit()
            elif payload.role == UserRole.DOCTOR:
                doc_res = await db.execute(select(Doctor).where(Doctor.user_id == existing_user_id.id))
                doc = doc_res.scalar_one_or_none()
                if doc:
                    if payload.full_name:
                        doc.full_name = payload.full_name
                    if payload.license_number:
                        doc.license_number = payload.license_number
                    if payload.hospital_name:
                        doc.hospital_name = payload.hospital_name
                    if payload.clinic_name:
                        doc.clinic_name = payload.clinic_name
                    if payload.hospital_id:
                        doc.hospital_id = payload.hospital_id
                await _ensure_pending_verification_request(db, existing_user_id, UserRole.DOCTOR)
                await db.commit()
            elif payload.role == UserRole.PHARMACY:
                phm_res = await db.execute(select(Pharmacy).where(Pharmacy.user_id == existing_user_id.id))
                phm = phm_res.scalar_one_or_none()
                if phm:
                    if payload.business_name or payload.full_name:
                        phm.business_name = payload.business_name or payload.full_name
                    if payload.license_number:
                        phm.license_number = payload.license_number
                    if payload.gst_number:
                        phm.gst_number = payload.gst_number
                    if payload.contact_number:
                        phm.contact_number = payload.contact_number
                    if payload.address:
                        phm.address = payload.address
                    if payload.city:
                        phm.city = payload.city
                    if payload.state:
                        phm.state = payload.state
                    if payload.country:
                        phm.country = payload.country
                    if payload.pincode:
                        phm.pincode = payload.pincode
                    if payload.hospital_id:
                        phm.hospital_id = payload.hospital_id
                else:
                    phm = Pharmacy(
                        user_id=existing_user_id.id,
                        business_name=payload.business_name or payload.full_name or "Pharmacy Partner",
                        license_number=payload.license_number or f"LIC-PHM-{str(existing_user_id.id)[:8]}",
                        gst_number=payload.gst_number,
                        contact_number=payload.contact_number,
                        address=payload.address,
                        city=payload.city,
                        state=payload.state,
                        country=payload.country,
                        pincode=payload.pincode,
                        hospital_id=payload.hospital_id,
                        clinic_name=payload.clinic_name,
                    )
                    db.add(phm)
                await _ensure_pending_verification_request(db, existing_user_id, UserRole.PHARMACY)
                await db.commit()

            return APIResponse(message="User already synced", data=SyncUserResponseData(id=str(payload.id)))

        # 2. Check if user already exists by Email
        existing_email_res = await db.execute(select(User).where(func.lower(User.email) == clean_email))
        existing_user_email = existing_email_res.scalar_one_or_none()
        if existing_user_email:
            # Check if payload.id is the authoritative Supabase auth user for this email
            auth_user = None
            try:
                auth_check = await db.execute(
                    text("SELECT id FROM auth.users WHERE id = :id AND lower(email) = :email"),
                    {"id": payload.id, "email": clean_email}
                )
                auth_user = auth_check.scalar_one_or_none()
            except Exception:
                auth_user = None

            if auth_user:
                # Update user ID to match new authoritative Supabase auth ID (cascades to profile tables)
                existing_user_email.id = payload.id
                await _ensure_pending_verification_request(db, existing_user_email, payload.role)
                await db.commit()
                return APIResponse(message="User already synced and ID updated", data=SyncUserResponseData(id=str(payload.id)))
            else:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An account with this email already exists. Please log in instead."
                )

        if payload.role == UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin creation is not allowed publicly.")

        # Determine status and verification per role lifecycle contract:
        # - Patient: PENDING until email OTP is verified (unless OAuth provider e.g. Google where email is already verified)
        # - Doctor / Pharmacy / Hospital: PENDING until administrator review and approval
        # - Admin: ACTIVE and pre-verified immediately
        if payload.role == UserRole.PATIENT:
            if payload.is_verified is True or (payload.auth_provider and payload.auth_provider.lower() == "google"):
                new_status = UserStatus.ACTIVE
                is_verified = True
            else:
                new_status = UserStatus.PENDING
                is_verified = False
        elif payload.role in [UserRole.DOCTOR, UserRole.PHARMACY, UserRole.HOSPITAL]:
            new_status = UserStatus.PENDING
            is_verified = False
        elif payload.role == UserRole.ADMIN:
            new_status = UserStatus.ACTIVE
            is_verified = True
        else:
            new_status = UserStatus.PENDING
            is_verified = False


        # Determine default avatar based on role and gender
        default_avatar = payload.profile_picture_url
        if not default_avatar:
            gender = (payload.gender or "").strip().upper()
            
            if payload.role == UserRole.PATIENT:
                if gender == "FEMALE":
                    default_avatar = random.choice(FEMALE_PATIENT_AVATARS)
                else:
                    default_avatar = random.choice(MALE_PATIENT_AVATARS)
            elif payload.role == UserRole.DOCTOR:
                if gender == "FEMALE":
                    default_avatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=d1d4f9"
                else:
                    default_avatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=Jude&backgroundColor=c0aede"
            elif payload.role == UserRole.PHARMACY:
                default_avatar = "https://api.dicebear.com/7.x/shapes/svg?seed=" + str(payload.id) + "&backgroundColor=b6e3f4"
            elif payload.role == UserRole.HOSPITAL:
                default_avatar = "https://api.dicebear.com/7.x/shapes/svg?seed=" + str(payload.id) + "&backgroundColor=c0aede"

        # Create base user
        new_user = User(
            id=payload.id,
            email=payload.email,
            password_hash="supabase_managed",
            role=payload.role,
            status=new_status,
            is_verified=is_verified,
            profile_completion_percentage=100,
            profile_image_url=default_avatar
        )
        db.add(new_user)
        await db.flush()

        # Create profile
        if payload.role == UserRole.PATIENT:
            profile = Patient(
                user_id=new_user.id, 
                full_name=payload.full_name,
                blood_group=payload.blood_group,
                gender=payload.gender,
                date_of_birth=payload.date_of_birth,
                profile_picture_url=default_avatar
            )
            db.add(profile)
        elif payload.role == UserRole.DOCTOR:
            profile = Doctor(
                user_id=new_user.id,
                full_name=payload.full_name,
                hospital_name=payload.hospital_name,
                hospital_address=payload.hospital_address,
                hospital_id=payload.hospital_id,
                clinic_name=payload.clinic_name,
                clinic_address=payload.clinic_address,
                city=payload.city,
                state=payload.state,
                country=payload.country,
                pincode=payload.pincode,
                license_number=(payload.license_number or f"LIC-{str(new_user.id)[:8]}") + (f" | GST: {payload.gst_number}" if payload.gst_number else ""),
                experience_years=1,
                consultation_fee=500,
                doctor_status="PENDING",
                profile_picture_url=default_avatar
            )
            db.add(profile)
            await db.flush() # flush to get doctor profile id

            # Add location if private clinic
            if payload.clinic_name and payload.latitude and payload.longitude and not payload.hospital_id:
                # Create a Hospital record for the clinic so it appears on the map
                new_hospital = Hospital(
                    user_id=new_user.id,
                    name=payload.clinic_name,
                    address=payload.clinic_address or payload.address or "Unknown",
                    city=payload.city,
                    state=payload.state,
                    country=payload.country,
                    pincode=payload.pincode,
                    latitude=payload.latitude,
                    longitude=payload.longitude,
                    is_active=True,
                    is_verified=False,
                    type="clinic",
                    google_maps_url=payload.google_maps_url
                )
                db.add(new_hospital)
                await db.flush()
                
                profile.hospital_id = new_hospital.id
                profile.clinic_address = profile.clinic_address or new_hospital.address

                location = DoctorLocation(
                    doctor_id=profile.id,
                    location_type="CLINIC",
                    location_name=payload.clinic_name,
                    hospital_id=new_hospital.id,
                    address=profile.clinic_address,
                    city=new_hospital.city,
                    state=new_hospital.state,
                    latitude=payload.latitude,
                    longitude=payload.longitude,
                    google_maps_url=payload.google_maps_url,
                    is_primary=True,
                    is_active=True
                )
                db.add(location)
            elif payload.hospital_name and payload.latitude and payload.longitude and not payload.hospital_id:
                # If facility_type is clinic, allow registering as clinic
                is_clinic = (payload.facility_type or "").lower() == "clinic"
                existing_hosp = await db.execute(select(Hospital).where(Hospital.name.ilike(payload.hospital_name)))
                hosp = existing_hosp.scalars().first()
                if hosp:
                    profile.hospital_id = hosp.id
                elif is_clinic:
                    new_hospital = Hospital(
                        user_id=new_user.id,
                        name=payload.hospital_name,
                        address=payload.hospital_address or payload.address or "Unknown",
                        city=payload.city,
                        state=payload.state,
                        country=payload.country,
                        pincode=payload.pincode,
                        latitude=payload.latitude,
                        longitude=payload.longitude,
                        is_active=True,
                        is_verified=False,
                        type="clinic",
                        google_maps_url=payload.google_maps_url
                    )
                    db.add(new_hospital)
                    await db.flush()
                    profile.hospital_id = new_hospital.id
                    profile.clinic_name = payload.hospital_name
                    profile.clinic_address = payload.hospital_address or new_hospital.address

                if profile.hospital_id:
                    location = DoctorLocation(
                        doctor_id=profile.id,
                        location_type="CLINIC" if is_clinic else "HOSPITAL",
                        hospital_id=profile.hospital_id,
                        location_name=payload.hospital_name,
                        address=payload.hospital_address or payload.clinic_address,
                        latitude=payload.latitude,
                        longitude=payload.longitude,
                        google_maps_url=payload.google_maps_url,
                        is_primary=True,
                        is_active=True
                    )
                    db.add(location)
            elif payload.hospital_id:
                h_res = await db.execute(select(Hospital).where(Hospital.id == payload.hospital_id))
                h_obj = h_res.scalar_one_or_none()
                is_clinic = bool(h_obj and (h_obj.type or "").lower() == "clinic")
                if h_obj:
                    if is_clinic:
                        profile.clinic_name = profile.clinic_name or h_obj.name
                        profile.clinic_address = profile.clinic_address or h_obj.address
                    else:
                        profile.hospital_name = profile.hospital_name or h_obj.name
                        profile.hospital_address = profile.hospital_address or h_obj.address
                    profile.city = profile.city or h_obj.city
                    profile.state = profile.state or h_obj.state
                    profile.country = profile.country or h_obj.country
                    profile.pincode = profile.pincode or h_obj.pincode
                location = DoctorLocation(
                    doctor_id=profile.id,
                    location_type="CLINIC" if is_clinic else "HOSPITAL",
                    hospital_id=payload.hospital_id,
                    location_name=h_obj.name if h_obj else (payload.clinic_name or payload.hospital_name),
                    address=h_obj.address if h_obj else (payload.clinic_address or payload.hospital_address),
                    city=h_obj.city if h_obj else payload.city,
                    state=h_obj.state if h_obj else payload.state,
                    latitude=float(h_obj.latitude) if h_obj and h_obj.latitude is not None else payload.latitude,
                    longitude=float(h_obj.longitude) if h_obj and h_obj.longitude is not None else payload.longitude,
                    google_maps_url=h_obj.google_maps_url if h_obj else payload.google_maps_url,
                    is_primary=True,
                    is_active=True
                )
                db.add(location)
            # Create verification request
            vreq = VerificationRequest(
                user_id=new_user.id,
                role_type=RoleType.DOCTOR,
                status=VerificationStatus.PENDING
            )
            db.add(vreq)
        elif payload.role == UserRole.PHARMACY:
            location_data = None
            if payload.latitude is not None or payload.google_maps_url is not None:
                location_data = {
                    "lat": payload.latitude, 
                    "lng": payload.longitude,
                    "google_maps_url": payload.google_maps_url
                }
                
            resolved_clinic_name = payload.clinic_name
            resolved_hospital_id = payload.hospital_id
            linked_facility = None

            if resolved_hospital_id:
                h_res = await db.execute(select(Hospital).where(Hospital.id == resolved_hospital_id))
                linked_facility = h_res.scalar_one_or_none()
                if linked_facility and (linked_facility.type or "").lower() == "clinic" and not resolved_clinic_name:
                    resolved_clinic_name = linked_facility.name

            if resolved_clinic_name and not resolved_hospital_id:
                h_res = await db.execute(select(Hospital).where(
                    (Hospital.name.ilike(resolved_clinic_name.strip())) & (Hospital.type == "clinic")
                ))
                linked_facility = h_res.scalars().first()
                if linked_facility:
                    resolved_hospital_id = linked_facility.id
                elif (payload.facility_type or "").lower() == "clinic" and payload.latitude and payload.longitude:
                    new_clinic = Hospital(
                        user_id=new_user.id,
                        name=resolved_clinic_name,
                        address=payload.clinic_address or payload.address or payload.hospital_address or "Unknown",
                        city=payload.city,
                        state=payload.state,
                        country=payload.country,
                        pincode=payload.pincode,
                        latitude=payload.latitude,
                        longitude=payload.longitude,
                        is_active=True,
                        is_verified=False,
                        type="clinic",
                        google_maps_url=payload.google_maps_url
                    )
                    db.add(new_clinic)
                    await db.flush()
                    resolved_hospital_id = new_clinic.id
                    linked_facility = new_clinic

            # Automatically inherit hospital/clinic address & coordinates when affiliated
            if linked_facility:
                resolved_address = linked_facility.address or payload.address or payload.clinic_address or payload.hospital_address
                resolved_city = linked_facility.city or payload.city
                resolved_state = linked_facility.state or payload.state
                resolved_country = linked_facility.country or payload.country
                resolved_pincode = linked_facility.pincode or payload.pincode
                if not location_data and (linked_facility.latitude is not None or linked_facility.google_maps_url is not None):
                    location_data = {
                        "lat": float(linked_facility.latitude) if linked_facility.latitude is not None else None,
                        "lng": float(linked_facility.longitude) if linked_facility.longitude is not None else None,
                        "google_maps_url": linked_facility.google_maps_url,
                    }
            else:
                resolved_address = payload.address or payload.clinic_address or payload.hospital_address
                resolved_city = payload.city
                resolved_state = payload.state
                resolved_country = payload.country
                resolved_pincode = payload.pincode

            profile = Pharmacy(
                user_id=new_user.id,
                business_name=payload.business_name or payload.full_name,
                license_number=payload.license_number or f"LIC-PHM-{str(new_user.id)[:8]}",
                gst_number=payload.gst_number,
                contact_number=payload.contact_number,
                address=resolved_address,
                city=resolved_city,
                state=resolved_state,
                country=resolved_country,
                pincode=resolved_pincode,
                hospital_id=resolved_hospital_id,
                clinic_name=resolved_clinic_name,
                location=location_data
            )
            db.add(profile)
            # Create verification request
            vreq = VerificationRequest(
                user_id=new_user.id,
                role_type=RoleType.PHARMACY,
                status=VerificationStatus.PENDING
            )
            db.add(vreq)

        await db.commit()
        
        # Enqueue Blockchain Sync (PatientRegistry / DoctorRegistry / PharmacyRegistry)
        if payload.role in [UserRole.PATIENT, UserRole.DOCTOR, UserRole.PHARMACY]:
            try:
                from app.services.blockchain_sync import BlockchainSyncService, trigger_background_sync
                from app.models.blockchain import SyncEntityType, SyncActionType
                from app.blockchain.client import blockchain_client
                task = None
                if payload.role == UserRole.PATIENT:
                    task = await BlockchainSyncService.enqueue_sync_task(
                        db=db,
                        entity_type=SyncEntityType.PATIENT,
                        entity_id=new_user.id,
                        action_type=SyncActionType.CREATE,
                        payload={
                            "patient_id": str(new_user.id),
                            "email": payload.email,
                            "full_name": payload.full_name,
                            "wallet_address": blockchain_client.wallet_address
                        }
                    )
                elif payload.role == UserRole.DOCTOR:
                    task = await BlockchainSyncService.enqueue_sync_task(
                        db=db,
                        entity_type=SyncEntityType.DOCTOR,
                        entity_id=new_user.id,
                        action_type=SyncActionType.CREATE,
                        payload={
                            "doctor_id": str(new_user.id),
                            "license_number": profile.license_number,
                            "hospital_id": str(profile.hospital_id or profile.clinic_name or new_user.id),
                            "wallet_address": blockchain_client.wallet_address
                        }
                    )
                elif payload.role == UserRole.PHARMACY:
                    task = await BlockchainSyncService.enqueue_sync_task(
                        db=db,
                        entity_type=SyncEntityType.PHARMACY,
                        entity_id=new_user.id,
                        action_type=SyncActionType.CREATE,
                        payload={
                            "pharmacy_id": str(new_user.id),
                            "license_number": profile.license_number,
                            "business_name": profile.business_name,
                            "hospital_id": str(profile.hospital_id) if profile.hospital_id else None,
                            "wallet_address": blockchain_client.wallet_address
                        }
                    )
                if task:
                    await db.commit()
                    trigger_background_sync(task.id)
            except Exception as e:
                import logging
                logging.getLogger("medsync.auth").error(f"Error enqueueing blockchain task for {payload.role}: {e}")

        return APIResponse(message="User synced successfully", data=SyncUserResponseData(id=str(new_user.id)))
    except HTTPException:
        raise
    except IntegrityError as ie:
        await db.rollback()
        err_msg = str(ie).lower()
        if "users_email_key" in err_msg or "unique constraint" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists. Please log in instead."
            )
        import logging
        logging.getLogger("medsync.auth").error(f"IntegrityError syncing user: {ie}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Database integrity error during synchronization."
        )
    except Exception as e:
        import logging
        logging.getLogger("medsync.auth").error(f"Failed to sync user: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database synchronization failed: {str(e)}")


@router.post("/login-guard", response_model=APIResponse[LoginGuardResponseData])
async def check_login_guard(payload: LoginGuardRequest, db: AsyncSession = Depends(get_db)):
    """
    Enforces role-based verification guards upon login:
    - Admin: Allowed immediately (pre-verified).
    - Patient: Strictly blocked if unverified (403 EMAIL_NOT_VERIFIED).
    - Doctor & Pharmacy: Blocked with 403 PENDING_ADMIN_APPROVAL until reviewed and approved by admin.
    """
    clean_email = payload.email.strip().lower()
    user_res = await db.execute(select(User).where(func.lower(User.email) == clean_email))
    user = user_res.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No user found with this email.")

    # 1. Admin Role -> Pre-verified, allowed immediately
    if user.role == UserRole.ADMIN:
        return APIResponse(
            message="Admin authentication verified.",
            data=LoginGuardResponseData(
                allowed=True,
                email=clean_email,
                role=user.role.value,
                status=user.status.value,
                is_verified=user.is_verified,
                message="Admin authentication approved."
            )
        )

    # 2. Suspended check across all roles
    if user.status == UserStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ACCOUNT_SUSPENDED: Your account has been suspended. Please contact administrator support."
        )

    # 3. Patient Role -> Strictly blocked if unverified
    if user.role == UserRole.PATIENT:
        if not user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="EMAIL_NOT_VERIFIED: Your email is not verified yet. Please enter the 6-digit OTP code sent to your email to verify and activate your account."
            )
        return APIResponse(
            message="Patient login verified.",
            data=LoginGuardResponseData(
                allowed=True,
                email=clean_email,
                role=user.role.value,
                status=user.status.value,
                is_verified=user.is_verified,
                message="Patient verified and active."
            )
        )

    # 4. Doctor, Pharmacy, Hospital -> Blocked until approved by administrator
    if user.role in [UserRole.DOCTOR, UserRole.PHARMACY, UserRole.HOSPITAL]:
        if user.status != UserStatus.ACTIVE or not user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="PENDING_ADMIN_APPROVAL: Awaiting administrator verification. Your application has been registered and is pending administrator review and approval."
            )
        return APIResponse(
            message="Provider login verified.",
            data=LoginGuardResponseData(
                allowed=True,
                email=clean_email,
                role=user.role.value,
                status=user.status.value,
                is_verified=user.is_verified,
                message="Provider authorized and active."
            )
        )

    return APIResponse(
        message="Login allowed.",
        data=LoginGuardResponseData(
            allowed=True,
            email=clean_email,
            role=user.role.value,
            status=user.status.value,
            is_verified=user.is_verified,
            message="Account verified."
        )
    )


@router.post("/send-verification-otp", response_model=APIResponse[SendOTPResponseData])
async def send_verification_otp(payload: SendOTPRequest, db: AsyncSession = Depends(get_db)):
    """
    Sends a 6-digit registration verification OTP via Brevo to a Patient.
    Valid for 5 minutes with strict rate limiting.
    """
    target_email = payload.email.strip().lower()
    user_res = await db.execute(select(User).where(func.lower(User.email) == target_email))
    user = user_res.scalar_one_or_none()

    patient_name = "Patient"
    if user:
        if user.role != UserRole.PATIENT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email OTP verification is exclusively for Patient accounts."
            )
        if user.is_verified:
            return APIResponse(
                message="Account is already verified.",
                data=SendOTPResponseData(
                    email=target_email,
                    purpose="EMAIL_VERIFY",
                    expires_in_seconds=0,
                    message="Your email is already verified. You can log in directly."
                )
            )
        pat_res = await db.execute(select(Patient).where(Patient.user_id == user.id))
        pat = pat_res.scalar_one_or_none()
        if pat and pat.full_name:
            patient_name = pat.full_name

    otp_code, expires_in_seconds = await create_and_store_otp(db, target_email, "EMAIL_VERIFY")
    email_res = email_service.send_patient_verification_otp_email(
        to_email=target_email,
        patient_name=patient_name,
        otp_code=otp_code
    )

    return APIResponse(
        message=f"A 6-digit verification code has been sent to {target_email}.",
        data=SendOTPResponseData(
            email=target_email,
            purpose="EMAIL_VERIFY",
            expires_in_seconds=expires_in_seconds,
            message="A 6-digit verification code valid for 5 minutes has been sent to your email.",
            preview_code=None  # Patient email verification strictly delivers via email; no dev preview code
        )
    )


@router.post("/verify-email-otp", response_model=APIResponse[VerifyOTPResponseData])
async def verify_email_otp(payload: VerifyOTPRequest, db: AsyncSession = Depends(get_db)):
    """
    Verifies the 6-digit registration OTP code for a Patient.
    Upon successful verification, activates the account and marks email as verified.
    """
    target_email = payload.email.strip().lower()
    success, msg = await verify_and_consume_otp(db, target_email, payload.otp_code, "EMAIL_VERIFY")
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    # Activate user in database
    user_res = await db.execute(select(User).where(func.lower(User.email) == target_email))
    user = user_res.scalar_one_or_none()
    user_id_str = None
    role_str = "PATIENT"
    status_str = "ACTIVE"

    if user:
        user.is_verified = True
        user.status = UserStatus.ACTIVE
        user_id_str = str(user.id)
        role_str = user.role.value
        status_str = user.status.value

        # Synchronize email_confirmed_at in auth.users if Supabase schema is present
        try:
            from sqlalchemy import text
            await db.execute(
                text("UPDATE auth.users SET email_confirmed_at = now() WHERE lower(email) = :email"),
                {"email": target_email}
            )
        except Exception:
            pass
        await db.commit()

    return APIResponse(
        message="Email verified successfully! Your account is now active.",
        data=VerifyOTPResponseData(
            verified=True,
            email=target_email,
            message="Email verified successfully. You may now log in.",
            user_id=user_id_str,
            role=role_str,
            status=status_str
        )
    )


@router.post("/send-reset-otp", response_model=APIResponse[SendOTPResponseData])
async def send_reset_otp(payload: SendOTPRequest, db: AsyncSession = Depends(get_db)):
    """
    Sends a 6-digit password reset OTP.
    - Patient: Dispatched to registered Gmail via Brevo SMTP (no Dev OTP preview).
    - Doctor & Pharmacy: Dev OTP preview provided on screen.
    Valid for 5 minutes.
    """
    target_email = payload.email.strip().lower()
    user_res = await db.execute(select(User).where(func.lower(User.email) == target_email))
    user = user_res.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account registered with this email address."
        )

    if user.role not in [UserRole.PATIENT, UserRole.DOCTOR, UserRole.PHARMACY]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{user.role.value.capitalize()} accounts must use direct password reset portal."
        )

    is_patient = (user.role == UserRole.PATIENT)
    recipient_name = user.role.value.capitalize()

    if is_patient:
        pat_res = await db.execute(select(Patient).where(Patient.user_id == user.id))
        pat = pat_res.scalar_one_or_none()
        if pat and pat.full_name:
            recipient_name = pat.full_name

    otp_code, expires_in_seconds = await create_and_store_otp(db, target_email, "PASSWORD_RESET")
    email_service.send_patient_reset_otp_email(
        to_email=target_email,
        patient_name=recipient_name,
        otp_code=otp_code
    )

    # Dev OTP preview code is provided strictly for Doctor and Pharmacy accounts, never Patient
    preview_code = otp_code if not is_patient else None

    return APIResponse(
        message=f"Password reset code sent to {target_email}.",
        data=SendOTPResponseData(
            email=target_email,
            purpose="PASSWORD_RESET",
            expires_in_seconds=expires_in_seconds,
            message="A 6-digit password reset code valid for 5 minutes has been sent to your email.",
            preview_code=preview_code
        )
    )


@router.post("/verify-reset-otp", response_model=APIResponse[ResetPasswordSuccessResponseData])
async def verify_reset_otp(payload: ResetPasswordWithOTPRequest, db: AsyncSession = Depends(get_db)):
    """
    Verifies the 6-digit password reset OTP and immediately updates the account password.
    Supports Patient, Doctor, and Pharmacy accounts.
    Requires password and confirm_password to match (minimum 6 characters).
    """
    target_email = payload.email.strip().lower()

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 6 characters.")
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Passwords do not match.")

    user_res = await db.execute(select(User).where(func.lower(User.email) == target_email))
    user = user_res.scalar_one_or_none()
    if not user or user.role not in [UserRole.PATIENT, UserRole.DOCTOR, UserRole.PHARMACY]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password reset via OTP is supported for Patient, Doctor, and Pharmacy accounts."
        )

    success, msg = await verify_and_consume_otp(db, target_email, payload.otp_code, "PASSWORD_RESET")
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    from sqlalchemy import text
    try:
        try:
            result = await db.execute(
                text("""
                UPDATE auth.users 
                SET encrypted_password = extensions.crypt(:pwd, extensions.gen_salt('bf')),
                    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"has_password": true}'::jsonb
                WHERE lower(email) = :email
                """),
                {"pwd": payload.new_password, "email": target_email}
            )
        except Exception:
            result = await db.execute(
                text("""
                UPDATE auth.users 
                SET encrypted_password = crypt(:pwd, gen_salt('bf')),
                    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"has_password": true}'::jsonb
                WHERE lower(email) = :email
                """),
                {"pwd": payload.new_password, "email": target_email}
            )
        await db.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auth account not found.")

        return APIResponse(
            message="Password reset successfully.",
            data=ResetPasswordSuccessResponseData(
                email=target_email,
                role=user.role.value,
                message="Password reset successfully. You can now log in with your new password."
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/set-oauth-password", response_model=APIResponse[ResetPasswordSuccessResponseData])
async def set_oauth_password(
    payload: SetOAuthPasswordRequest,
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Sets a permanent account password for a patient who signed up via Google OAuth.
    """
    if len(payload.password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 6 characters.")
    if payload.confirm_password and payload.password != payload.confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Passwords do not match.")

    from sqlalchemy import text
    try:
        try:
            await db.execute(
                text("""
                UPDATE auth.users 
                SET encrypted_password = extensions.crypt(:pwd, extensions.gen_salt('bf')),
                    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"has_password": true}'::jsonb
                WHERE id = :user_id
                """),
                {"pwd": payload.password, "user_id": current_user.id}
            )
        except Exception:
            await db.execute(
                text("""
                UPDATE auth.users 
                SET encrypted_password = crypt(:pwd, gen_salt('bf')),
                    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"has_password": true}'::jsonb
                WHERE id = :user_id
                """),
                {"pwd": payload.password, "user_id": current_user.id}
            )
        u_stmt = select(User).where(User.id == current_user.id)
        u_res = await db.execute(u_stmt)
        user = u_res.scalar_one_or_none()
        if user:
            user.is_verified = True
            user.status = UserStatus.ACTIVE

        await db.commit()
        return APIResponse(
            message="Password created successfully.",
            data=ResetPasswordSuccessResponseData(
                email=current_user.email,
                role=current_user.role,
                message="Password created successfully. You can now log in with either Google or email/password."
            )
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

