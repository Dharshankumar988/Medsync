from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import UploadFile
import uuid
from app.repositories.record import record_repo, record_version_repo
from app.schemas.record import MedicalRecordCreate
from app.models.record import FileType
from app.services.ipfs import IPFSService
from app.services.storage import StorageService

class MedicalRecordService:
    @staticmethod
    async def upload_record(db: AsyncSession, req: MedicalRecordCreate, file: UploadFile, patient_id: uuid.UUID, uploader_id: uuid.UUID):
        cid = await IPFSService.upload_file(file)
        await StorageService.backup_to_supabase(file)
        
        record_in = {
            "title": req.title,
            "description": req.description,
            "category_id": req.category_id,
            "patient_id": patient_id,
            "uploaded_by": uploader_id
        }
        record = await record_repo.create(db, obj_in=record_in)
        
        file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
        file_type_map = {"pdf": FileType.PDF, "png": FileType.IMAGE, "jpg": FileType.IMAGE, "jpeg": FileType.IMAGE, "dcm": FileType.DICOM}
        f_type = file_type_map.get(file_ext, FileType.PDF)
        
        version_in = {
            "record_id": record.id,
            "version_number": 1,
            "ipfs_cid": cid,
            "file_type": f_type,
            "file_size_bytes": file.size or 0,
            "is_current": True
        }
        await record_version_repo.create(db, obj_in=version_in)
        
        return record
