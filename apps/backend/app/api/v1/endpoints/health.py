from fastapi import APIRouter
from app.core.config import settings
from app.blockchain.client import w3_client
from app.blockchain.config import blockchain_settings
import time

router = APIRouter()
START_TIME = time.time()


def _is_placeholder_database_url(value: str) -> bool:
    return "supabase-host.supabase.co" in value or "supabase_password" in value

@router.get("/")
async def system_health():
    blockchain_status = "unreachable"
    rpc_url = blockchain_settings.POLYGON_RPC_URL
    try:
        blockchain_status = "connected" if w3_client.w3.is_connected() else "unreachable"
    except Exception:
        blockchain_status = "unreachable"

    return {
        "status": "operational",
        "version": settings.VERSION,
        "services": {
            "backend": "healthy",
            "database": "connected" if settings.DATABASE_URL and not _is_placeholder_database_url(settings.DATABASE_URL) else "not_configured",
            "ai": "available" if settings.GROQ_API_KEY else "not_configured",
            "blockchain": blockchain_status,
            "ipfs": "not_configured",
        },
        "uptime_seconds": round(time.time() - START_TIME, 2),
        "environment": "development",
        "blockchain_network": "Polygon Amoy",
        "blockchain_rpc": rpc_url,
    }
