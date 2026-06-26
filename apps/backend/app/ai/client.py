import httpx
import logging
import asyncio
from typing import Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

class AIMicroserviceClient:
    def __init__(self):
        self.base_url = settings.AI_SERVICE_URL.rstrip("/")
        self.timeout = settings.AI_TIMEOUT
        self.headers = {}
        if settings.AI_SERVICE_TOKEN:
            self.headers["Authorization"] = f"Bearer {settings.AI_SERVICE_TOKEN}"

    async def predict(self, scan_type: str, image_bytes: bytes) -> Dict[str, Any]:
        url = f"{self.base_url}/predict"
        files = {"file": ("image.jpg", image_bytes, "image/jpeg")}
        data = {"scan_type": scan_type}
        
        # Simple retry logic (up to 3 times)
        max_retries = 3
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(
                        url, 
                        files=files, 
                        data=data, 
                        headers=self.headers
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
                response = await client.get(url, headers=self.headers)
                if response.status_code == 200:
                    return response.json()
                return {"status": "error", "message": f"HTTP {response.status_code}"}
        except Exception as e:
            logger.error(f"AI Microservice health check failed: {str(e)}")
            return {"status": "unreachable", "message": str(e)}

ai_client = AIMicroserviceClient()
