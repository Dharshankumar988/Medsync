from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db import get_db
from app.dependencies.auth import RoleChecker
from app.models.user import User, UserRole
from app.schemas.response import APIResponse
from app.schemas.ai import ChatRequest, ChatResponse
from app.services.doctor_ai import DoctorAIService
from app.services.patient_ai import PatientAIService
from app.ai.services.yolo import YOLOService
from app.ai.services.efficientnet import EfficientNetService

router = APIRouter()
require_doctor = RoleChecker([UserRole.DOCTOR])
require_patient = RoleChecker([UserRole.PATIENT])

@router.post("/doctor/chat", response_model=APIResponse[ChatResponse])
async def doctor_chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    result = await DoctorAIService.handle_chat(db, current_user.id, req)
    return APIResponse(message="Success", data=result)

@router.post("/patient/chat", response_model=APIResponse[ChatResponse])
async def patient_chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_patient)
):
    result = await PatientAIService.handle_chat(db, current_user.id, req)
    return APIResponse(message="Success", data=result)

@router.post("/analyze-image")
async def analyze_image(
    file: UploadFile = File(...),
    current_user: User = Depends(require_doctor)
):
    image_bytes = await file.read()
    yolo_res = await YOLOService.analyze_image(image_bytes)
    eff_res = await EfficientNetService.classify_image(image_bytes)
    return APIResponse(message="Image Analyzed", data={"yolo": yolo_res, "efficientnet": eff_res})
