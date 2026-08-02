from fastapi import APIRouter
from app.core.config import settings
from app.blockchain.provider import blockchain_gateway
from app.blockchain.config import blockchain_settings
import time
import time as time_module
import asyncio

_health_cache = {"data": None, "expires": 0}

async def _get_cached_blockchain_health():
    now = time_module.time()
    if _health_cache["data"] is not None and now < _health_cache["expires"]:
        return _health_cache["data"]
    try:
        health_data = await asyncio.to_thread(blockchain_gateway.get_health)
        _health_cache["data"] = health_data
        _health_cache["expires"] = now + 30  # 30 second TTL
        return health_data
    except Exception:
        return None

router = APIRouter()
START_TIME = time.time()


def _is_placeholder_database_url(value: str) -> bool:
    return "supabase-host.supabase.co" in value or "supabase_password" in value

@router.get("/")
async def system_health():
    blockchain_status = "unreachable"
    rpc_url = blockchain_settings.POLYGON_RPC_URL
    try:
        health_data = await _get_cached_blockchain_health()
        blockchain_status = "connected" if health_data and health_data.get("status") == "healthy" else "unreachable"
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
