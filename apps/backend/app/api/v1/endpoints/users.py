from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.schemas.response import APIResponse
from app.schemas.session import AuthenticatedPrincipal
from app.services.storage import StorageService
from app.models.user import User

router = APIRouter()

@router.get("/me", response_model=APIResponse[AuthenticatedPrincipal])
async def get_me(current_user: AuthenticatedPrincipal = Depends(get_current_user)):
    return APIResponse(message="Profile retrieved", data=current_user)

@router.post("/me/profile-image", response_model=APIResponse)
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Uploads and updates the user's profile image."""
    content_type = (file.content_type or "").lower()
    allowed_types = {"image/png", "image/jpeg", "image/jpg"}
    if content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG and PNG images are allowed.")
        
    file_bytes = await file.read()
    max_size = 5 * 1024 * 1024  # 5MB
    if len(file_bytes) > max_size:
        raise HTTPException(status_code=400, detail="File size exceeds the 5MB limit.")
        
    # Upload to storage
    public_url = await StorageService.upload_profile_image(
        user_id=str(current_user.id),
        file_bytes=file_bytes,
        filename=file.filename,
        content_type=content_type
    )
    
    # Update DB
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.profile_image_url = public_url
    await db.commit()
    
    return APIResponse(message="Profile image updated successfully", data={"profile_image_url": public_url})
