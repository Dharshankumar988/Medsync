from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import UploadFile
import uuid
from app.repositories.record import record_repo, record_version_repo
from app.schemas.record import MedicalRecordCreate
from app.models.record import FileType, FileMetadata
from app.services.storage import StorageService

class MedicalRecordService:
    @staticmethod
    async def upload_record(db: AsyncSession, req: MedicalRecordCreate, file: UploadFile, patient_id: uuid.UUID, uploader_id: uuid.UUID, is_prescription: bool = False):
        record_in = {
            "title": req.title,
            "description": req.description,
            "category_id": req.category_id,
            "patient_id": patient_id,
            "uploaded_by": uploader_id
        }
        record = await record_repo.create(db, obj_in=record_in)

        version_number = 1
        
        # Read uploaded file bytes
        file.file.seek(0)
        raw_bytes = await file.read() if hasattr(file, "read") else file.file.read()

        from app.services.qr_pdf_service import QRPdfService
        import io, os

        # 1. Convert any input format (image, text, doc, pdf) into standard A4 PDF
        pdf_bytes = QRPdfService.convert_to_pdf(raw_bytes, file.filename or "record")

        # 2. Generate verifiable on-chain QR identifier and QR code
        token = f"QR-REC-{record.id}"
        qr_image = QRPdfService.generate_qr_code(token)

        # 3. Stamp QR code at bottom-right with verified badge
        stamped_pdf = QRPdfService.stamp_qr_on_pdf(pdf_bytes, qr_image, token, title=req.title)

        # 4. Wrap into clean .pdf UploadFile
        base_name = os.path.splitext(file.filename)[0] if file.filename else "medical_record"
        clean_filename = f"{base_name}.pdf"
        file = UploadFile(filename=clean_filename, file=io.BytesIO(stamped_pdf), headers={"content-type": "application/pdf"})

        storage_path, mime_type, file_size_bytes, file_hash = await StorageService.upload_record_file(
            file,
            patient_id=str(patient_id),
            record_id=str(record.id),
            version_number=version_number,
        )
        
        # All records are normalized and stored as PDF
        f_type = FileType.PDF
        
        version_in = {
            "record_id": record.id,
            "version_number": version_number,
            "ipfs_cid": f"supabase://{storage_path}#sha256={file_hash}",
            "file_type": f_type,
            "file_size_bytes": file_size_bytes,
            "is_current": True
        }
        version = await record_version_repo.create(db, obj_in=version_in)

        db.add(FileMetadata(
            version_id=version.id,
            supabase_storage_path=storage_path,
            mime_type=mime_type,
        ))
        
        task = None
        try:
            from app.services.blockchain_sync import BlockchainSyncService, trigger_background_sync
            from app.models.blockchain import SyncEntityType, SyncActionType
            
            task = await BlockchainSyncService.enqueue_sync_task(
                db=db,
                entity_type=SyncEntityType.MEDICAL_RECORD,
                entity_id=version.id,
                action_type=SyncActionType.CREATE,
                payload={"record_id": str(record.id), "patient_id": str(patient_id), "file_hash": file_hash, "file_type": f_type.value, "file_size_bytes": file_size_bytes}
            )
        except Exception as e:
            print(f"Error enqueueing blockchain task for medical record: {e}")
            
        await db.commit()
        if task:
            try:
                from app.services.blockchain_sync import trigger_background_sync
                trigger_background_sync(task.id)
            except Exception as e:
                print(f"Error triggering blockchain sync for medical record: {e}")
        
        return record
