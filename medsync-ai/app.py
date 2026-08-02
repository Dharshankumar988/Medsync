import time
import uuid
import psutil
import os
import asyncio
import torch
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.gzip import GZipMiddleware
from typing import Optional, List

from utils.config import settings
from utils.logger import get_logger
from utils.image import validate_image_bytes, bytes_to_cv2, bytes_to_pil

from services.bone import BoneDetectionService
from services.brain import BrainDetectionService
from services.kidney import KidneyDetectionService
from services.skin import SkinClassificationService
import huggingface_hub

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

# Global Model Registry (Lazy Loaded)
models = {
    "bone": None,
    "brain": None,
    "kidney": None,
    "skin": None
}

def ensure_model_weights(scan_type: str, local_path: str):
    """Automatically download weights from Hugging Face Hub if empty (0 bytes) or missing."""
    try:
        if not os.path.exists(local_path) or os.path.getsize(local_path) == 0:
            logger.info(f"Model weights for {scan_type} missing or empty. Attempting to download from HF Hub...")
            if not settings.HF_TOKEN:
                logger.warning("No HF_TOKEN provided. Download may fail if repo is private.")
            
            filename = os.path.basename(local_path)
            
            # This requires huggingface_hub installed
            downloaded_path = huggingface_hub.hf_hub_download(
                repo_id=settings.HF_MODEL_REPO_ID,
                filename=filename,
                token=settings.HF_TOKEN,
                cache_dir=settings.MODEL_CACHE_DIR
            )
            
            # Symlink or move
            import shutil
            shutil.copy2(downloaded_path, local_path)
            logger.info(f"Successfully downloaded {filename}")
    except Exception as e:
        logger.error(f"Failed to download weights for {scan_type}: {e}")
        # Will continue, but inference will fail if weights are genuinely 0 bytes

def get_model_service(scan_type: str):
    """Lazy model loader. Minimizes cold start time by loading into RAM/VRAM only on first request."""
    if scan_type not in models:
        raise ValueError(f"Invalid scan_type: {scan_type}")
        
    if models[scan_type] is not None:
        return models[scan_type]
        
    logger.info(f"Lazy loading {scan_type} model onto {settings.DEVICE}...")
    try:
        if scan_type == "bone":
            ensure_model_weights("bone", settings.BONE_MODEL_PATH)
            models["bone"] = BoneDetectionService(settings.BONE_MODEL_PATH)
        elif scan_type == "brain":
            ensure_model_weights("brain", settings.BRAIN_MODEL_PATH)
            models["brain"] = BrainDetectionService(settings.BRAIN_MODEL_PATH)
        elif scan_type == "kidney":
            ensure_model_weights("kidney", settings.KIDNEY_MODEL_PATH)
            models["kidney"] = KidneyDetectionService(settings.KIDNEY_MODEL_PATH)
        elif scan_type == "skin":
            ensure_model_weights("skin", settings.SKIN_MODEL_PATH)
            models["skin"] = SkinClassificationService(settings.SKIN_MODEL_PATH)
            
        logger.info(f"{scan_type} model successfully loaded.")
        return models[scan_type]
    except Exception as e:
        logger.error(f"Failed to load {scan_type} model: {e}")
        models[scan_type] = None
        raise e

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Cold start optimization: Do NOT load models here. Just prepare directories.
    os.makedirs(settings.MODEL_DIR, exist_ok=True)
    os.makedirs(settings.MODEL_CACHE_DIR, exist_ok=True)
    
    logger.info(f"Application started on {settings.DEVICE}. Models will lazy-load on first request.")
    yield
    logger.info("Application shutting down. Freeing memory.")
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    models.clear()

app = FastAPI(
    title=settings.APP_NAME,
    description="Independent AI Inference Microservice for MedSync - Hugging Face Spaces Ready",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=500)

@app.get("/")
async def root():
    return {"message": "Welcome to MedSync AI Inference Microservice.", "status": "Ready", "device": settings.DEVICE}

@app.get("/health")
@app.get("/api/v1/health")
async def health_check():
    process = psutil.Process()
    memory_info = process.memory_info()
    
    loaded_models = {}
    for key, svc in models.items():
        loaded_models[key] = svc is not None and getattr(svc, 'model', None) is not None

    return {
        "status": "operational",
        "device": settings.DEVICE,
        "uptime_seconds": round(time.time() - START_TIME, 2),
        "memory_usage_mb": round(memory_info.rss / (1024 * 1024), 2),
        "gpu_available": torch.cuda.is_available(),
        "loaded_models": loaded_models
    }

@app.post("/predict", dependencies=[Depends(verify_token)])
@app.post("/api/v1/predict", dependencies=[Depends(verify_token)])
async def predict(
    scan_type: str = Form(...),
    file: UploadFile = File(...)
):
    request_id = str(uuid.uuid4())
    start_time = time.time()
    logger.info(f"[{request_id}] Received prediction request for type: {scan_type}")

    if scan_type not in models:
        raise HTTPException(status_code=400, detail=f"Invalid scan_type. Allowed: {list(models.keys())}")

    try:
        service = await asyncio.to_thread(get_model_service, scan_type)
    except Exception as e:
        logger.error(f"[{request_id}] Model loading failed: {e}")
        raise HTTPException(status_code=503, detail=f"Model for {scan_type} unavailable: {str(e)}")

    try:
        image_bytes = await file.read()
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(image_bytes) > max_bytes:
            raise HTTPException(status_code=413, detail=f"File exceeds max size of {settings.MAX_UPLOAD_SIZE_MB}MB.")
            
        if not validate_image_bytes(image_bytes):
            raise HTTPException(status_code=400, detail="Corrupted or invalid image file.")
            
        result_data = None
        if scan_type in ["bone", "brain", "kidney"]:
            img_np = bytes_to_cv2(image_bytes)
            result_data = service.predict(img_np)
        elif scan_type == "skin":
            img_pil = bytes_to_pil(image_bytes)
            result_data = service.predict(img_pil)

        processing_time = round(time.time() - start_time, 4)
        logger.info(f"[{request_id}] Inference successful. Latency: {processing_time}s")

        response = {"success": True, "scan_type": scan_type, "processing_time": processing_time}
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
    files: List[UploadFile] = File(...)
):
    """Batch inference endpoint to process multiple images in one request"""
    if scan_type not in models:
        raise HTTPException(status_code=400, detail=f"Invalid scan_type.")
        
    try:
        service = await asyncio.to_thread(get_model_service, scan_type)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Model unavailable: {str(e)}")
        
    results = []
    # OPTIMIZATION OPPORTUNITY: Images are processed sequentially in a loop.
    # Could be batched together for faster inference if models support batching.
    for file in files:
        try:
            image_bytes = await file.read()
            if not validate_image_bytes(image_bytes):
                results.append({"filename": file.filename, "error": "Invalid image"})
                continue
                
            if scan_type in ["bone", "brain", "kidney"]:
                result_data = service.predict(bytes_to_cv2(image_bytes))
            else:
                result_data = service.predict(bytes_to_pil(image_bytes))
                
            result_data["filename"] = file.filename
            results.append(result_data)
        except Exception as e:
            results.append({"filename": file.filename, "error": str(e)})
            
    return JSONResponse(content={"success": True, "scan_type": scan_type, "results": results})

if __name__ == "__main__":
    import uvicorn
    # 7860 is the standard port for Hugging Face Spaces
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run("app:app", host="0.0.0.0", port=port, log_level="info")
