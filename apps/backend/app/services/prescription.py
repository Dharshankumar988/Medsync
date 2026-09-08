from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.repositories.prescription import prescription_repo, prescription_item_repo
from app.schemas.prescription import PrescriptionCreate
from app.services.qr_pdf_service import QRPdfService
from app.services.storage import StorageService
from sqlalchemy import select
from app.models.user import User

class PrescriptionService:
    @staticmethod
    async def create_prescription(db: AsyncSession, doctor_id: uuid.UUID, req: PrescriptionCreate):
        # 1. Fetch Doctor and Patient details
        stmt = select(User).where(User.id.in_([doctor_id, req.patient_id]))
        result = await db.execute(stmt)
        users = result.scalars().all()
        doctor = next((u for u in users if u.id == doctor_id), None)
        patient = next((u for u in users if u.id == req.patient_id), None)
        
        doctor_data = {"name": f"{doctor.first_name} {doctor.last_name}" if doctor else "Unknown"}
        patient_data = {"name": f"{patient.first_name} {patient.last_name}" if patient else "Unknown", "id": str(patient.id) if patient else ""}

        # 2. Pre-generate ID and secure Verification Token
        import secrets
        prescription_id = uuid.uuid4()
        qr_token = f"MS-{secrets.token_hex(8).upper()}"
        
        # 3. Generate QR Image and PDF
        qr_image_bytes = QRPdfService.generate_qr_code(qr_token)
        rx_data = {"diagnosis": req.diagnosis, "notes": req.notes}
        items_list = [item.model_dump() for item in req.items]
        
        pdf_bytes = QRPdfService.generate_prescription_pdf(
            rx_data, patient_data, doctor_data, items_list, qr_image_bytes, qr_token=qr_token
        )
        
        # 4. Upload PDF
        pdf_filename = f"prescription_{prescription_id}.pdf"
        object_path, _, _, _ = await StorageService.upload_bytes(
            file_bytes=pdf_bytes.read(),
            filename=pdf_filename,
            content_type="application/pdf",
            patient_id=str(req.patient_id),
            record_id=str(prescription_id),
            version_number=1
        )
        pdf_url = object_path

        # 5. Generate canonical hash
        from app.utils.hash import build_prescription_payload, generate_canonical_hash
        payload = build_prescription_payload(
            doctor_id=str(doctor_id),
            patient_id=str(req.patient_id),
            diagnosis=req.diagnosis,
            items=items_list
        )
        canonical_hash = generate_canonical_hash(payload)

        rx_in = {
            "id": prescription_id,
            "appointment_id": req.appointment_id,
            "patient_id": req.patient_id,
            "doctor_id": doctor_id,
            "diagnosis": req.diagnosis,
            "notes": req.notes,
            "is_finalized": True,
            "pdf_url": pdf_url,
            "qr_token": qr_token,
            "hash": canonical_hash
        }
        
        prescription = await prescription_repo.create(db, obj_in=rx_in)
        
        for item in items_list:
            item["prescription_id"] = prescription.id
            await prescription_item_repo.create(db, obj_in=item)
            
        # Enqueue blockchain task (best-effort, non-blocking)
        try:
            from app.services.blockchain_sync import BlockchainSyncService
            from app.models.blockchain import SyncEntityType, SyncActionType
            
            await BlockchainSyncService.enqueue_sync_task(
                db=db,
                entity_type=SyncEntityType.PRESCRIPTION,
                entity_id=prescription.id,
                action_type=SyncActionType.CREATE,
                payload=payload
            )
            await db.commit()
        except Exception:
            pass  # Blockchain sync is best-effort
            
        return prescription
