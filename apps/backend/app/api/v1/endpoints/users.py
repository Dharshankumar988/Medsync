from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.schemas.response import APIResponse
from app.schemas.session import AuthenticatedPrincipal
from app.schemas.user import ProfileImageResponseData, AvatarUpdateRequest
from app.services.storage import StorageService
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor

router = APIRouter()

@router.get("/me", response_model=APIResponse[AuthenticatedPrincipal])
async def get_me(current_user: AuthenticatedPrincipal = Depends(get_current_user)):
    return APIResponse(message="Profile retrieved", data=current_user)

@router.post("/me/profile-image", response_model=APIResponse[ProfileImageResponseData])
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Uploads and updates the user's profile image."""
    content_type = (file.content_type or "").lower()
    allowed_types = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
    if content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WEBP images are allowed.")
        
    file_bytes = await file.read()
    max_size = 5 * 1024 * 1024  # 5MB
    if len(file_bytes) > max_size:
        raise HTTPException(status_code=400, detail="File size exceeds the 5MB limit.")
        
    # Upload to storage
    public_url = await StorageService.upload_profile_image(
        user_id=str(current_user.id),
        file_bytes=file_bytes,
        filename=file.filename or "avatar.jpg",
        content_type=content_type
    )
    
    # Update DB
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.profile_image_url = public_url

    if user.role == UserRole.PATIENT:
        pat_res = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
        pat = pat_res.scalar_one_or_none()
        if pat:
            pat.profile_picture_url = public_url
    elif user.role == UserRole.DOCTOR:
        doc_res = await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
        doc = doc_res.scalar_one_or_none()
        if doc:
            doc.profile_picture_url = public_url

    await db.commit()
    
    return APIResponse(
        message="Profile image updated successfully",
        data=ProfileImageResponseData(profile_image_url=public_url)
    )

@router.put("/me/avatar", response_model=APIResponse[ProfileImageResponseData])
async def update_my_avatar(
    payload: AvatarUpdateRequest,
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Updates avatar URL (e.g. from preset avatar selection or Google photo)."""
    avatar_url = payload.avatar_url.strip()
    if not avatar_url:
        raise HTTPException(status_code=400, detail="Avatar URL cannot be empty")

    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.profile_image_url = avatar_url

    if user.role == UserRole.PATIENT:
        pat_res = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
        pat = pat_res.scalar_one_or_none()
        if pat:
            pat.profile_picture_url = avatar_url
    elif user.role == UserRole.DOCTOR:
        doc_res = await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
        doc = doc_res.scalar_one_or_none()
        if doc:
            doc.profile_picture_url = avatar_url

    await db.commit()

    return APIResponse(
        message="Avatar updated successfully",
        data=ProfileImageResponseData(profile_image_url=avatar_url)
    )
