from fastapi import APIRouter, HTTPException, status
from app.schemas.response import APIResponse

router = APIRouter()

@router.post("/register", status_code=status.HTTP_410_GONE)
async def register():
    raise HTTPException(status_code=status.HTTP_410_GONE, detail="Use Supabase Auth directly from the client.")

@router.post("/login", status_code=status.HTTP_410_GONE)
async def login():
    raise HTTPException(status_code=status.HTTP_410_GONE, detail="Use Supabase Auth directly from the client.")
