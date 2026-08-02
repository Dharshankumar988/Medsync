import logging
import httpx
from typing import Dict, Any, Optional
from app.ai.core.config import ai_config
from app.ai.core.exceptions import AIExternalServiceException, AIModelNotLoadedException

logger = logging.getLogger("medsync.ai.model_manager")

class ModelManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
            cls._instance._models = {}
            cls._instance.client = httpx.AsyncClient(timeout=30.0)
        return cls._instance

    async def get_endpoint(self, scan_type: str) -> str:
        """Resolve the best HF endpoint for the scan type"""
        unified = ai_config.HF_UNIFIED_SPACE_URL.rstrip("/")
        
        specific_urls = {
            "bone": ai_config.HF_BONE_SPACE_URL,
            "brain": ai_config.HF_BRAIN_SPACE_URL,
            "kidney": ai_config.HF_KIDNEY_SPACE_URL,
            "skin": ai_config.HF_SKIN_SPACE_URL
        }
        
        specific = specific_urls.get(scan_type, "")
        if specific and specific.strip():
            return specific.rstrip("/")
            
        if unified and unified.strip():
            return unified
            
        raise AIModelNotLoadedException(f"{scan_type} (no configured endpoints)")

    async def check_health(self) -> Dict[str, Any]:
        """Check health of the primary unified space"""
        unified = ai_config.HF_UNIFIED_SPACE_URL.rstrip("/")
        if not unified:
            return "unconfigured"
            
        try:
            headers = {"Authorization": f"Bearer {ai_config.HF_TOKEN}"} if ai_config.HF_TOKEN else {}
            response = await self.client.get(f"{unified}/health", headers=headers, timeout=5.0)
            if response.status_code == 200:
                return response.json()
            return f"degraded (HTTP {response.status_code})"
        except Exception as e:
            logger.warning(f"Model manager health check failed: {e}")
            return "unreachable"

model_manager = ModelManager()
