from fastapi import APIRouter
from app.core.config import settings
from app.blockchain.provider import blockchain_gateway
from app.blockchain.config import blockchain_settings
import time
import time as time_module
import asyncio

_health_cache = {"data": None, "expires": 0}

from app.ai.core.service_manager import ai_service_manager

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
@router.get("", include_in_schema=False)
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

@router.get("/ai")
async def ai_health():
    try:
        status = await ai_service_manager.get_health_status()
        return {"status": "ok", "data": status}
    except Exception as e:
        return {"status": "error", "message": str(e)}

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies.db import get_db
from app.schemas.response import APIResponse
from app.schemas.admin import AdminSettingsResponse
from app.models.system import SystemSetting

@router.get("/system-config", response_model=APIResponse[AdminSettingsResponse])
async def get_system_public_config(
    db: AsyncSession = Depends(get_db)
):
    """
    Public system architecture configuration set by the Admin.
    Allows all client roles (patient, doctor, pharmacy, web, mobile) to synchronize
    with the Admin's chosen active backend without exposing administrative controls.
    """
    stmt = select(SystemSetting)
    result = await db.execute(stmt)
    settings_db = result.scalars().all()

    settings_dict = {
        "maintenance_mode": False,
        "strict_verification": True,
        "active_backend_mode": "render",
        "portable_tunnel_url": "https://entangled-dealmaker-storable.ngrok-free.dev",
        "rag_worker_url": "https://entangled-dealmaker-storable.ngrok-free.dev",
        "auto_failover": True,
        "render_url": "https://medsync-backend-rktc.onrender.com"
    }
    for s in settings_db:
        if s.key == "maintenance_mode" and s.value_bool is not None:
            settings_dict["maintenance_mode"] = s.value_bool
        elif s.key == "strict_verification" and s.value_bool is not None:
            settings_dict["strict_verification"] = s.value_bool
        elif s.key == "active_backend_mode" and s.value_str is not None:
            settings_dict["active_backend_mode"] = s.value_str
        elif s.key == "portable_tunnel_url" and s.value_str is not None:
            settings_dict["portable_tunnel_url"] = s.value_str
        elif s.key == "rag_worker_url" and s.value_str is not None:
            settings_dict["rag_worker_url"] = s.value_str
        elif s.key == "auto_failover" and s.value_bool is not None:
            settings_dict["auto_failover"] = s.value_bool

    return APIResponse(
        message="System configuration retrieved",
        data=AdminSettingsResponse(**settings_dict)
    )

