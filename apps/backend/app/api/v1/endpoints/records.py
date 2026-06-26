from fastapi import APIRouter, Depends, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from typing import List
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import User, UserRole
from app.schemas.response import APIResponse
from app.schemas.record import MedicalRecordCreate, MedicalRecordResponse, RecordPermissionCreate, DoctorNoteCreate, DoctorNoteResponse
from app.services.record import MedicalRecordService
from app.services.permission import PermissionService
from app.services.doctor_note import DoctorNoteService
from app.repositories.record import record_repo

router = APIRouter()
require_patient = RoleChecker([UserRole.PATIENT])
require_doctor = RoleChecker([UserRole.DOCTOR])

@router.post("/", response_model=APIResponse[MedicalRecordResponse], status_code=status.HTTP_201_CREATED)
async def upload_record(
    title: str = Form(...),
    description: str = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_patient)
):
    req = MedicalRecordCreate(title=title, description=description)
    record = await MedicalRecordService.upload_record(db, req, file, current_user.id, current_user.id)
    return APIResponse(message="Record uploaded successfully", data=record)

@router.get("/", response_model=APIResponse[List[MedicalRecordResponse]])
async def list_my_records(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_patient)
):
    records = await record_repo.get_by_patient(db, current_user.id)
    return APIResponse(message="Records retrieved", data=records)

@router.post("/{record_id}/permissions", response_model=APIResponse[dict])
async def grant_permission(
    record_id: uuid.UUID,
    req: RecordPermissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_patient)
):
    record = await record_repo.get(db, record_id)
    if not record or record.patient_id != current_user.id:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("You don't own this record")
        
    await PermissionService.grant_permission(db, record_id, current_user.id, req.granted_to, req.expires_at)
    return APIResponse(message="Permission granted successfully")

@router.post("/versions/{version_id}/notes", response_model=APIResponse[DoctorNoteResponse])
async def add_doctor_note(
    version_id: uuid.UUID,
    req: DoctorNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    # In a full implementation, check if the doctor has permission for this record
    note = await DoctorNoteService.add_note(db, version_id, current_user.id, req)
    return APIResponse(message="Note added", data=note)
