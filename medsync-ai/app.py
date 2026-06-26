import time
import uuid
import psutil
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

from utils.config import settings
from utils.logger import get_logger
from utils.image import validate_image_bytes, bytes_to_cv2, bytes_to_pil

from services.bone import BoneDetectionService
from services.brain import BrainDetectionService
from services.kidney import KidneyDetectionService
from services.skin import SkinClassificationService

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

# Global Model Registry
models = {
    "bone": None,
    "brain": None,
    "kidney": None,
    "skin": None
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing AI Models... This may take a moment.")
    models["bone"] = BoneDetectionService(settings.BONE_MODEL_PATH)
    models["brain"] = BrainDetectionService(settings.BRAIN_MODEL_PATH)
    models["kidney"] = KidneyDetectionService(settings.KIDNEY_MODEL_PATH)
    models["skin"] = SkinClassificationService(settings.SKIN_MODEL_PATH)
    logger.info("Application started. Models loaded into global memory.")
    yield
    logger.info("Application shutting down. Freeing GPU/CPU memory.")
    models.clear()

app = FastAPI(
    title=settings.APP_NAME,
    description="Independent AI Inference Microservice for MedSync",
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

@app.get("/")
async def root():
    return {"message": "Welcome to MedSync AI Inference Microservice."}

@app.get("/health")
async def health_check():
    process = psutil.Process()
    memory_info = process.memory_info()
    
    loaded_models = {}
    for key, svc in models.items():
        loaded_models[key] = svc is not None and getattr(svc, 'model', None) is not None

    return {
        "status": "operational",
        "uptime_seconds": round(time.time() - START_TIME, 2),
        "memory_usage_mb": round(memory_info.rss / (1024 * 1024), 2),
        "loaded_models": loaded_models
    }

@app.post("/predict", dependencies=[Depends(verify_token)])
async def predict(
    scan_type: str = Form(...),
    file: UploadFile = File(...)
):
    request_id = str(uuid.uuid4())
    start_time = time.time()
    
    logger.info(f"[{request_id}] Received prediction request for type: {scan_type}")

    if scan_type not in models:
        logger.error(f"[{request_id}] Invalid scan_type: {scan_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid scan_type. Allowed values: {list(models.keys())}"
        )

    service = models[scan_type]
    if service is None or getattr(service, 'model', None) is None:
        logger.error(f"[{request_id}] Model for {scan_type} is not loaded.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"The model for {scan_type} is currently not loaded or unavailable."
        )

    try:
        image_bytes = await file.read()
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(image_bytes) > max_bytes:
            logger.error(f"[{request_id}] File too large. Max: {settings.MAX_UPLOAD_SIZE_MB}MB")
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[{request_id}] Failed to read uploaded file: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to read file.")

    if not validate_image_bytes(image_bytes):
        logger.error(f"[{request_id}] Corrupted or invalid image file uploaded.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image file.")

    try:
        result_data = None
        
        # Branch based on model requirements (OpenCV vs PIL)
        if scan_type in ["bone", "brain", "kidney"]:
            img_np = bytes_to_cv2(image_bytes)
            result_data = service.predict(img_np)
        elif scan_type == "skin":
            img_pil = bytes_to_pil(image_bytes)
            result_data = service.predict(img_pil)

        processing_time = round(time.time() - start_time, 4)
        logger.info(f"[{request_id}] Inference successful. Latency: {processing_time}s")

        response = {
            "success": True,
            "scan_type": scan_type,
            "processing_time": processing_time
        }
        response.update(result_data)
        return JSONResponse(content=response)

    except Exception as e:
        logger.error(f"[{request_id}] Inference failure: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during AI inference."
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8080, log_level="info")
