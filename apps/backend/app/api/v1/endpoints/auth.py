from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db import get_db
from app.schemas.auth import UserRegistration, LoginRequest, Token
from app.schemas.user import UserResponse
from app.schemas.response import APIResponse
from app.services.auth import AuthService

router = APIRouter()

@router.post("/register", response_model=APIResponse[UserResponse], status_code=status.HTTP_201_CREATED)
async def register(req: UserRegistration, db: AsyncSession = Depends(get_db)):
    user = await AuthService.register_user(db, req)
    return APIResponse(message="User registered successfully", data=user)

@router.post("/login", response_model=APIResponse[Token])
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    token = await AuthService.authenticate_user(db, req)
    return APIResponse(message="Login successful", data=token)
