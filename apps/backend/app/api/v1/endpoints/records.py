from fastapi import APIRouter, Depends, UploadFile, File, Form, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from typing import List
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import UserRole
from app.schemas.response import APIResponse
from app.schemas.session import AuthenticatedPrincipal
from app.schemas.record import MedicalRecordCreate, MedicalRecordResponse, RecordPermissionCreate, DoctorNoteCreate, DoctorNoteResponse
from app.services.record import MedicalRecordService
from app.services.permission import PermissionService
from app.services.doctor_note import DoctorNoteService
from app.repositories.record import record_repo
from app.models.record import MedicalRecordVersion, FileMetadata
from app.services.storage import StorageService

router = APIRouter()
require_patient = RoleChecker([UserRole.PATIENT])
require_doctor = RoleChecker([UserRole.DOCTOR])

@router.post("/", response_model=APIResponse[MedicalRecordResponse], status_code=status.HTTP_201_CREATED)
async def upload_record(
    title: str = Form(...),
    description: str = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_patient)
):
    req = MedicalRecordCreate(title=title, description=description)
    record = await MedicalRecordService.upload_record(db, req, file, current_user.id, current_user.id)
    return APIResponse(message="Record uploaded successfully", data=record)

@router.get("/", response_model=APIResponse[List[MedicalRecordResponse]])
async def list_my_records(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_patient)
):
    records = await record_repo.get_by_patient(db, current_user.id)
    return APIResponse(message="Records retrieved", data=records)

@router.post("/{record_id}/permissions", response_model=APIResponse[dict])
async def grant_permission(
    record_id: uuid.UUID,
    req: RecordPermissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_patient)
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
    current_user: AuthenticatedPrincipal = Depends(require_doctor)
):
    # Check if the doctor has permission for this record
    has_permission = await PermissionService.check_permission(db, version_id, current_user.id)
    if not has_permission:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("You do not have permission to add notes to this record")
        
    note = await DoctorNoteService.add_note(db, version_id, current_user.id, req)
    return APIResponse(message="Note added", data=note)

@router.get("/{record_id}/download", response_model=APIResponse[dict])
async def download_record(
    record_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user)
):
    record = await record_repo.get(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    is_owner = record.patient_id == current_user.id
    is_doctor = current_user.role == "doctor"
    if not is_owner and is_doctor:
        has_permission = await PermissionService.check_permission(db, record_id, current_user.id)
        if not has_permission:
            raise HTTPException(status_code=403, detail="You do not have access to this record")
    elif not is_owner:
        raise HTTPException(status_code=403, detail="You do not have access to this record")

    stmt = (
        select(FileMetadata.supabase_storage_path)
        .join(MedicalRecordVersion, MedicalRecordVersion.id == FileMetadata.version_id)
        .where(MedicalRecordVersion.record_id == record_id)
        .order_by(MedicalRecordVersion.version_number.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    storage_path = result.scalar_one_or_none()
    if not storage_path:
        raise HTTPException(status_code=404, detail="No stored file found for this record")

    signed_url = await StorageService.create_signed_download_url(storage_path)
    return APIResponse(message="Download URL generated", data={"record_id": str(record_id), "signed_url": signed_url})
