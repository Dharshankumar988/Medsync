from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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

router = APIRouter()

@router.post("/register", status_code=status.HTTP_410_GONE)
async def register():
    raise HTTPException(status_code=status.HTTP_410_GONE, detail="Use Supabase Auth directly from the client.")

@router.post("/login", status_code=status.HTTP_410_GONE)
async def login():
    raise HTTPException(status_code=status.HTTP_410_GONE, detail="Use Supabase Auth directly from the client.")

from pydantic import BaseModel
from app.schemas.auth import (
    ForgotPasswordRequest,
    ForgotPasswordResponseData,
    VerifyResetTokenResponseData,
    PatientResetPasswordRequest,
    ProviderResetPasswordRequest,
    ResetPasswordSuccessResponseData,
    AdminRegisterResponseData,
    ForceResetResponseData,
    SyncUserResponseData,
)
from app.utils.reset_token import (
    create_patient_reset_token,
    verify_patient_reset_token,
    consume_patient_reset_token,
)
from app.services.email_service import email_service
from app.core.config import settings

class ForceResetRequest(BaseModel):
    email: str
    new_password: str

class AdminRegisterRequest(BaseModel):
    email: str
    password: str

@router.post("/admin-register", response_model=APIResponse[AdminRegisterResponseData])
async def admin_register(payload: AdminRegisterRequest, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import text
    import uuid
    user_id = uuid.uuid4()
    try:
        await db.execute(
            text("""
            INSERT INTO auth.users (id, instance_id, email, encrypted_password, aud, role, email_confirmed_at) 
            VALUES (:id, '00000000-0000-0000-0000-000000000000', :email, crypt(:pwd, gen_salt('bf')), 'authenticated', 'authenticated', now())
            """), 
            {"id": user_id, "email": payload.email, "pwd": payload.password}
        )
        await db.commit()
        return APIResponse(message="User created", data=AdminRegisterResponseData(id=str(user_id)))
    except Exception as e:
        await db.rollback()
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
    - Admin: Password reset strictly forbidden.
    - Doctor / Pharmacy: Redirects directly to the provider reset password page (always up).
    - Patient: Dispatches a cryptographically signed reset link via Python SMTP, valid for 5 minutes only.
    """
    target_email = payload.email.strip().lower()
    
    result = await db.execute(select(User).where(User.email == target_email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account registered with this email address."
        )
        
    # 1. Admin Role -> Denied
    if user.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password reset is not permitted for Administrator accounts. Please contact system security."
        )
        
    # 2. Doctor or Pharmacy Role -> Direct redirect to provider reset page (always up)
    if user.role in [UserRole.DOCTOR, UserRole.PHARMACY, UserRole.HOSPITAL]:
        redirect_url = f"/provider-reset-password?email={target_email}"
        return APIResponse(
            message=f"{user.role.value.capitalize()} redirecting to provider password reset",
            data=ForgotPasswordResponseData(
                action="REDIRECT",
                role=user.role.value,
                redirect_url=redirect_url,
                email=target_email,
                message=f"Redirecting {user.role.value.capitalize()} to instant password reset portal."
            )
        )
        
    # 3. Patient Role -> Send 5-minute cryptographic reset link via Python SMTP
    if user.role == UserRole.PATIENT:
        token = create_patient_reset_token(target_email, expire_minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)
        
        patient_stmt = select(Patient).where(Patient.user_id == user.id)
        pat_res = await db.execute(patient_stmt)
        patient = pat_res.scalar_one_or_none()
        patient_name = patient.full_name if (patient and patient.full_name) else "Patient"
        
        frontend_url = settings.FRONTEND_URL.rstrip('/')
        reset_link = f"{frontend_url}/patient/reset-password?token={token}&email={target_email}"

        dummy_domains = ("@medsync.com", "@example.com", "@test.com", "@dummy.com", "@demo.com", "@local.dev")
        is_dummy = any(target_email.endswith(dom) for dom in dummy_domains) or target_email.startswith(("dummy", "test-patient", "demo-patient"))

        if is_dummy:
            return APIResponse(
                message="This is a demo/dummy patient account. Password reset emails can only be delivered to actual registered email addresses.",
                data=ForgotPasswordResponseData(
                    action="DUMMY_ACCOUNT",
                    role="PATIENT",
                    redirect_url=None,
                    email=target_email,
                    message="This is a demo/dummy patient account. Password reset emails can only be delivered to actual registered email addresses.",
                    preview_url=reset_link
                )
            )
        
        email_result = email_service.send_patient_password_reset_email(
            to_email=target_email,
            patient_name=patient_name,
            reset_link=reset_link
        )
        
        return APIResponse(
            message="Password reset link sent to your registered email.",
            data=ForgotPasswordResponseData(
                action="EMAIL_SENT",
                role="PATIENT",
                redirect_url=None,
                email=target_email,
                message="A one-time reset link valid for 5 minutes has been sent to your email.",
                preview_url=email_result.get("preview_link")
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
        result = await db.execute(
            text("UPDATE auth.users SET encrypted_password = crypt(:pwd, gen_salt('bf')) WHERE email = :email"),
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
    Resets the password for Doctor and Pharmacy accounts.
    Always up, direct reset without token requirement.
    Strictly forbids Admin and Patient accounts.
    """
    target_email = payload.email.strip().lower()
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    if payload.confirm_password and payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
        
    user_res = await db.execute(select(User).where(User.email == target_email))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="No provider account found with this email.")
        
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Password reset is not permitted for Administrator accounts.")
        
    if user.role == UserRole.PATIENT:
        raise HTTPException(
            status_code=403,
            detail="Patient accounts must use the verified 5-minute email reset link. Direct provider reset is disallowed."
        )
        
    from sqlalchemy import text
    try:
        result = await db.execute(
            text("UPDATE auth.users SET encrypted_password = crypt(:pwd, gen_salt('bf')) WHERE email = :email"),
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


@router.post("/sync", response_model=APIResponse[SyncUserResponseData])
async def sync_user(payload: UserSyncRequest, db: AsyncSession = Depends(get_db)):
    """
    Called by the frontend immediately after Supabase signup to create the corresponding
    backend records and profiles, along with VerificationRequests if needed.
    """
    try:
        # Check if user already exists
        existing = await db.execute(select(User).where(User.id == payload.id))
        if existing.scalar_one_or_none():
            return APIResponse(message="User already synced", data=SyncUserResponseData(id=str(payload.id)))

        if payload.role == UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin creation is not allowed publicly.")

        # Determine status (Patients are active and verified, others pending verification)
        is_patient = payload.role == UserRole.PATIENT
        
        # Override: allow everyone, don't bother with manual verification
        new_status = UserStatus.ACTIVE
        is_verified = True


        # Determine default avatar based on role and gender
        default_avatar = None
        gender = (payload.gender or "").upper()
        
        if payload.role == UserRole.PATIENT:
            if gender == "FEMALE":
                default_avatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=Jocelyn&backgroundColor=ffdfbf"
            else:
                default_avatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4"
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
                license_number=(payload.license_number or f"LIC-{str(new_user.id)[:8]}") + (f" | GST: {payload.gst_number}" if payload.gst_number else ""),
                experience_years=1,
                consultation_fee=500,
                doctor_status="PENDING",
                profile_picture_url=default_avatar
            )
            db.add(profile)
            await db.flush() # flush to get doctor profile id

            # Add location if private clinic
            if payload.clinic_name and payload.latitude and payload.longitude:
                # Create a Hospital record for the clinic so it appears on the map
                new_hospital = Hospital(
                    user_id=new_user.id,
                    name=payload.clinic_name,
                    address=payload.clinic_address or "Unknown",
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

                location = DoctorLocation(
                    doctor_id=profile.id,
                    location_type="CLINIC",
                    location_name=payload.clinic_name,
                    address=payload.clinic_address,
                    latitude=payload.latitude,
                    longitude=payload.longitude,
                    is_primary=True,
                    is_active=True
                )
                db.add(location)
            elif payload.hospital_name and payload.latitude and payload.longitude and not payload.hospital_id:
                # Register New Hospital flow
                # Check for duplicate
                existing_hosp = await db.execute(select(Hospital).where(Hospital.name.ilike(payload.hospital_name)))
                hosp = existing_hosp.scalars().first()
                if hosp:
                    profile.hospital_id = hosp.id
                else:
                    new_hospital = Hospital(
                        user_id=new_user.id,
                        name=payload.hospital_name,
                        address=payload.hospital_address or "Unknown",
                        latitude=payload.latitude,
                        longitude=payload.longitude,
                        is_active=True,
                        is_verified=False,
                        type=payload.facility_type or "hospital",
                        google_maps_url=payload.google_maps_url
                    )
                    db.add(new_hospital)
                    await db.flush()
                    profile.hospital_id = new_hospital.id

                location = DoctorLocation(
                    doctor_id=profile.id,
                    location_type="HOSPITAL",
                    hospital_id=profile.hospital_id,
                    is_primary=True,
                    is_active=True
                )
                db.add(location)
            elif payload.hospital_id:
                # Add hospital location link
                location = DoctorLocation(
                    doctor_id=profile.id,
                    location_type="HOSPITAL",
                    hospital_id=payload.hospital_id,
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
                
            profile = Pharmacy(
                user_id=new_user.id,
                business_name=payload.business_name or payload.full_name,
                license_number=payload.license_number or f"LIC-PHM-{str(new_user.id)[:8]}",
                gst_number=payload.gst_number,
                contact_number=payload.contact_number,
                address=payload.clinic_address or payload.hospital_address, # Fallback to clinic_address/hospital_address if payload uses those
                hospital_id=payload.hospital_id,
                clinic_name=payload.clinic_name,
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
        
        # Enqueue Blockchain Sync for Patient
        if payload.role == UserRole.PATIENT:
            try:
                from app.services.blockchain_sync import BlockchainSyncService, trigger_background_sync
                from app.models.blockchain import SyncEntityType, SyncActionType
                from app.blockchain.client import blockchain_client
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
                await db.commit()
                trigger_background_sync(task.id)
            except Exception as e:
                import logging
                logging.getLogger("medsync.auth").error(f"Error enqueueing blockchain task for patient: {e}")

        return APIResponse(message="User synced successfully", data=SyncUserResponseData(id=str(new_user.id)))
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.getLogger("medsync.auth").error(f"Failed to sync user: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database synchronization failed: {str(e)}")
