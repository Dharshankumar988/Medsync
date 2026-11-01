import os
import httpx
import logging
import asyncio
from typing import Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

class AIMicroserviceClient:
    def __init__(self):
        self.base_url = settings.MEDSYNC_AI_URL.rstrip("/")
        self.timeout = settings.AI_TIMEOUT

    def _get_headers(self) -> Dict[str, str]:
        token = (
            getattr(settings, "MEDSYNC_AI_TOKEN", "")
            or getattr(settings, "AI_SERVICE_TOKEN", "")
            or os.getenv("MEDSYNC_AI_TOKEN")
            or os.getenv("AI_SERVICE_TOKEN")
            or "ms_ai_4c9d769acd23f75fb396b9e09bec77a82218824c83cbad53"
        )
        headers = {}
        if token:
            clean_token = str(token).strip('"').strip("'").strip()
            headers["Authorization"] = f"Bearer {clean_token}"
        return headers

    @property
    def headers(self) -> Dict[str, str]:
        return self._get_headers()

    async def predict(self, scan_type: str, image_bytes: bytes) -> Dict[str, Any]:
        url = f"{self.base_url}/predict"
        files = {"file": ("image.jpg", image_bytes, "image/jpeg")}
        data = {"scan_type": scan_type}
        headers = self._get_headers()
        
        # Simple retry logic (up to 3 times)
        max_retries = 3
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(
                        url, 
                        files=files, 
                        data=data, 
                        headers=headers
                    )
                    response.raise_for_status()
                    return response.json()
            except (httpx.ConnectError, httpx.ReadTimeout, httpx.HTTPStatusError) as e:
                logger.warning(f"AI Microservice connection failed (Attempt {attempt + 1}/{max_retries}): {str(e)}")
                if attempt == max_retries - 1:
                    logger.error(f"AI Microservice predict completely failed after {max_retries} attempts.")
                    raise
                await asyncio.sleep(2 ** attempt)  # Exponential backoff

    async def check_health(self) -> Dict[str, Any]:
        url = f"{self.base_url}/health"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(url, headers=self._get_headers())
                if response.status_code == 200:
                    return response.json()
                return {"status": "error", "message": f"HTTP {response.status_code}"}
        except Exception as e:
            logger.error(f"AI Microservice health check failed: {str(e)}")
            return {"status": "unreachable", "message": str(e)}

ai_client = AIMicroserviceClient()
