from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.repositories.prescription import prescription_repo, prescription_item_repo
from app.schemas.prescription import PrescriptionCreate

class PrescriptionService:
    @staticmethod
    async def create_prescription(db: AsyncSession, doctor_id: uuid.UUID, req: PrescriptionCreate):
        rx_in = {
            "appointment_id": req.appointment_id,
            "patient_id": req.patient_id,
            "doctor_id": doctor_id,
            "diagnosis": req.diagnosis,
            "notes": req.notes,
            "is_finalized": True
        }
        prescription = await prescription_repo.create(db, obj_in=rx_in)
        
        for item in req.items:
            item_in = item.model_dump()
            item_in["prescription_id"] = prescription.id
            await prescription_item_repo.create(db, obj_in=item_in)
            
        # Enqueue blockchain task (non-blocking - prescription is saved even if queue fails)
        try:
            from app.models.blockchain import BlockchainTask, BlockchainTaskStatus
            task = BlockchainTask(
                prescription_id=prescription.id,
                status=BlockchainTaskStatus.PENDING
            )
            db.add(task)
            await db.commit()
        except Exception:
            # Blockchain task enqueueing should never block prescription creation
            pass
            
        return prescription
