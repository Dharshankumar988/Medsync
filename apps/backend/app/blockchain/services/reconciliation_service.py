import logging
from sqlalchemy.orm import Session
from app.models.blockchain import BlockchainSyncTask, SyncStatus
from app.models.prescription import Prescription
from app.models.record import MedicalRecordVersion

logger = logging.getLogger("blockchain.reconciliation_service")

class ReconciliationService:
    """
    Detects orphaned transactions, failed syncs, or database records
    missing blockchain verification.
    """
    def __init__(self, db: Session):
        self.db = db

    def generate_report(self) -> dict:
        """
        Scans for inconsistencies. Returns a dictionary of issues found.
        """
        report = {
            "failed_tasks": [],
            "stale_pending_tasks": [],
            "orphaned_prescriptions": []
        }
        
        # 1. Detect failed synchronization tasks
        failed_tasks = self.db.query(BlockchainSyncTask).filter(
            BlockchainSyncTask.status == SyncStatus.FAILED
        ).all()
        for t in failed_tasks:
            report["failed_tasks"].append(str(t.id))

        # 2. Detect database records missing blockchain verification (e.g. Prescriptions without tx hash)
        unverified_prescriptions = self.db.query(Prescription).filter(
            Prescription.blockchain_tx_hash.is_(None)
        ).all()
        
        for p in unverified_prescriptions:
            # Check if there's a task pending for it
            task = self.db.query(BlockchainSyncTask).filter_by(entity_id=p.id).first()
            if not task:
                report["orphaned_prescriptions"].append(str(p.id))

        return report

    def repair_inconsistencies(self):
        """
        Attempts to automatically repair detected issues, for example by re-queuing
        orphaned records into the BlockchainSyncTask table.
        """
        report = self.generate_report()
        repaired_count = 0
        
        for p_id in report["orphaned_prescriptions"]:
            logger.info(f"Repairing orphaned prescription {p_id}")
            # The sync_service would normally be injected or called here to queue a task
            # For simplicity in this structure:
            from app.blockchain.services.sync_service import BlockchainSyncService
            from app.models.blockchain import SyncEntityType, SyncActionType
            
            p = self.db.query(Prescription).filter_by(id=p_id).first()
            if p:
                sync_service = BlockchainSyncService(self.db)
                sync_service.create_sync_task(
                    entity_type=SyncEntityType.PRESCRIPTION,
                    entity_id=p.id,
                    action_type=SyncActionType.CREATE,
                    payload={"patient_id": str(p.patient_id), "doctor_id": str(p.doctor_id)}
                )
                repaired_count += 1
                
        return {"repaired_count": repaired_count}
