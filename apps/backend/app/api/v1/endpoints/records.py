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
    PatientDoctorPermissionItem,
    PatientAccessLogItem,
    PatientDoctorAccessOverview,
    RevokeDoctorAccessRequest,
    GrantDoctorAccessRequest,
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
    expires_at: Optional[str] = None
    pin: Optional[str] = None

@router.post("/{record_id}/permissions", response_model=APIResponse[PermissionActionResponse])
async def grant_permission(
    record_id: uuid.UUID,
    req: GrantPermissionReq,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_patient)
):
    if req.pin:
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
    from app.models.appointment import Appointment
    from app.models.prescription import Prescription
    from app.models.doctor_collaboration import DoctorReferral
    from app.models.consultation import Consultation
    from sqlalchemy import or_, union

    # 1. Identify patients treated / consulted with by this doctor
    appt_pats = select(Appointment.patient_id).where(Appointment.doctor_id == current_user.id)
    pres_pats = select(Prescription.patient_id).where(Prescription.doctor_id == current_user.id)
    ref_pats = select(DoctorReferral.patient_id).where(
        or_(
            DoctorReferral.referring_doctor_id == current_user.id,
            DoctorReferral.referred_to_doctor_id == current_user.id,
        )
    )
    cons_pats = select(Consultation.patient_id).where(Consultation.doctor_id == current_user.id)
    perm_pats = (
        select(MedicalRecord.patient_id)
        .join(RecordPermission, RecordPermission.record_id == MedicalRecord.id)
        .where(
            RecordPermission.granted_to == current_user.id,
            RecordPermission.is_revoked.is_(False),
        )
    )
    upload_pats = select(MedicalRecord.patient_id).where(MedicalRecord.uploaded_by == current_user.id)

    treated_pats_query = union(appt_pats, pres_pats, ref_pats, cons_pats, perm_pats, upload_pats)
    treated_res = await db.execute(treated_pats_query)
    treated_patient_ids = {pid for pid in treated_res.scalars().all() if pid is not None}

    # If patient_id param is provided, ensure we filter specifically for it
    if patient_id:
        p_res = await db.execute(select(Patient).where(or_(Patient.id == patient_id, Patient.user_id == patient_id)))
        target_pat = p_res.scalar_one_or_none()
        resolved_pid = target_pat.user_id if target_pat else patient_id
        treated_patient_ids = {resolved_pid}

    if not treated_patient_ids:
        return APIResponse(message="No treated patient records found", data=[])

    # Query all active permissions
    perm_stmt = select(RecordPermission).where(RecordPermission.is_revoked.is_(False))
    perm_res = await db.execute(perm_stmt)
    all_perms = perm_res.scalars().all()

    public_record_ids = {p.record_id for p in all_perms if p.access_level == "PUBLIC"}
    directly_shared_ids = {p.record_id for p in all_perms if p.granted_to == current_user.id}

    query = (
        select(MedicalRecord)
        .where(
            MedicalRecord.is_archived.is_(False),
            MedicalRecord.patient_id.in_(treated_patient_ids)
        )
        .order_by(MedicalRecord.created_at.desc())
    )

    res = await db.execute(query)
    all_records = res.scalars().all()

    # Pre-fetch patients in bulk
    all_patient_user_ids = {r.patient_id for r in all_records}
    patients_map = {}
    if all_patient_user_ids:
        p_stmt = select(Patient).where(Patient.user_id.in_(all_patient_user_ids))
        p_res = await db.execute(p_stmt)
        for pat in p_res.scalars().all():
            patients_map[pat.user_id] = pat

    users_map = {}
    missing_ids = all_patient_user_ids - set(patients_map.keys())
    if missing_ids:
        u_stmt = select(User).where(User.id.in_(missing_ids))
        u_res = await db.execute(u_stmt)
        for u in u_res.scalars().all():
            users_map[u.id] = u

    # Compute latest interaction per patient
    patient_latest_interaction = {}
    for r in all_records:
        if r.patient_id not in patient_latest_interaction or r.created_at > patient_latest_interaction[r.patient_id]:
            patient_latest_interaction[r.patient_id] = r.created_at

    allowed = []
    for r in all_records:
        is_pub = r.id in public_record_ids or (r.description and "[PUBLIC]" in r.description)
        is_shared = r.id in directly_shared_ids
        is_uploader = r.uploaded_by == current_user.id
        if is_pub or is_shared or is_uploader:
            pat = patients_map.get(r.patient_id)
            user_obj = users_map.get(r.patient_id)
            p_name = pat.full_name if pat else (user_obj.full_name if user_obj else "Patient")
            p_gender = pat.gender if pat else None
            p_dob = pat.date_of_birth if pat else None
            p_blood_group = pat.blood_group if pat else None
            p_phone = pat.phone_number if pat else None
            latest_interaction = patient_latest_interaction.get(r.patient_id, r.created_at)

            v_stmt = select(MedicalRecordVersion.id).where(MedicalRecordVersion.record_id == r.id)
            v_res = await db.execute(v_stmt)
            version_ids = v_res.scalars().all()

            notes_list = []
            if version_ids:
                n_stmt = select(DoctorNote).where(DoctorNote.version_id.in_(version_ids)).order_by(DoctorNote.created_at.desc())
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
                patient_gender=p_gender,
                patient_dob=p_dob,
                patient_blood_group=p_blood_group,
                patient_phone=p_phone,
                latest_interaction_at=latest_interaction,
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

@router.patch("/{record_id}/consent", response_model=APIResponse[RecordConsentResponse])
async def update_record_consent(
    record_id: uuid.UUID,
    payload: RecordConsentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user)
):
    record = await record_repo.get(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")
        
    is_owner = record.patient_id == current_user.id
    if not is_owner and str(current_user.role).upper() != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Only the patient or admin can modify consent")

    record.is_public = payload.is_public
    
    perm_stmt = select(RecordPermission).where(
        RecordPermission.record_id == record_id,
        RecordPermission.access_level == "PUBLIC"
    )
    perm_res = await db.execute(perm_stmt)
    perm = perm_res.scalar_one_or_none()
    
    if payload.is_public:
        if perm:
            perm.is_revoked = False
        else:
            db.add(RecordPermission(
                record_id=record_id,
                granted_to=current_user.id,
                granted_by=current_user.id,
                access_level="PUBLIC",
                is_revoked=False
            ))
    else:
        if perm:
            perm.is_revoked = True

    await db.commit()
    await db.refresh(record)

    return APIResponse(
        message="Record visibility consent updated successfully",
        data=RecordConsentResponse(
            record_id=record.id,
            is_public=record.is_public,
            status="PUBLIC" if record.is_public else "PRIVATE"
        )
    )

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
    is_doctor = str(current_user.role).upper() == UserRole.DOCTOR.value
    
    if str(current_user.role).upper() == UserRole.PATIENT.value:
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

@router.get("/{record_id}/raw")
async def download_record_raw(
    record_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user)
):
    from fastapi.responses import Response
    record = await record_repo.get(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    is_owner = record.patient_id == current_user.id
    is_doctor = str(current_user.role).upper() == UserRole.DOCTOR.value
    if not is_owner and is_doctor:
        has_permission = await PermissionService.check_permission(db, record_id, current_user.id)
        if not has_permission:
            raise HTTPException(status_code=403, detail="You do not have access to this record")
    elif not is_owner and str(current_user.role).upper() != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="You do not have access to this record")

    from app.services.qr_pdf_service import QRPdfService
    token = f"QR-REC-{record.id}"
    qr_image = QRPdfService.generate_qr_code(token)
    created_str = record.created_at.strftime('%Y-%m-%d') if hasattr(record, 'created_at') and record.created_at else "Recent"
    raw_doc = f"MedSync Medical Record\nTitle: {record.title}\nDescription: {record.description or 'No clinical description provided.'}\nDate: {created_str}".encode("utf-8")
    base_pdf = QRPdfService.convert_to_pdf(raw_doc, f"{record.title}.txt")
    stamped_pdf = QRPdfService.stamp_qr_on_pdf(base_pdf, qr_image, token, title=record.title)

    clean_filename = f"{record.title.replace(' ', '_')}.pdf"
    return Response(
        content=stamped_pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{clean_filename}"'
        }
    )


@router.get("/patient/doctor-access", response_model=APIResponse[PatientDoctorAccessOverview])
async def get_patient_doctor_access(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_patient),
):
    from app.models.doctor import Doctor
    from app.models.download_audit_log import DownloadAuditLog

    # 1. Fetch active permissions for records owned by this patient
    stmt = (
        select(RecordPermission, MedicalRecord, Doctor)
        .join(MedicalRecord, MedicalRecord.id == RecordPermission.record_id)
        .join(Doctor, Doctor.user_id == RecordPermission.granted_to)
        .where(
            MedicalRecord.patient_id == current_user.id,
            RecordPermission.is_revoked.is_(False),
            RecordPermission.granted_to != current_user.id,
        )
        .order_by(RecordPermission.created_at.desc())
    )
    res = await db.execute(stmt)
    perm_rows = res.all()

    active_perms: List[PatientDoctorPermissionItem] = []
    for perm, rec, doc in perm_rows:
        active_perms.append(
            PatientDoctorPermissionItem(
                permission_id=perm.id,
                record_id=rec.id,
                record_title=rec.title,
                doctor_id=doc.user_id,
                doctor_name=doc.full_name,
                doctor_specialization=doc.specialization,
                hospital_name=doc.hospital_name,
                access_level=perm.access_level,
                granted_at=perm.created_at,
                is_revoked=perm.is_revoked,
            )
        )

    # 2. Fetch doctor access audit logs for records owned by this patient
    log_stmt = (
        select(DownloadAuditLog, MedicalRecord, Doctor)
        .join(MedicalRecord, MedicalRecord.id == DownloadAuditLog.entity_id)
        .join(Doctor, Doctor.user_id == DownloadAuditLog.user_id)
        .where(
            MedicalRecord.patient_id == current_user.id,
            DownloadAuditLog.entity_type == "MEDICAL_RECORD",
        )
        .order_by(DownloadAuditLog.created_at.desc())
        .limit(50)
    )
    log_res = await db.execute(log_stmt)
    log_rows = log_res.all()

    access_logs: List[PatientAccessLogItem] = []
    for log, rec, doc in log_rows:
        access_logs.append(
            PatientAccessLogItem(
                id=log.id,
                record_id=rec.id,
                record_title=rec.title,
                doctor_id=doc.user_id,
                doctor_name=doc.full_name,
                doctor_specialization=doc.specialization,
                accessed_at=log.created_at,
            )
        )

    return APIResponse(
        message="Patient doctor access overview fetched",
        data=PatientDoctorAccessOverview(
            active_permissions=active_perms,
            access_logs=access_logs,
        ),
    )


@router.post("/patient/revoke-doctor-access", response_model=APIResponse[PermissionActionResponse])
async def revoke_doctor_access(
    req: RevokeDoctorAccessRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_patient),
):
    from app.services.permission import PermissionService
    from app.models.consent import ConsentHistory
    from app.models.record import RecordPermission

    if req.record_id:
        record = await record_repo.get(db, req.record_id)
        if not record or record.patient_id != current_user.id:
            from app.core.exceptions import ForbiddenException
            raise ForbiddenException("You don't own this record")
        await PermissionService.revoke_permission(db, req.record_id, current_user.id, req.doctor_id)
    else:
        # Revoke across all records belonging to this patient
        records_stmt = select(MedicalRecord.id).where(MedicalRecord.patient_id == current_user.id)
        rec_res = await db.execute(records_stmt)
        patient_rec_ids = rec_res.scalars().all()

        if patient_rec_ids:
            perms_stmt = select(RecordPermission).where(
                RecordPermission.record_id.in_(patient_rec_ids),
                RecordPermission.granted_to == req.doctor_id,
                RecordPermission.is_revoked.is_(False),
            )
            perm_res = await db.execute(perms_stmt)
            for perm in perm_res.scalars().all():
                perm.is_revoked = True

            # Log ConsentHistory
            consent_log = ConsentHistory(
                id=uuid.uuid4(),
                patient_id=current_user.id,
                doctor_id=req.doctor_id,
                action="REVOKED",
            )
            db.add(consent_log)
            await db.commit()

    return APIResponse(
        message="Access permission successfully revoked",
        data=PermissionActionResponse(
            status="REVOKED",
            message="Doctor's access has been revoked and recorded on ledger."
        ),
    )


@router.post("/patient/grant-doctor-access", response_model=APIResponse[PermissionActionResponse])
async def grant_doctor_access(
    req: GrantDoctorAccessRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_patient),
):
    from app.services.permission import PermissionService
    from app.models.consent import ConsentHistory
    from app.models.record import RecordPermission

    if req.pin:
        from app.services.security_service import validate_patient_pin
        is_valid = await validate_patient_pin(db, current_user.id, req.pin)
        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid Authorization PIN.")

    if req.record_id:
        record = await record_repo.get(db, req.record_id)
        if not record or record.patient_id != current_user.id:
            from app.core.exceptions import ForbiddenException
            raise ForbiddenException("You don't own this record")
        await PermissionService.grant_permission(db, req.record_id, current_user.id, req.doctor_id)
    else:
        # Grant across all records belonging to this patient
        records_stmt = select(MedicalRecord.id).where(MedicalRecord.patient_id == current_user.id)
        rec_res = await db.execute(records_stmt)
        patient_rec_ids = rec_res.scalars().all()

        for r_id in patient_rec_ids:
            existing_perm = select(RecordPermission).where(
                RecordPermission.record_id == r_id,
                RecordPermission.granted_to == req.doctor_id,
            )
            res = await db.execute(existing_perm)
            perm = res.scalar_one_or_none()
            if perm:
                perm.is_revoked = False
            else:
                db.add(
                    RecordPermission(
                        id=uuid.uuid4(),
                        record_id=r_id,
                        granted_to=req.doctor_id,
                        granted_by=current_user.id,
                        access_level="READ",
                        is_revoked=False,
                    )
                )
        consent_log = ConsentHistory(
            id=uuid.uuid4(),
            patient_id=current_user.id,
            doctor_id=req.doctor_id,
            action="GRANTED",
        )
        db.add(consent_log)
        await db.commit()

    return APIResponse(
        message="Access permission successfully granted",
        data=PermissionActionResponse(
            status="GRANTED",
            message="Doctor has been granted access to medical records."
        ),
    )



