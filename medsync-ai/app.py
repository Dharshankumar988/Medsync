import time
import uuid
import psutil
import os
import asyncio
import torch
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.gzip import GZipMiddleware
from typing import Optional, List, Dict, Any

from utils.config import settings
from utils.logger import get_logger
from utils.image import validate_image_bytes, bytes_to_cv2, bytes_to_pil

from services.bone import BoneDetectionService
from services.brain import BrainDetectionService
from services.kidney import KidneyDetectionService
from services.skin import SkinClassificationService
import huggingface_hub
import numpy as np
from PIL import Image
import io

logger = get_logger("ai_microservice")
START_TIME = time.time()
security = HTTPBearer(auto_error=False)


def verify_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if settings.AI_SERVICE_TOKEN:
        if not credentials or credentials.credentials != settings.AI_SERVICE_TOKEN:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or missing token",
                headers={"WWW-Authenticate": "Bearer"},
            )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SINGLETON MODEL MANAGER — Preloaded, zero re-init
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class SingletonModelManager:
    """
    Singleton that holds all model services in memory.
    Models are loaded ONCE at startup and never reloaded.
    Every prediction uses the already-initialized clients.
    """
    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if SingletonModelManager._initialized:
            return
        self._models: Dict[str, Any] = {
            "bone": None,
            "brain": None,
            "kidney": None,
            "skin": None,
        }
        self._health: Dict[str, Dict[str, Any]] = {}
        self._load_times: Dict[str, float] = {}
        self._warmup_latencies: Dict[str, float] = {}
        SingletonModelManager._initialized = True

    def _ensure_model_weights(self, scan_type: str, path: str):
        if not os.path.exists(path) or os.path.getsize(path) < 1000:
            logger.info(f"Downloading {scan_type} weights to {path}")
            repo_id = os.environ.get("HF_MODEL_REPO_ID", settings.HF_MODEL_REPO_ID)
            
            repo_mappings = {
                "bone": "bone.pt",
                "brain": "brain.pt",
                "kidney": "kidney.pt",
                "skin": "skin_model.pt"
            }
            filename = repo_mappings.get(scan_type)
            
            try:
                from huggingface_hub import hf_hub_download
                downloaded = hf_hub_download(
                    repo_id=repo_id,
                    filename=filename,
                    token=os.environ.get("HF_TOKEN", settings.HF_TOKEN),
                    cache_dir=settings.MODEL_CACHE_DIR,
                )
                import shutil
                shutil.copy(downloaded, path)
            except Exception as e:
                logger.error(f"Failed to download {filename} from {repo_id}: {e}")
                if os.path.exists(path):
                    os.remove(path)
                raise RuntimeError(f"MODEL UNAVAILABLE: Failed to download weights for {scan_type}")
                
        # Validate post download
        if not os.path.exists(path) or os.path.getsize(path) == 0:
            if os.path.exists(path):
                os.remove(path)
            raise RuntimeError(f"MODEL UNAVAILABLE: File {path} is missing or 0 bytes")
            
        try:
            with open(path, 'rb') as f:
                f.read(1)
        except Exception as e:
            raise RuntimeError(f"MODEL UNAVAILABLE: File {path} is not readable")

    def load_all_models(self):
        """Load ALL four models into memory. Called once at startup."""
        model_configs = [
            ("bone", settings.BONE_MODEL_PATH, BoneDetectionService),
            ("brain", settings.BRAIN_MODEL_PATH, BrainDetectionService),
            ("kidney", settings.KIDNEY_MODEL_PATH, KidneyDetectionService),
            ("skin", settings.SKIN_MODEL_PATH, SkinClassificationService),
        ]

        logger.info("[AI] Checking model weights...")

        for scan_type, model_path, service_cls in model_configs:
            start = time.time()
            try:
                self._ensure_model_weights(scan_type, model_path)
                service = service_cls(model_path)
                if getattr(service, "model", None) is None:
                    raise Exception("Model weights failed to load internally")
                self._models[scan_type] = service
                load_time = round(time.time() - start, 3)
                self._load_times[scan_type] = load_time
                self._health[scan_type] = {"status": "loaded", "load_time_s": load_time}
                
                # Retrieve classes and architecture for logging
                if scan_type == "skin":
                    arch = "EfficientNet-B0"
                    classes = "acne, eczema, fungal, infection, normal, psoriasis, tumor"
                    filename = "skin_model.pt"
                else:
                    arch = "YOLO"
                    classes = ", ".join(service.model.names.values()) if hasattr(service.model, "names") else ""
                    filename = f"{scan_type}.pt"
                    if scan_type == "bone":
                        filename = "bone.pt"
                    
                logger.info(f"\n[AI] {scan_type.upper()}")
                logger.info(f"[AI] Source: Hugging Face Model Repository")
                logger.info(f"[AI] File: {filename}")
                logger.info(f"[AI] Validation: PASS")
                logger.info(f"[AI] Architecture: {arch}")
                logger.info(f"[AI] Classes: {classes}")
                logger.info(f"[AI] Status: READY\n")
            except Exception as e:
                self._health[scan_type] = {"status": "failed", "error": str(e)}
                self._models[scan_type] = None
                logger.error(f"✗ Failed to load {scan_type} model: {e}")
                
        if all(v is not None for v in self._models.values()):
            logger.info("[AI] All 4 MedSync trained models READY")

    def warmup_all_models(self):
        """Run one dummy inference per model to warm up GPU/CPU caches."""
        logger.info("Running warmup inference on all models...")

        # Create dummy images for warmup
        dummy_np = np.zeros((224, 224, 3), dtype=np.uint8)
        dummy_pil = Image.new("RGB", (224, 224), color=(128, 128, 128))

        for scan_type, service in self._models.items():
            if service is None:
                self._warmup_latencies[scan_type] = -1
                continue
            try:
                start = time.time()
                if scan_type == "skin":
                    service.predict(dummy_pil)
                else:
                    service.predict(dummy_np)
                latency = round((time.time() - start) * 1000, 2)
                self._warmup_latencies[scan_type] = latency
                self._health[scan_type]["warmup_ms"] = latency
                self._health[scan_type]["status"] = "ready"
                logger.info(f"  ✓ {scan_type} warmup: {latency}ms")
            except Exception as e:
                self._warmup_latencies[scan_type] = -1
                self._health[scan_type]["status"] = "loaded_warmup_failed"
                self._health[scan_type]["warmup_error"] = str(e)
                logger.warning(f"  ⚠ {scan_type} warmup failed (model still usable): {e}")

    def get_service(self, scan_type: str):
        """Get a pre-loaded model service. Never re-initializes."""
        if scan_type not in self._models:
            raise ValueError(f"Invalid scan_type: {scan_type}. Allowed: {list(self._models.keys())}")
        service = self._models[scan_type]
        if service is None:
            raise RuntimeError(f"Model '{scan_type}' failed to load at startup and is unavailable.")
        return service

    def get_health(self) -> Dict[str, Any]:
        """Return per-model health status."""
        return {
            "models": self._health,
            "load_times": self._load_times,
            "warmup_latencies": self._warmup_latencies,
            "all_ready": all(
                h.get("status") == "ready" for h in self._health.values()
            ),
        }

    @property
    def available_models(self) -> List[str]:
        return [k for k, v in self._models.items() if v is not None]


# Global singleton instance
model_manager = SingletonModelManager()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LIFESPAN — Preload everything at startup
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.MODEL_DIR, exist_ok=True)
    os.makedirs(settings.MODEL_CACHE_DIR, exist_ok=True)

    logger.info("[AI] MedSync AI v2.0 starting")

    # Phase 1: Load all models into memory
    logger.info("Phase 1: Loading all models...")
    model_manager.load_all_models()

    # Phase 2: Warmup inference pings
    logger.info("Phase 2: Running warmup inferences...")
    model_manager.warmup_all_models()

    health = model_manager.get_health()
    ready_count = sum(1 for h in health["models"].values() if h.get("status") == "ready")
    total_count = len(health["models"])
    logger.info(f"═══ Startup complete: {ready_count}/{total_count} models ready ═══")

    yield

    logger.info("Application shutting down. Freeing memory.")
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


app = FastAPI(
    title=settings.APP_NAME,
    description="MedSync AI Inference Microservice — Preloaded Models, Zero Re-initialization",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=500)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ENDPOINTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/")
async def root():
    health = model_manager.get_health()
    return {
        "message": "MedSync AI Inference Microservice v2.0",
        "status": "ready" if health["all_ready"] else "degraded",
        "device": settings.DEVICE,
        "models_ready": model_manager.available_models,
    }


@app.get("/health")
@app.get("/api/v1/health")
async def health_check():
    process = psutil.Process()
    memory_info = process.memory_info()
    model_health = model_manager.get_health()

    return {
        "status": "operational" if model_health["all_ready"] else "degraded",
        "device": settings.DEVICE,
        "uptime_seconds": round(time.time() - START_TIME, 2),
        "memory_usage_mb": round(memory_info.rss / (1024 * 1024), 2),
        "gpu_available": torch.cuda.is_available(),
        "models": model_health["models"],
        "warmup_latencies_ms": model_health["warmup_latencies"],
        "all_models_ready": model_health["all_ready"],
    }


@app.get("/api/v1/diagnostics")
@app.get("/api/v1/readiness")
async def diagnostics():
    model_health = model_manager.get_health()
    
    def get_classes(scan_type):
        if scan_type == "skin":
            return ["acne", "eczema", "fungal", "infection", "normal", "psoriasis", "tumor"]
        elif scan_type == "brain":
            return ["glioma", "meningioma", "pituitary"]
        elif scan_type == "kidney":
            return ["kidney-stone"]
        elif scan_type == "bone":
            return ["fracture"]
        return []
        
    def get_arch(scan_type):
        return "EfficientNet-B0" if scan_type == "skin" else "YOLO"
        
    models_status = {}
    for scan_type, status_info in model_health["models"].items():
        if status_info.get("status") in ["ready", "loaded", "loaded_warmup_failed"]:
            models_status[scan_type] = {
                "status": "loaded",
                "architecture": get_arch(scan_type),
                "classes": get_classes(scan_type)
            }
        else:
            models_status[scan_type] = {
                "status": status_info.get("status", "failed")
            }

    return {
        "service": "medsync-ai",
        "version": "2.0",
        "status": "ready" if model_health["all_ready"] else "degraded",
        "models": models_status
    }


@app.post("/predict", dependencies=[Depends(verify_token)])
@app.post("/api/v1/predict", dependencies=[Depends(verify_token)])
async def predict(
    scan_type: str = Form(...),
    file: UploadFile = File(...),
):
    request_id = str(uuid.uuid4())[:8]
    start_time = time.time()
    logger.info(f"[{request_id}] Prediction request: type={scan_type}")

    # Validate scan_type
    if scan_type not in model_manager.available_models:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid or unavailable scan_type '{scan_type}'. Available: {model_manager.available_models}",
        )

    # Get pre-loaded service (zero initialization)
    try:
        service = model_manager.get_service(scan_type)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    try:
        image_bytes = await file.read()
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(image_bytes) > max_bytes:
            raise HTTPException(status_code=413, detail=f"File exceeds max size of {settings.MAX_UPLOAD_SIZE_MB}MB.")

        if not validate_image_bytes(image_bytes):
            raise HTTPException(status_code=400, detail="Corrupted or invalid image file.")

        # Run inference in threadpool to not block event loop
        if scan_type in ("bone", "brain", "kidney"):
            img = bytes_to_cv2(image_bytes)
            result_data = await asyncio.to_thread(service.predict, img)
        else:  # skin
            img = bytes_to_pil(image_bytes)
            result_data = await asyncio.to_thread(service.predict, img)

        processing_time = round(time.time() - start_time, 4)
        logger.info(f"[{request_id}] Inference complete in {processing_time}s")

        response = {
            "success": True,
            "scan_type": scan_type,
            "processing_time": processing_time,
        }
        response.update(result_data)
        return JSONResponse(content=response)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[{request_id}] Inference failure: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred during AI inference.")


@app.post("/api/v1/batch_predict", dependencies=[Depends(verify_token)])
async def batch_predict(
    scan_type: str = Form(...),
    files: List[UploadFile] = File(...),
):
    """Batch inference endpoint to process multiple images in one request."""
    if scan_type not in model_manager.available_models:
        raise HTTPException(status_code=400, detail=f"Invalid or unavailable scan_type.")

    try:
        service = model_manager.get_service(scan_type)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    results = []
    for file in files:
        try:
            image_bytes = await file.read()
            if not validate_image_bytes(image_bytes):
                results.append({"filename": file.filename, "error": "Invalid image"})
                continue

            if scan_type in ("bone", "brain", "kidney"):
                result_data = await asyncio.to_thread(service.predict, bytes_to_cv2(image_bytes))
            else:
                result_data = await asyncio.to_thread(service.predict, bytes_to_pil(image_bytes))

            result_data["filename"] = file.filename
            results.append(result_data)
        except Exception as e:
            results.append({"filename": file.filename, "error": str(e)})

    return JSONResponse(content={"success": True, "scan_type": scan_type, "results": results})


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 7860))
    uvicorn.run("app:app", host="0.0.0.0", port=port, log_level="info")
