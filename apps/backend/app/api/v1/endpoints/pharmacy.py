from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import User, UserRole
from app.schemas.response import APIResponse

router = APIRouter()
require_pharmacy = RoleChecker([UserRole.PHARMACY])

@router.get("/inventory")
async def get_inventory(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_pharmacy)):
    return APIResponse(message="Inventory retrieved", data=[])
