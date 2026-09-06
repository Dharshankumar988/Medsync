import os
import io
import json
import numpy as np
import logging
from typing import List, Dict, Any, Tuple
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, Header
from pydantic import BaseModel
import cv2
import threading

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("face-service")

app = FastAPI(title="Face Verification Service (InsightFace+ONNX)", version="2.0.0")

# --- AUTHENTICATION ---
# A simple static token for service-to-service auth
STATIC_AUTH_TOKEN = os.getenv("FACE_VERIFICATION_AUTH_TOKEN")
if not STATIC_AUTH_TOKEN:
    logger.warning("FACE_VERIFICATION_AUTH_TOKEN is not set. Service is unauthenticated (not recommended for production).")

async def verify_token(authorization: str = Header(None)):
    if STATIC_AUTH_TOKEN:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Unauthorized")
        token = authorization.split(" ")[1]
        if token != STATIC_AUTH_TOKEN:
            raise HTTPException(status_code=401, detail="Unauthorized")
    return True

# --- MODEL INITIALIZATION ---
_face_analysis_app = None
_model_lock = threading.Lock()

def get_face_analysis_app():
    global _face_analysis_app
    if _face_analysis_app is None:
        with _model_lock:
            if _face_analysis_app is None:
                try:
                    from insightface.app import FaceAnalysis
                    # We use buffalo_l which contains det_10g.onnx and w600k_r50.onnx
                    # Explicitly use CPUExecutionProvider for standard deployments without GPU
                    _face_analysis_app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
                    _face_analysis_app.prepare(ctx_id=0, det_size=(640, 640))
                    logger.info("InsightFace FaceAnalysis (buffalo_l) initialized via ONNX Runtime.")
                except Exception as e:
                    logger.error(f"Failed to initialize InsightFace: {e}")
                    raise RuntimeError("Failed to load face model.")
    return _face_analysis_app

class FaceAuthenticationService:
    def _validate_image_quality(self, image: np.ndarray) -> bool:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        variance = cv2.Laplacian(gray, cv2.CV_64F).var()
        if variance < 50.0:  # Threshold for blurriness
            raise ValueError("POOR_IMAGE_QUALITY")
        return True

    def process_and_extract_face(self, image_bytes: bytes) -> Tuple[List[float], Dict[str, Any]]:
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("INVALID_IMAGE_FORMAT")
            
        self._validate_image_quality(image)
        
        # InsightFace processes BGR images natively
        app_model = get_face_analysis_app()
        faces = app_model.get(image)
        
        if len(faces) == 0:
            raise ValueError("FACE_NOT_DETECTED")
        if len(faces) > 1:
            raise ValueError("MULTIPLE_FACES")
            
        face = faces[0]
        embedding = face.normed_embedding.tolist()
        
        bbox = face.bbox.astype(int).tolist()
        metadata = {"box": bbox, "quality": "PASS"}
        return embedding, metadata

face_service = FaceAuthenticationService()

class VerificationResponse(BaseModel):
    verified: bool
    score: float
    threshold: float
    error: str = None

class EnrollmentResponse(BaseModel):
    embedding: List[float] = None
    error: str = None

class FaceInfo(BaseModel):
    bbox: List[int]

class DetectionResponse(BaseModel):
    faces_detected: int
    faces: List[FaceInfo]
    error: str = None

@app.on_event("startup")
async def startup_event():
    # Attempt to initialize the model on startup so the first request isn't slow
    try:
        get_face_analysis_app()
    except Exception as e:
        logger.warning(f"Could not warm up model on startup: {e}")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "face-verification", "stack": "insightface+onnx"}

@app.post("/detect", response_model=DetectionResponse, dependencies=[Depends(verify_token)])
async def detect(image: UploadFile = File(...)):
    try:
        image_bytes = await image.read()
        if len(image_bytes) == 0:
            return DetectionResponse(faces_detected=0, faces=[], error="EMPTY_IMAGE")
            
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return DetectionResponse(faces_detected=0, faces=[], error="INVALID_IMAGE_FORMAT")
            
        app_model = get_face_analysis_app()
        faces = app_model.get(img)
        
        face_infos = [{"bbox": face.bbox.astype(int).tolist()} for face in faces]
        return DetectionResponse(faces_detected=len(faces), faces=face_infos)
    except Exception as e:
        logger.error(f"Detection error: {e}")
        return DetectionResponse(faces_detected=0, faces=[], error="INTERNAL_ERROR")

@app.post("/enroll", response_model=EnrollmentResponse, dependencies=[Depends(verify_token)])
async def enroll(image: UploadFile = File(...)):
    try:
        image_bytes = await image.read()
        if len(image_bytes) == 0:
            return EnrollmentResponse(error="EMPTY_IMAGE")
            
        embedding, _ = face_service.process_and_extract_face(image_bytes)
        return EnrollmentResponse(embedding=embedding)
    except ValueError as ve:
        return EnrollmentResponse(error=str(ve))
    except Exception as e:
        logger.error(f"Enrollment error: {e}")
        return EnrollmentResponse(error="INTERNAL_ERROR")

@app.post("/verify", response_model=VerificationResponse, dependencies=[Depends(verify_token)])
async def verify(
    image: UploadFile = File(...),
    registered_embedding: str = Form(...)
):
    try:
        image_bytes = await image.read()
        if len(image_bytes) == 0:
            return VerificationResponse(verified=False, score=0, threshold=0, error="EMPTY_IMAGE")
            
        current_embedding, _ = face_service.process_and_extract_face(image_bytes)
        
        stored_emb_list = json.loads(registered_embedding)
        
        a = np.array(stored_emb_list)
        b = np.array(current_embedding)
        
        # Cosine similarity
        score = np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
        
        # Threshold for buffalo_l InsightFace embeddings is usually around 0.4 - 0.5 depending on strictness
        threshold = float(os.getenv("FACE_MATCH_THRESHOLD", "0.45"))
        
        is_verified = bool(score >= threshold)
        
        return VerificationResponse(verified=is_verified, score=float(score), threshold=float(threshold))
        
    except ValueError as ve:
        return VerificationResponse(verified=False, score=0, threshold=0, error=str(ve))
    except Exception as e:
        logger.error(f"Verification error: {e}")
        return VerificationResponse(verified=False, score=0, threshold=0, error="INTERNAL_ERROR")
