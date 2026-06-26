from fastapi import APIRouter
from app.core.config import settings
import time

router = APIRouter()
START_TIME = time.time()

@router.get("/")
async def system_health():
    return {
        "status": "operational",
        "version": settings.VERSION,
        "services": {
            "backend": "healthy",
            "database": "connected" if settings.DATABASE_URL else "not_configured",
            "ai": "available" if settings.GROQ_API_KEY else "not_configured",
            "blockchain": "placeholder",
            "ipfs": "placeholder",
        },
        "uptime_seconds": round(time.time() - START_TIME, 2),
        "environment": "development",
    }
