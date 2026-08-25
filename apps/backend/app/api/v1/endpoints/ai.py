from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request, Query
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
import logging
from typing import List, Optional

from app.dependencies.db import get_db
from app.dependencies.auth import RoleChecker
from app.models.user import UserRole
from app.schemas.response import APIResponse
from app.schemas.session import AuthenticatedPrincipal
from app.schemas.ai import (
    ChatRequest, ChatResponse, AIChatSessionResponse, 
    AIChatMessageResponse, SessionPinRequest, SessionRenameRequest,
    AIHealthResponse, ImageAnalysisResponse
)
from app.dependencies.rate_limit import limiter

# Services
from app.services.doctor_ai import DoctorAIService
from app.services.patient_ai import PatientAIService
from app.services.pharmacy_ai import PharmacyAIService
from app.services.admin_ai import AdminAIService
from app.ai.services.image_analysis import ImageAnalysisService
from app.ai.core.service_manager import ai_service_manager
from app.ai.core.orchestrator import AIOrchestrator
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
require_doctor_or_patient = RoleChecker([UserRole.DOCTOR, UserRole.PATIENT])

MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

# ==========================================
# UNIFIED PULSE ENDPOINTS
# ==========================================

@router.post("/pulse/chat", response_model=APIResponse[ChatResponse])
@limiter.limit("20/minute")
async def pulse_chat(
    request: Request,
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_any_user)
):
    try:
        role = current_user.role.value.lower()
        AIOrchestrator.validate_request(req.message, role)
        
        if role == "doctor":
            result = await DoctorAIService.handle_chat(db, current_user.id, req)
        elif role == "patient":
            result = await PatientAIService.handle_chat(db, current_user.id, req)
        elif role == "pharmacy":
            result = await PharmacyAIService.handle_chat(db, current_user.id, req)
        elif role == "admin":
            result = await AdminAIService.handle_chat(db, current_user.id, req)
        else:
            raise HTTPException(status_code=403, detail="Role not supported by PULSE")
            
        return APIResponse(message="Success", data=result)
    except AIException as e:
        error_code = getattr(e, "error_code", "INTERNAL_SERVER_ERROR")
        return JSONResponse(
            status_code=e.status_code,
            content={"success": False, "error": {"code": error_code, "message": e.message}}
        )
    except PermissionError as e:
        return JSONResponse(status_code=403, content={"success": False, "error": {"code": "AUTHORIZATION_ERROR", "message": str(e)}})
    except ValueError as e:
        return JSONResponse(status_code=400, content={"success": False, "error": {"code": "VALIDATION_ERROR", "message": str(e)}})
    except Exception as e:
        logger.error(f"PULSE chat failed for role {current_user.role.value}: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"success": False, "error": {"code": "INTERNAL_SERVER_ERROR", "message": "Internal AI service error."}})

@router.post("/pulse/chat/stream")
@limiter.limit("40/minute")
async def pulse_chat_stream(
    request: Request,
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_any_user)
):
    try:
        role = current_user.role.value.lower()
        AIOrchestrator.validate_request(req.message, role)
        
        if role == "doctor":
            generator = DoctorAIService.handle_chat_stream(db, current_user.id, req)
        elif role == "patient":
            generator = PatientAIService.handle_chat_stream(db, current_user.id, req)
        elif role == "pharmacy":
            generator = PharmacyAIService.handle_chat_stream(db, current_user.id, req)
        elif role == "admin":
            generator = AdminAIService.handle_chat_stream(db, current_user.id, req)
        else:
            raise HTTPException(status_code=403, detail="Role not supported by PULSE")
            
        return StreamingResponse(generator, media_type="text/event-stream")
    except AIException as e:
        error_code = getattr(e, "error_code", "INTERNAL_SERVER_ERROR")
        return JSONResponse(
            status_code=e.status_code,
            content={"success": False, "error": {"code": error_code, "message": e.message}}
        )
    except PermissionError as e:
        return JSONResponse(status_code=403, content={"success": False, "error": {"code": "AUTHORIZATION_ERROR", "message": str(e)}})
    except ValueError as e:
        return JSONResponse(status_code=400, content={"success": False, "error": {"code": "VALIDATION_ERROR", "message": str(e)}})
    except Exception as e:
        logger.error(f"PULSE stream failed for role {current_user.role.value}: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"success": False, "error": {"code": "INTERNAL_SERVER_ERROR", "message": "Internal AI service error."}})

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

@router.patch("/sessions/{session_id}/rename", response_model=APIResponse[AIChatSessionResponse])
async def rename_session(
    session_id: uuid.UUID,
    req: SessionRenameRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_any_user)
):
    try:
        session = await chat_session_repo.get(db, session_id)
        if not session or session.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this session.")
        
        session.title = req.title
        await db.commit()
        await db.refresh(session)
        return APIResponse(message="Session renamed", data=session)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Rename session failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to rename session.")

@router.get("/sessions/search", response_model=APIResponse[List[AIChatSessionResponse]])
async def search_sessions(
    q: str = Query(..., min_length=1, max_length=200),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_any_user)
):
    try:
        from sqlalchemy import select
        from app.models.ai_chat import AIChatSession
        
        result = await db.execute(
            select(AIChatSession)
            .filter(AIChatSession.user_id == current_user.id)
            .filter(AIChatSession.title.ilike(f"%{q}%"))
            .order_by(AIChatSession.created_at.desc())
        )
        sessions = list(result.scalars().all())
        return APIResponse(message="Search results", data=sessions)
    except Exception as e:
        logger.error(f"Search sessions failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to search sessions.")

# ==========================================
# IMAGE ANALYSIS & HEALTH
# ==========================================

@router.post("/analyze-image", response_model=APIResponse[ImageAnalysisResponse])
@limiter.limit("5/minute")
async def analyze_image(
    request: Request,
    file: UploadFile = File(...),
    scan_type: str = Form(default="bone"),
    patient_context: Optional[str] = Form(default=None),
    patient_id: Optional[uuid.UUID] = Form(default=None),
    session_id: Optional[uuid.UUID] = Form(default=None),
    version_id: Optional[uuid.UUID] = Form(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor)
):
    """
    Analyze a medical image using the AI pipeline:
    1. Route to correct HF model based on scan_type
    2. Get prediction + confidence
    3. Generate Groq explanations (clinical + patient-friendly)
    4. Return structured report
    """
    # Validate scan_type
    try:
        scan_type = AIOrchestrator.validate_scan_type(scan_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if current_user.role == UserRole.DOCTOR and patient_id:
        from app.services.permission import PermissionService
        if not await PermissionService.can_access_patient(db, current_user.id, patient_id):
            raise HTTPException(status_code=403, detail="Not authorized to analyze images for this patient.")

    # Validate file
    if file.content_type not in ALLOWED_MIME_TYPES:
        from app.ai.core.exceptions import InvalidImageException
        raise InvalidImageException("Invalid file type. Only JPEG, PNG, and WebP are supported.")
    
    image_bytes = await file.read()
    if len(image_bytes) > MAX_IMAGE_SIZE:
        from app.ai.core.exceptions import InvalidImageException
        raise InvalidImageException("File too large. Maximum size is 5MB.")
    if len(image_bytes) == 0:
        from app.ai.core.exceptions import InvalidImageException
        raise InvalidImageException("File is empty.")
        
    try:
        # Determine user role for explanation style
        user_role = "doctor" if current_user.role == UserRole.DOCTOR else "patient"
        
        # Parse patient context if provided
        parsed_context = None
        if patient_context:
            import json
            try:
                parsed_context = json.loads(patient_context)
            except json.JSONDecodeError:
                logger.warning("Invalid JSON for patient_context, ignoring.")
        
        # Run the complete image analysis pipeline
        result = await ImageAnalysisService.analyze(
            image_bytes=image_bytes,
            scan_type=scan_type,
            user_role=user_role,
            patient_context=parsed_context,
        )
        
        # Check if result is an error
        if result.get("error"):
            raise HTTPException(status_code=503, detail=result.get("message", "Image analysis failed."))

        # Image analyses belong to the same persistent PULSE timeline as chat.
        session = None
        if session_id:
            session = await chat_session_repo.get(db, session_id)
            if not session or session.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="Not authorized to access this session.")
        else:
            from app.models.ai_chat import AIChatSession
            session = AIChatSession(
                id=uuid.uuid4(), user_id=current_user.id,
                patient_id=patient_id if current_user.role == UserRole.DOCTOR else None,
                title="Image Analysis", is_doctor_mode=current_user.role == UserRole.DOCTOR,
            )
            db.add(session)
            await db.flush()
        from app.models.ai_chat import AIChatMessage, AIChatRole
        db.add(AIChatMessage(id=uuid.uuid4(), session_id=session.id, role=AIChatRole.USER,
                             content=f"Uploaded {scan_type} image for analysis."))
        db.add(AIChatMessage(id=uuid.uuid4(), session_id=session.id, role=AIChatRole.ASSISTANT,
                             content=__import__("json").dumps(result), model_used=f"medsync_{scan_type}"))
        result["session_id"] = session.id
        
        # Persist to database if version_id is provided
        if version_id:
            from app.models.record import MedicalRecordVersion, MedicalRecord, AIAnalysis
            from sqlalchemy import select
            import json
            
            stmt = select(MedicalRecordVersion, MedicalRecord).join(MedicalRecord).where(MedicalRecordVersion.id == version_id)
            ver_result = await db.execute(stmt)
            row = ver_result.first()
            if not row:
                raise HTTPException(status_code=404, detail="Medical record version not found")
                
            version_data, record_data = row
            
            if record_data.patient_id != current_user.id:
                if current_user.role == UserRole.DOCTOR:
                    from app.services.permission import PermissionService
                    has_perm = await PermissionService.check_permission(db, record_data.id, current_user.id)
                    if not has_perm:
                        raise HTTPException(status_code=403, detail="Unauthorized to modify this record")
                else:
                    raise HTTPException(status_code=403, detail="Unauthorized to modify this record")
            
            ai_record = AIAnalysis(
                version_id=version_id,
                model_name=f"medsync_{scan_type}_ai",
                analysis_status="COMPLETED",
                summary=json.dumps(result.get("clinical_summary", {})),
                confidence_score=result.get("prediction", {}).get("confidence"),
                processing_time_ms=result.get("metadata", {}).get("inference_time_ms")
            )
            db.add(ai_record)
            await db.commit()
            
        await db.commit()
        logger.info(f"Image analyzed: scan_type={scan_type} for user {current_user.id}")
        return APIResponse(message="Image Analyzed", data=result)
        
    except AIException as e:
        error_code = getattr(e, "error_code", "INTERNAL_SERVER_ERROR")
        return JSONResponse(
            status_code=e.status_code,
            content={"success": False, "error": {"code": error_code, "message": e.message}}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image analysis failed: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"success": False, "error": {"code": "INTERNAL_SERVER_ERROR", "message": "Internal image analysis error."}})

@router.get("/health", response_model=APIResponse[AIHealthResponse])
async def check_health(current_user: AuthenticatedPrincipal = Depends(require_any_user)):
    try:
        status = await ai_service_manager.get_health_status()
        return APIResponse(message="Health status retrieved", data=status)
    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve health status.")

@router.get("/health/ai")
async def check_health_ai(current_user: AuthenticatedPrincipal = Depends(require_any_user)):
    status = await ai_service_manager.get_health_status()
    return APIResponse(message="AI Health", data=status)

@router.get("/health/groq")
async def check_health_groq(current_user: AuthenticatedPrincipal = Depends(require_any_user)):
    status = await ai_service_manager.get_health_status()
    return APIResponse(message="Groq Health", data={"groq": status["components"].get("groq", "unknown")})

@router.get("/health/rag")
async def check_health_rag(current_user: AuthenticatedPrincipal = Depends(require_any_user)):
    status = await ai_service_manager.get_health_status()
    return APIResponse(message="RAG Health", data={"rag": status["components"].get("rag", "unknown")})

@router.get("/health/models")
async def check_health_models(current_user: AuthenticatedPrincipal = Depends(require_any_user)):
    status = await ai_service_manager.get_health_status()
    return APIResponse(message="Models Health", data={"diagnostic_models": status["components"].get("hf_spaces", {})})
