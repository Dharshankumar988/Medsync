"""
Model Manager — Resolves endpoints and checks overall AI microservice status.
Inference caching/retries are now handled by InferenceService.
"""
import logging
from typing import Dict, Any
from app.ai.core.config import ai_config
from app.ai.core.inference_service import inference_service

logger = logging.getLogger("medsync.ai.model_manager")

class ModelManager:
    """Manages high-level AI model availability and endpoint resolution."""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
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
            
        raise ValueError(f"No configured endpoint for scan_type: {scan_type}")

    async def check_health(self) -> Dict[str, Any]:
        """Check health of the unified space via inference service."""
        return await inference_service.check_health()

    async def warmup(self) -> Dict[str, Any]:
        """Warm up the AI microservice."""
        return await inference_service.warmup()

model_manager = ModelManager()
