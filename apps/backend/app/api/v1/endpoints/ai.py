from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
import logging
from typing import List

from app.dependencies.db import get_db
from app.dependencies.auth import RoleChecker
from app.models.user import UserRole
from app.schemas.response import APIResponse
from app.schemas.session import AuthenticatedPrincipal
from app.schemas.ai import (
    ChatRequest, ChatResponse, AIChatSessionResponse, 
    AIChatMessageResponse, SessionPinRequest, 
    AIHealthResponse, ImageAnalysisResponse
)
import cv2
import numpy as np
import asyncio
from app.ai.services.groq_client import groq_client

# Services
from app.services.doctor_ai import DoctorAIService
from app.services.patient_ai import PatientAIService
from app.services.pharmacy_ai import PharmacyAIService
from app.services.admin_ai import AdminAIService
from app.ai.services.yolo import YOLOService
from app.ai.services.efficientnet import EfficientNetService
from app.ai.core.service_manager import ai_service_manager
from app.repositories.ai_chat import chat_session_repo, chat_message_repo
from app.ai.core.exceptions import AIException

logger = logging.getLogger("medsync.api.ai")

router = APIRouter()

# Role checkers
require_doctor = RoleChecker([UserRole.DOCTOR])
require_patient = RoleChecker([UserRole.PATIENT])
require_pharmacy = RoleChecker([UserRole.PHARMACY])
require_admin = RoleChecker([UserRole.ADMIN])
require_any_user = RoleChecker([UserRole.DOCTOR, UserRole.PATIENT, UserRole.PHARMACY, UserRole.ADMIN])

MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

# ==========================================
# DOCTOR ENDPOINTS
# ==========================================

@router.post("/doctor/chat", response_model=APIResponse[ChatResponse])
async def doctor_chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor)
):
    try:
        result = await DoctorAIService.handle_chat(db, current_user.id, req)
        return APIResponse(message="Success", data=result)
    except AIException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Doctor chat failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal AI service error.")

@router.post("/doctor/chat/stream")
async def doctor_chat_stream(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor)
):
    try:
        generator = DoctorAIService.handle_chat_stream(db, current_user.id, req)
        return StreamingResponse(generator, media_type="text/event-stream")
    except AIException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Doctor stream failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal AI service error.")

# ==========================================
# PATIENT ENDPOINTS
# ==========================================

@router.post("/patient/chat", response_model=APIResponse[ChatResponse])
async def patient_chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_patient)
):
    try:
        result = await PatientAIService.handle_chat(db, current_user.id, req)
        return APIResponse(message="Success", data=result)
    except AIException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Patient chat failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal AI service error.")

@router.post("/patient/chat/stream")
async def patient_chat_stream(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_patient)
):
    try:
        generator = PatientAIService.handle_chat_stream(db, current_user.id, req)
        return StreamingResponse(generator, media_type="text/event-stream")
    except AIException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Patient stream failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal AI service error.")

# ==========================================
# PHARMACY ENDPOINTS
# ==========================================

@router.post("/pharmacy/chat", response_model=APIResponse[ChatResponse])
async def pharmacy_chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_pharmacy)
):
    try:
        result = await PharmacyAIService.handle_chat(db, current_user.id, req)
        return APIResponse(message="Success", data=result)
    except AIException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Pharmacy chat failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal AI service error.")

@router.post("/pharmacy/chat/stream")
async def pharmacy_chat_stream(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_pharmacy)
):
    try:
        generator = PharmacyAIService.handle_chat_stream(db, current_user.id, req)
        return StreamingResponse(generator, media_type="text/event-stream")
    except AIException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Pharmacy stream failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal AI service error.")

# ==========================================
# ADMIN ENDPOINTS
# ==========================================

@router.post("/admin/chat", response_model=APIResponse[ChatResponse])
async def admin_chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_admin)
):
    try:
        result = await AdminAIService.handle_chat(db, current_user.id, req)
        return APIResponse(message="Success", data=result)
    except AIException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Admin chat failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal AI service error.")

@router.post("/admin/chat/stream")
async def admin_chat_stream(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_admin)
):
    try:
        generator = AdminAIService.handle_chat_stream(db, current_user.id, req)
        return StreamingResponse(generator, media_type="text/event-stream")
    except AIException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Admin stream failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal AI service error.")

# ==========================================
# SESSION MANAGEMENT
# ==========================================

@router.get("/sessions", response_model=APIResponse[List[AIChatSessionResponse]])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_any_user)
):
    try:
        sessions = await chat_session_repo.get_by_user(db, current_user.id)
        return APIResponse(message="Sessions retrieved", data=sessions)
    except Exception as e:
        logger.error(f"List sessions failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve sessions.")

@router.get("/sessions/{session_id}/messages", response_model=APIResponse[List[AIChatMessageResponse]])
async def get_session_messages(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_any_user)
):
    try:
        session = await chat_session_repo.get(db, session_id)
        if not session or session.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this session.")
        
        messages = await chat_message_repo.get_by_session(db, session_id)
        return APIResponse(message="Messages retrieved", data=messages)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get messages failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve messages.")

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_any_user)
):
    try:
        session = await chat_session_repo.get(db, session_id)
        if not session or session.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this session.")
        
        await db.delete(session)
        await db.commit()
        return APIResponse(message="Session deleted")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete session failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete session.")

@router.patch("/sessions/{session_id}/pin", response_model=APIResponse[AIChatSessionResponse])
async def pin_session(
    session_id: uuid.UUID,
    req: SessionPinRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_any_user)
):
    try:
        session = await chat_session_repo.get(db, session_id)
        if not session or session.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this session.")
        
        session.is_pinned = req.is_pinned
        await db.commit()
        await db.refresh(session)
        return APIResponse(message="Session pin status updated", data=session)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Pin session failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update session pin status.")

# ==========================================
# IMAGE ANALYSIS & HEALTH
# ==========================================

def _process_image_sync(image_bytes: bytes) -> bytes:
    """CPU-bound image preprocessing — runs in threadpool."""
    np_arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Corrupted or unreadable image file.")
    h, w = img.shape[:2]
    if max(h, w) > 1024:
        scale = 1024 / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)))
    _, buffer = cv2.imencode('.jpg', img)
    return buffer.tobytes()

@router.post("/analyze-image", response_model=APIResponse[ImageAnalysisResponse])
async def analyze_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor)
):
    # Validation
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, and WebP are supported.")
    
    image_bytes = await file.read()
    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="File is empty.")
        
    try:
        try:
            processed_bytes = await asyncio.to_thread(_process_image_sync, image_bytes)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # Run vision inference
        yolo_res = await YOLOService.analyze_image(processed_bytes)
        eff_res = await EfficientNetService.classify_image(processed_bytes)
        
        # Generate Clinical & Patient Summaries via LLM
        inference_summary = f"Object Detection: {yolo_res}\nClassification: {eff_res}"
        
        doctor_prompt = f"You are a Doctor AI. Based on the following raw image inference, write a brief, professional clinical summary of findings.\n{inference_summary}"
        patient_prompt = f"You are a Patient AI. Based on the following raw image inference, write a brief, reassuring, easy-to-understand explanation for a patient.\n{inference_summary}"
        
        clinical_summary, patient_explanation = await asyncio.gather(
            groq_client.generate_standard_response(
                system_prompt="You are Doctor Pulse AI. Be concise and clinical.",
                user_message=doctor_prompt
            ),
            groq_client.generate_standard_response(
                system_prompt="You are Patient Pulse AI. Be empathetic and clear.",
                user_message=patient_prompt
            )
        )
        
        data = {
            "yolo": yolo_res,
            "efficientnet": eff_res,
            "clinical_summary": clinical_summary,
            "patient_explanation": patient_explanation
        }
        
        logger.info(f"Image analyzed successfully for doctor {current_user.id}")
        return APIResponse(message="Image Analyzed", data=data)
        
    except AIException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal image analysis error.")

@router.get("/health", response_model=APIResponse[AIHealthResponse])
async def check_health(current_user: AuthenticatedPrincipal = Depends(require_any_user)):
    try:
        status = await ai_service_manager.get_health_status()
        return APIResponse(message="Health status retrieved", data=status)
    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve health status.")
