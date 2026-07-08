from fastapi import APIRouter, Depends
from app.dependencies.auth import get_current_user
from app.schemas.response import APIResponse
from app.schemas.session import AuthenticatedPrincipal

router = APIRouter()

@router.get("/me", response_model=APIResponse[AuthenticatedPrincipal])
async def get_me(current_user: AuthenticatedPrincipal = Depends(get_current_user)):
    return APIResponse(message="Profile retrieved", data=current_user)
