"""
Inference Service — Wraps the AI Microservice client with health checks,
cold-start detection, caching, retries, and connection pooling.
"""
import hashlib
import logging
import time
import asyncio
from typing import Dict, Any, Optional
from collections import OrderedDict

import httpx

from app.core.config import settings
from app.ai.core.config import ai_config
from app.ai.core.exceptions import (
    DiagnosticTimeoutException, 
    DiagnosticServiceUnavailableException,
    DiagnosticInferenceException
)

logger = logging.getLogger("medsync.ai.inference")


class InferenceCache:
    """Simple LRU cache with TTL for inference results."""

    def __init__(self, max_size: int = 100, ttl_seconds: int = 600):
        self._cache: OrderedDict[str, Dict] = OrderedDict()
        self._max_size = max_size
        self._ttl = ttl_seconds

    def _make_key(self, scan_type: str, image_bytes: bytes) -> str:
        h = hashlib.md5(image_bytes).hexdigest()
        return f"{scan_type}:{h}"

    def get(self, scan_type: str, image_bytes: bytes) -> Optional[Dict]:
        key = self._make_key(scan_type, image_bytes)
        if key in self._cache:
            entry = self._cache[key]
            if time.time() - entry["ts"] < self._ttl:
                self._cache.move_to_end(key)
                return entry["data"]
            else:
                del self._cache[key]
        return None

    def put(self, scan_type: str, image_bytes: bytes, data: Dict):
        key = self._make_key(scan_type, image_bytes)
        self._cache[key] = {"data": data, "ts": time.time()}
        self._cache.move_to_end(key)
        while len(self._cache) > self._max_size:
            self._cache.popitem(last=False)


class InferenceService:
    """
    Production inference client with:
    - Persistent connection pooling
    - Cold-start detection and retry
    - Response caching
    - Health monitoring
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._base_url = settings.MEDSYNC_AI_URL.rstrip("/")
        self._timeout = float(ai_config.HF_REQUEST_TIMEOUT)
        self._max_retries = ai_config.HF_MAX_RETRIES
        self._cold_start_wait = ai_config.HF_COLD_START_WAIT
        self._headers = {}
        if settings.MEDSYNC_AI_TOKEN:
            self._headers["Authorization"] = f"Bearer {settings.MEDSYNC_AI_TOKEN}"

        # Persistent async client — connection pooling
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(self._timeout, connect=10.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=5),
        )
        self._cache = InferenceCache(
            max_size=ai_config.INFERENCE_CACHE_MAX_SIZE,
            ttl_seconds=ai_config.INFERENCE_CACHE_TTL,
        )
        self._endpoint_healthy = True
        self._last_health_check = 0
        self._initialized = True

    async def predict(self, scan_type: str, image_bytes: bytes) -> Dict[str, Any]:
        """
        Run inference with caching, retries, and cold-start handling.
        """
        # Check cache first
        cached = self._cache.get(scan_type, image_bytes)
        if cached is not None:
            logger.info(f"Cache hit for {scan_type} prediction")
            cached["from_cache"] = True
            return cached

        url = f"{self._base_url}/api/v1/predict"
        files = {"file": ("image.jpg", image_bytes, "image/jpeg")}
        data = {"scan_type": scan_type}

        last_error = None
        for attempt in range(self._max_retries):
            try:
                response = await self._client.post(
                    url, files=files, data=data, headers=self._headers
                )

                # Cold-start detection (HF Spaces returns 503 when sleeping)
                if response.status_code == 503:
                    logger.warning(
                        f"HF Space cold-starting (attempt {attempt + 1}/{self._max_retries}). "
                        f"Waiting {self._cold_start_wait}s..."
                    )
                    await asyncio.sleep(self._cold_start_wait)
                    continue

                response.raise_for_status()
                result = response.json()
                self._endpoint_healthy = True

                # Cache the result
                self._cache.put(scan_type, image_bytes, result)
                return result

            except httpx.TimeoutException as e:
                last_error = e
                logger.warning(f"Timeout on attempt {attempt + 1}/{self._max_retries}: {e}")
                await asyncio.sleep(2 ** attempt)
            except httpx.ConnectError as e:
                last_error = e
                self._endpoint_healthy = False
                logger.warning(f"Connection failed (attempt {attempt + 1}): {e}")
                await asyncio.sleep(2 ** attempt)
            except httpx.HTTPStatusError as e:
                last_error = e
                logger.warning(f"HTTP error {e.response.status_code} (attempt {attempt + 1})")
                if e.response.status_code >= 500:
                    await asyncio.sleep(2 ** attempt)
                else:
                    raise

        self._endpoint_healthy = False
        logger.error(f"Inference failed after {self._max_retries} attempts: {last_error}")
        
        if isinstance(last_error, httpx.TimeoutException):
            raise DiagnosticTimeoutException(f"AI inference timed out after {self._max_retries} retries.")
        elif isinstance(last_error, httpx.ConnectError) or (isinstance(last_error, httpx.HTTPStatusError) and last_error.response.status_code >= 500):
            raise DiagnosticServiceUnavailableException(f"AI inference unavailable after {self._max_retries} retries.")
        else:
            raise DiagnosticInferenceException(f"AI inference error: {last_error}")

    async def check_health(self) -> Dict[str, Any]:
        """Check the health of the AI microservice endpoint."""
        url = f"{self._base_url}/api/v1/health"
        try:
            response = await self._client.get(url, headers=self._headers, timeout=10.0)
            if response.status_code == 200:
                self._endpoint_healthy = True
                self._last_health_check = time.time()
                return response.json()
            return {"status": f"degraded (HTTP {response.status_code})"}
        except Exception as e:
            self._endpoint_healthy = False
            return {"status": "unreachable", "error": str(e)}

    @property
    def is_healthy(self) -> bool:
        return self._endpoint_healthy

    async def warmup(self):
        """Ping the health endpoint to wake up HF Space."""
        logger.info("Warming up HF Space endpoint...")
        result = await self.check_health()
        status = result.get("status", "unknown")
        logger.info(f"HF Space status: {status}")
        return result


# Singleton
inference_service = InferenceService()
