from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.repositories.prescription import prescription_repo, prescription_item_repo
from app.schemas.prescription import PrescriptionCreate
from app.services.qr_pdf_service import QRPdfService
from app.services.storage import StorageService
from sqlalchemy import select
from app.models.user import User
from app.models.doctor import Doctor
from app.models.patient import Patient

class PrescriptionService:
    @staticmethod
    async def create_prescription(db: AsyncSession, doctor_id: uuid.UUID, req: PrescriptionCreate):
        # 1. Fetch Doctor and Patient details
        doc_stmt = select(Doctor).where(Doctor.user_id == doctor_id)
        doc_res = await db.execute(doc_stmt)
        doctor_profile = doc_res.scalar_one_or_none()

        pat_stmt = select(Patient).where(Patient.user_id == req.patient_id)
        pat_res = await db.execute(pat_stmt)
        patient_profile = pat_res.scalar_one_or_none()

        doc_user_stmt = select(User).where(User.id == doctor_id)
        doc_user_res = await db.execute(doc_user_stmt)
        doctor_user = doc_user_res.scalar_one_or_none()
        
        doctor_data = {
            "name": doctor_profile.full_name if doctor_profile else "Doctor",
            "profile_image_url": getattr(doctor_user, 'profile_image_url', None) if doctor_user else None
        }
        patient_data = {
            "name": patient_profile.full_name if patient_profile else "Patient",
            "id": str(req.patient_id)
        }

        # 2. Pre-generate ID and secure Verification Token
        import string
        import random
        import secrets
        
        prescription_id = uuid.uuid4()
        
        # 4-character alphanumeric PIN
        chars = string.ascii_uppercase + string.digits
        pin = ''.join(random.choices(chars, k=4))
        
        # QR token now a URL to verify page
        base_url = "https://medsync.vercel.app" # Standardize base URL
        qr_token = f"{base_url}/verify/prescription/{prescription_id}"
        
        # 3. Generate QR Image and PDF
        qr_image_bytes = QRPdfService.generate_qr_code(qr_token)
        rx_data = {"diagnosis": req.diagnosis, "notes": req.notes}
        items_list = [item.model_dump() for item in req.items]
        
        pdf_bytes = QRPdfService.generate_prescription_pdf(
            rx_data, patient_data, doctor_data, items_list, qr_image_bytes, qr_token=qr_token, pin=pin
        )
        
        # 4. Upload PDF
        pdf_filename = f"prescription_{prescription_id}.pdf"
        try:
            raw_pdf_bytes = pdf_bytes.getvalue() if hasattr(pdf_bytes, "getvalue") else pdf_bytes.read()
            object_path, _, _, _ = await StorageService.upload_bytes(
                file_bytes=raw_pdf_bytes,
                filename=pdf_filename,
                content_type="application/pdf",
                patient_id=str(req.patient_id),
                record_id=str(prescription_id),
                version_number=1
            )
            pdf_url = object_path
        except Exception as e:
            import logging
            logging.getLogger("medsync.prescription").warning(
                f"Storage upload failed for prescription {prescription_id}: {e}. Falling back to default path."
            )
            pdf_url = f"patients/{req.patient_id}/records/{prescription_id}/v1/{pdf_filename}"

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
            "doctor_profile_image_url": doctor_data["profile_image_url"],
            "diagnosis": req.diagnosis,
            "notes": req.notes,
            "is_finalized": True,
            "pdf_url": pdf_url,
            "qr_token": qr_token,
            "pin": pin,
            "hash": canonical_hash
        }
        
        prescription = await prescription_repo.create(db, obj_in=rx_in)
        
        for item in items_list:
            item["prescription_id"] = prescription.id
            await prescription_item_repo.create(db, obj_in=item)
            
        if req.routed_pharmacy_id:
            from app.models.pharmacy_system import MedicineOrder, OrderStatus
            order = MedicineOrder(
                id=uuid.uuid4(),
                patient_id=req.patient_id,
                pharmacy_id=req.routed_pharmacy_id,
                prescription_id=prescription.id,
                status=OrderStatus.PENDING,
                order_type="ROUTED_BY_DOCTOR",
                total_amount=0.0
            )
            db.add(order)

        # Notify Patient by default and Pharmacy if routed
        try:
            from app.services.notification import NotificationService
            doc_name = doctor_data.get("name") or "Doctor"
            await NotificationService.send_notification(
                db,
                user_id=req.patient_id,
                title="New Prescription Issued",
                message=f"Dr. {doc_name} issued a new digital prescription for {req.diagnosis}.",
                type="PRESCRIPTION",
                link="/patient/prescriptions"
            )
            if req.routed_pharmacy_id:
                await NotificationService.send_notification(
                    db,
                    user_id=req.routed_pharmacy_id,
                    title="New Prescription Routed",
                    message=f"Dr. {doc_name} routed a prescription order for patient diagnosis '{req.diagnosis}' to your pharmacy.",
                    type="PRESCRIPTION",
                    link="/pharmacy/orders"
                )
        except Exception:
            pass
            
        task = None
        try:
            from app.services.blockchain_sync import BlockchainSyncService, trigger_background_sync
            from app.models.blockchain import SyncEntityType, SyncActionType
            
            task = await BlockchainSyncService.enqueue_sync_task(
                db=db,
                entity_type=SyncEntityType.PRESCRIPTION,
                entity_id=prescription.id,
                action_type=SyncActionType.CREATE,
                payload=payload
            )
        except Exception:
            pass
            
        await db.commit()
        if task:
            try:
                from app.services.blockchain_sync import trigger_background_sync
                trigger_background_sync(task.id)
            except Exception:
                pass
            
        return prescription
