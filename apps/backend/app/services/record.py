from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import UploadFile
import uuid
from app.repositories.record import record_repo, record_version_repo
from app.schemas.record import MedicalRecordCreate
from app.models.record import FileType, FileMetadata
from app.services.storage import StorageService

class MedicalRecordService:
    @staticmethod
    async def upload_record(db: AsyncSession, req: MedicalRecordCreate, file: UploadFile, patient_id: uuid.UUID, uploader_id: uuid.UUID):
        record_in = {
            "title": req.title,
            "description": req.description,
            "category_id": req.category_id,
            "patient_id": patient_id,
            "uploaded_by": uploader_id
        }
        record = await record_repo.create(db, obj_in=record_in)

        version_number = 1
        storage_path, mime_type, file_size_bytes, file_hash = await StorageService.upload_record_file(
            file,
            patient_id=str(patient_id),
            record_id=str(record.id),
            version_number=version_number,
        )
        
        file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
        file_type_map = {"pdf": FileType.PDF, "png": FileType.IMAGE, "jpg": FileType.IMAGE, "jpeg": FileType.IMAGE, "dcm": FileType.DICOM}
        f_type = file_type_map.get(file_ext, FileType.PDF)
        
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
        await db.commit()
        
        return record
