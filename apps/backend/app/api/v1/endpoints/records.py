from fastapi import APIRouter, Depends, UploadFile, File, Form, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from typing import List, Optional, Any
from pydantic import BaseModel
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import UserRole
from app.schemas.response import APIResponse
from app.schemas.session import AuthenticatedPrincipal
from app.schemas.record import (
    MedicalRecordCreate,
    MedicalRecordResponse,
    RecordPermissionCreate,
    DoctorNoteCreate,
    DoctorNoteResponse,
    RecordDownloadResponse,
    RecordConsentUpdate,
    RecordConsentResponse,
    PermissionActionResponse,
    DoctorAccessibleRecordResponse,
)
from app.services.record import MedicalRecordService
from app.services.permission import PermissionService
from app.services.doctor_note import DoctorNoteService
from app.repositories.record import record_repo
from app.models.record import MedicalRecord, MedicalRecordVersion, FileMetadata, RecordPermission, DoctorNote
from app.services.storage import StorageService

router = APIRouter()
require_patient = RoleChecker([UserRole.PATIENT])
require_doctor = RoleChecker([UserRole.DOCTOR])

@router.post("", response_model=APIResponse[MedicalRecordResponse], status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=APIResponse[MedicalRecordResponse], status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def upload_record(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    is_prescription: Any = Form(False),
    pin: str = Form(...),
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_patient)
):
    from app.services.security_service import validate_patient_pin
    from fastapi import HTTPException
    
    is_valid = await validate_patient_pin(db, current_user.id, pin)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid Authorization PIN.")

    parsed_is_prescription = False
    if isinstance(is_prescription, str):
        parsed_is_prescription = is_prescription.lower() in ("true", "1", "yes")
    elif isinstance(is_prescription, bool):
        parsed_is_prescription = is_prescription

    clean_desc = description.strip() if description and isinstance(description, str) else None
    req = MedicalRecordCreate(title=title, description=clean_desc)
    record = await MedicalRecordService.upload_record(db, req, file, current_user.id, current_user.id, is_prescription=parsed_is_prescription)
    
    response_data = MedicalRecordResponse.model_validate(record)
    response_data.qr_token = f"QR-REC-{record.id}"
    return APIResponse(message="Record uploaded successfully", data=response_data)

@router.get("", response_model=APIResponse[List[MedicalRecordResponse]])
@router.get("/", response_model=APIResponse[List[MedicalRecordResponse]], include_in_schema=False)
async def list_my_records(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_patient)
):
    records = await record_repo.get_by_patient(db, current_user.id)
    return APIResponse(message="Records retrieved", data=records)

class GrantPermissionReq(BaseModel):
    granted_to: uuid.UUID
    expires_at: str = None
    pin: str

@router.post("/{record_id}/permissions", response_model=APIResponse[PermissionActionResponse])
async def grant_permission(
    record_id: uuid.UUID,
    req: GrantPermissionReq,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_patient)
):
    from app.services.security_service import validate_patient_pin
    is_valid = await validate_patient_pin(db, current_user.id, req.pin)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid Authorization PIN.")

    record = await record_repo.get(db, record_id)
    if not record or record.patient_id != current_user.id:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("You don't own this record")
        
    await PermissionService.grant_permission(db, record_id, current_user.id, req.granted_to, req.expires_at)
    return APIResponse(
        message="Permission granted successfully",
        data=PermissionActionResponse(status="GRANTED", message="Access granted to consulting doctor")
    )

@router.post("/{record_id}/consent", response_model=APIResponse[RecordConsentResponse])
async def update_record_consent(
    record_id: uuid.UUID,
    req: RecordConsentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_patient)
):
    record = await record_repo.get(db, record_id)
    if not record or record.patient_id != current_user.id:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("You don't own this record")

    # Query existing PUBLIC permission
    stmt = select(RecordPermission).where(
        RecordPermission.record_id == record_id,
        RecordPermission.access_level == "PUBLIC"
    )
    res = await db.execute(stmt)
    pub_perm = res.scalar_one_or_none()

    desc = record.description or ""
    clean_desc = desc.replace("[PUBLIC]", "").strip()

    if req.is_public:
        if pub_perm:
            pub_perm.is_revoked = False
        else:
            db.add(RecordPermission(
                record_id=record_id,
                granted_to=uuid.UUID("00000000-0000-0000-0000-000000000000"),
                granted_by=current_user.id,
                access_level="PUBLIC",
                is_revoked=False
            ))
        record.description = f"{clean_desc} [PUBLIC]".strip()
    else:
        if pub_perm:
            pub_perm.is_revoked = True
        record.description = clean_desc if clean_desc else None

    await db.commit()
    await db.refresh(record)

    return APIResponse(
        message=f"Record consent updated to {'PUBLIC' if req.is_public else 'PRIVATE'}",
        data=RecordConsentResponse(
            record_id=record.id,
            is_public=req.is_public,
            status="PUBLIC" if req.is_public else "PRIVATE"
        )
    )

@router.get("/doctor-records", response_model=APIResponse[List[DoctorAccessibleRecordResponse]])
async def list_doctor_accessible_records(
    patient_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor)
):
    from app.models.patient import Patient
    from app.models.user import User

    # Query all active permissions
    perm_stmt = select(RecordPermission).where(RecordPermission.is_revoked.is_(False))
    perm_res = await db.execute(perm_stmt)
    all_perms = perm_res.scalars().all()

    public_record_ids = {p.record_id for p in all_perms if p.access_level == "PUBLIC"}
    directly_shared_ids = {p.record_id for p in all_perms if p.granted_to == current_user.id}

    query = (
        select(MedicalRecord)
        .where(MedicalRecord.is_archived.is_(False))
        .order_by(MedicalRecord.created_at.desc())
    )
    if patient_id:
        query = query.where(MedicalRecord.patient_id == patient_id)

    res = await db.execute(query)
    all_records = res.scalars().all()

    allowed = []
    for r in all_records:
        is_pub = r.id in public_record_ids or (r.description and "[PUBLIC]" in r.description)
        is_shared = r.id in directly_shared_ids
        is_uploader = r.uploaded_by == current_user.id
        if is_pub or is_shared or is_uploader:
            pat_stmt = select(Patient.full_name).where(Patient.user_id == r.patient_id)
            pat_res = await db.execute(pat_stmt)
            p_name = pat_res.scalar_one_or_none()
            if not p_name:
                u_stmt = select(User.full_name).where(User.id == r.patient_id)
                u_res = await db.execute(u_stmt)
                p_name = u_res.scalar_one_or_none() or "Patient"

            v_stmt = select(MedicalRecordVersion.id).where(MedicalRecordVersion.record_id == r.id)
            v_res = await db.execute(v_stmt)
            version_ids = v_res.scalars().all()

            notes_list = []
            if version_ids:
                n_stmt = select(DoctorNote).where(DoctorNote.record_version_id.in_(version_ids)).order_by(DoctorNote.created_at.desc())
                n_res = await db.execute(n_stmt)
                notes_objs = n_res.scalars().all()
                for n in notes_objs:
                    notes_list.append(DoctorNoteResponse(
                        id=n.id,
                        note_text=n.note_text,
                        doctor_id=n.doctor_id,
                        created_at=n.created_at
                    ))

            clean_desc = r.description.replace("[PUBLIC]", "").strip() if r.description else None
            allowed.append(DoctorAccessibleRecordResponse(
                id=r.id,
                title=r.title,
                description=clean_desc,
                patient_id=r.patient_id,
                patient_name=p_name,
                uploaded_by=r.uploaded_by,
                created_at=r.created_at,
                is_public=bool(is_pub),
                is_direct_shared=bool(is_shared),
                doctor_notes=notes_list
            ))

    return APIResponse(message="Doctor accessible records retrieved", data=allowed)


@router.post("/versions/{version_id}/notes", response_model=APIResponse[DoctorNoteResponse])
async def add_doctor_note(
    version_id: uuid.UUID,
    req: DoctorNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor)
):
    stmt = select(MedicalRecordVersion).where(MedicalRecordVersion.id == version_id)
    v_res = await db.execute(stmt)
    version = v_res.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Record version not found")

    has_permission = await PermissionService.check_permission(db, version.record_id, current_user.id)
    if not has_permission:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("You do not have permission to add notes to this record")
        
    note = await DoctorNoteService.add_note(db, version_id, current_user.id, req)
    return APIResponse(message="Note added", data=note)

@router.post("/{record_id}/notes", response_model=APIResponse[DoctorNoteResponse])
async def add_doctor_note_by_record(
    record_id: uuid.UUID,
    req: DoctorNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor)
):
    stmt = (
        select(MedicalRecordVersion)
        .where(MedicalRecordVersion.record_id == record_id)
        .order_by(MedicalRecordVersion.version_number.desc())
        .limit(1)
    )
    v_res = await db.execute(stmt)
    version = v_res.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="No version found for this medical record")

    has_permission = await PermissionService.check_permission(db, record_id, current_user.id)
    if not has_permission:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("You do not have permission to add notes to this record")

    note = await DoctorNoteService.add_note(db, version.id, current_user.id, req)
    return APIResponse(message="Clinical referral note added", data=note)

class DownloadRecordReq(BaseModel):
    pin: Optional[str] = None

@router.post("/{record_id}/download", response_model=APIResponse[RecordDownloadResponse])
async def download_record(
    record_id: uuid.UUID,
    req: DownloadRecordReq = DownloadRecordReq(),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user)
):
    record = await record_repo.get(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    is_owner = record.patient_id == current_user.id
    is_doctor = current_user.role == UserRole.DOCTOR
    
    if current_user.role == UserRole.PATIENT:
        if not req.pin:
            raise HTTPException(status_code=400, detail="PIN is required for download.")
        from app.services.security_service import validate_patient_pin
        is_valid = await validate_patient_pin(db, current_user.id, req.pin)
        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid Authorization PIN.")
            
    if not is_owner and is_doctor:
        has_permission = await PermissionService.check_permission(db, record_id, current_user.id)
        if not has_permission:
            raise HTTPException(status_code=403, detail="You do not have access to this record")
    elif not is_owner:
        raise HTTPException(status_code=403, detail="You do not have access to this record")

    stmt = (
        select(FileMetadata, MedicalRecordVersion)
        .join(MedicalRecordVersion, MedicalRecordVersion.id == FileMetadata.version_id)
        .where(MedicalRecordVersion.record_id == record_id)
        .order_by(MedicalRecordVersion.version_number.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    row = result.first()
    
    storage_path = None
    file_hash = None
    file_meta_id = None

    if row:
        file_meta, version_data = row
        storage_path = file_meta.supabase_storage_path
        file_hash = file_meta.sha256_hash
        file_meta_id = file_meta.id
    else:
        v_stmt = (
            select(MedicalRecordVersion)
            .where(MedicalRecordVersion.record_id == record_id)
            .order_by(MedicalRecordVersion.version_number.desc())
            .limit(1)
        )
        v_res = await db.execute(v_stmt)
        version_data = v_res.scalar_one_or_none()
        if version_data and version_data.ipfs_cid:
            cid_str = version_data.ipfs_cid
            if cid_str.startswith("supabase://"):
                path_part = cid_str.replace("supabase://", "").split("#")[0]
                storage_path = path_part
                if "#sha256=" in cid_str:
                    file_hash = cid_str.split("#sha256=")[1]

    if not storage_path:
        # Generate on-demand verifiable A4 PDF with QR stamp
        from app.services.qr_pdf_service import QRPdfService
        token = f"QR-REC-{record.id}"
        qr_image = QRPdfService.generate_qr_code(token)
        created_str = record.created_at.strftime('%Y-%m-%d') if hasattr(record, 'created_at') and record.created_at else "Recent"
        raw_doc = f"MedSync Medical Record\nTitle: {record.title}\nDescription: {record.description or 'No clinical description provided.'}\nDate: {created_str}".encode("utf-8")
        base_pdf = QRPdfService.convert_to_pdf(raw_doc, f"{record.title}.txt")
        stamped_pdf = QRPdfService.stamp_qr_on_pdf(base_pdf, qr_image, token, title=record.title)

        try:
            storage_path, _, _, file_hash = await StorageService.upload_bytes(
                stamped_pdf,
                filename=f"{record.title}.pdf",
                content_type="application/pdf",
                patient_id=str(record.patient_id),
                record_id=str(record.id),
                version_number=1,
            )
        except Exception:
            storage_path = f"patients/{record.patient_id}/records/{record.id}/v1/{record.id}.pdf"
            file_hash = None

    signed_url = await StorageService.create_signed_download_url(storage_path, expires_in=300)
    
    # Log download event
    try:
        from sqlalchemy import text
        log_stmt = text("""
            INSERT INTO download_audit_logs (id, user_id, entity_type, entity_id) 
            VALUES (:id, :user_id, :type, :entity_id)
        """)
        await db.execute(log_stmt, {
            "id": uuid.uuid4(),
            "user_id": current_user.id,
            "type": "MEDICAL_RECORD",
            "entity_id": record_id
        })
        
        if file_meta_id:
            update_stmt = text("""
                UPDATE file_metadata SET 
                    download_count = download_count + 1,
                    last_downloaded = CURRENT_TIMESTAMP
                WHERE id = :id
            """)
            await db.execute(update_stmt, {"id": file_meta_id})
        await db.commit()
    except Exception as e:
        import logging
        logging.getLogger("medsync.records").warning(f"Download audit log update error: {e}")
    
    download_data = RecordDownloadResponse(
        record_id=str(record_id),
        url=signed_url,
        signed_url=signed_url,
        sha256_hash=file_hash,
    )
    return APIResponse(
        message="Download URL generated", 
        data=download_data
    )

