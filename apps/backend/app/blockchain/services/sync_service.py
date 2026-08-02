import logging
import hashlib
import json
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.blockchain import (
    BlockchainSyncTask, SyncEntityType, SyncActionType, SyncStatus,
    BlockchainTransaction
)
from app.blockchain.provider import blockchain_gateway

logger = logging.getLogger("blockchain.sync_service")

class BlockchainSyncService:
    """
    Core service that coordinates 2-way consistency between Supabase and Blockchain.
    Follows the 8-step synchronization principle.
    """
    
    def __init__(self, db: Session):
        self.db = db

    def _generate_hash(self, payload: dict) -> str:
        """Generates a deterministic SHA-256 hash for a dictionary payload."""
        payload_str = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(payload_str.encode("utf-8")).hexdigest()

    def create_sync_task(self, entity_type: SyncEntityType, entity_id: UUID, action_type: SyncActionType, payload: dict) -> BlockchainSyncTask:
        """
        Step 1, 2, 3: Validates and creates the initial sync task.
        """
        task = BlockchainSyncTask(
            entity_type=entity_type,
            entity_id=entity_id,
            action_type=action_type,
            payload=payload,
            status=SyncStatus.PENDING
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def execute_sync_task(self, task_id: UUID):
        """
        Step 4: Submits the transaction to the blockchain.
        Normally executed by a background worker or immediately if synchronous.
        """
        task = self.db.query(BlockchainSyncTask).filter_by(id=task_id).first()
        if not task:
            logger.error(f"Task {task_id} not found.")
            return

        if task.status not in [SyncStatus.PENDING, SyncStatus.RETRYING]:
            logger.info(f"Task {task_id} is already in state {task.status}. Skipping.")
            return

        task.status = SyncStatus.SUBMITTED
        self.db.commit()

        try:
            # Generate the deterministic hash from the payload
            data_hash = self._generate_hash(task.payload)
            receipt = None
            
            # Map the entity/action to the correct contract call
            if task.entity_type == SyncEntityType.PRESCRIPTION:
                if task.action_type == SyncActionType.CREATE:
                    receipt = blockchain_gateway.write_contract(
                        "PrescriptionRegistry", "createPrescription",
                        data_hash, str(task.payload.get("patient_id", "")), str(task.payload.get("doctor_id", ""))
                    )
            elif task.entity_type == SyncEntityType.MEDICAL_RECORD:
                if task.action_type == SyncActionType.CREATE:
                    receipt = blockchain_gateway.write_contract(
                        "MedicalRecordRegistry", "registerRecord",
                        data_hash, str(task.payload.get("patient_id", "")), str(task.payload.get("cid", ""))
                    )
            elif task.entity_type == SyncEntityType.PATIENT:
                if task.action_type == SyncActionType.CREATE:
                    receipt = blockchain_gateway.write_contract(
                        "PatientRegistry", "registerPatient", data_hash
                    )
            elif task.entity_type == SyncEntityType.DOCTOR:
                if task.action_type == SyncActionType.VERIFY:
                    receipt = blockchain_gateway.write_contract(
                        "DoctorRegistry", "verifyDoctor", data_hash
                    )
            elif task.entity_type == SyncEntityType.PHARMACY:
                if task.action_type == SyncActionType.VERIFY:
                    receipt = blockchain_gateway.write_contract(
                        "PharmacyRegistry", "verifyPharmacy", data_hash
                    )
            else:
                raise ValueError(f"Unsupported Sync Action: {task.entity_type} {task.action_type}")

            if receipt:
                self._handle_successful_receipt(task, receipt)
            else:
                self._handle_failure(task, "No receipt generated (unknown action)")

        except Exception as e:
            logger.error(f"Failed to execute sync task {task.id}: {e}")
            self._handle_failure(task, str(e))

    def _handle_successful_receipt(self, task: BlockchainSyncTask, receipt: dict):
        """
        Step 6 & 7: Captures metadata and updates database.
        """
        tx_hash = receipt.get("transactionHash")
        
        # Save Transaction Metadata
        tx = self.db.query(BlockchainTransaction).filter_by(transaction_hash=tx_hash).first()
        if not tx:
            tx = BlockchainTransaction(
                transaction_hash=tx_hash,
                block_number=receipt.get("blockNumber"),
                gas_used=receipt.get("gasUsed"),
                status="CONFIRMED" if receipt.get("status") == 1 else "REVERTED",
                wallet_address=receipt.get("fromAddress"),
                network="amoy", # Ideally fetched from gateway health
            )
            self.db.add(tx)
        
        # Step 8: Mark sync complete
        task.transaction_hash = tx_hash
        task.status = SyncStatus.CONFIRMED if receipt.get("status") == 1 else SyncStatus.REVERTED
        task.error_message = None
        
        # Phase 10: Update Entity Tables and trigger Notifications
        if task.status == SyncStatus.CONFIRMED:
            self._update_entity_blockchain_status(task, tx_hash, receipt.get("blockNumber"))
            
        self.db.commit()

    def _update_entity_blockchain_status(self, task: BlockchainSyncTask, tx_hash: str, block_number: int):
        from app.models.patient import Patient
        from app.models.doctor import Doctor
        from app.models.pharmacy import Pharmacy
        from app.models.prescription import Prescription
        from app.models.record import MedicalRecordVersion, AIAnalysis
        from app.services.notification import NotificationService
        
        # Async notification wrapper hack since we are in sync or maybe async context?
        # Actually sync_service seems to be synchronous right now since it uses self.db.commit() not await self.db.commit().
        
        if task.entity_type == SyncEntityType.PATIENT:
            entity = self.db.query(Patient).filter(Patient.user_id == task.entity_id).first()
            if entity:
                entity.blockchain_status = "SYNCED"
                entity.blockchain_tx_hash = tx_hash
                
        elif task.entity_type == SyncEntityType.DOCTOR:
            entity = self.db.query(Doctor).filter(Doctor.user_id == task.entity_id).first()
            if entity:
                entity.blockchain_status = "SYNCED"
                entity.blockchain_tx_hash = tx_hash
                
        elif task.entity_type == SyncEntityType.PHARMACY:
            entity = self.db.query(Pharmacy).filter(Pharmacy.user_id == task.entity_id).first()
            if entity:
                entity.blockchain_status = "SYNCED"
                entity.blockchain_tx_hash = tx_hash
                
        elif task.entity_type == SyncEntityType.PRESCRIPTION:
            entity = self.db.query(Prescription).filter(Prescription.id == task.entity_id).first()
            if entity:
                entity.blockchain_status = "SYNCED"
                entity.blockchain_tx_hash = tx_hash
                entity.block_number = block_number
                
        elif task.entity_type == SyncEntityType.MEDICAL_RECORD:
            # We used version.id for medical record
            version = self.db.query(MedicalRecordVersion).filter(MedicalRecordVersion.id == task.entity_id).first()
            if version:
                version.blockchain_status = "SYNCED"
                version.blockchain_tx_hash = tx_hash
                version.block_number = block_number
            else:
                # Could be AI Analysis
                ai = self.db.query(AIAnalysis).filter(AIAnalysis.version_id == task.entity_id).first()
                if ai:
                    ai.blockchain_status = "SYNCED"
                    ai.blockchain_tx_hash = tx_hash
                    ai.block_number = block_number


    def _handle_failure(self, task: BlockchainSyncTask, error_msg: str):
        """
        Handles retry logic and exponential backoff.
        """
        task.retry_count += 1
        task.error_message = error_msg
        
        if task.retry_count >= task.max_retries:
            task.status = SyncStatus.FAILED
        else:
            task.status = SyncStatus.RETRYING
            # Simple exponential backoff in seconds (2^retry * 10) - just illustrative
            # In a real worker, next_retry_time would be evaluated
            # task.next_retry_time = datetime.utcnow() + timedelta(seconds=(2 ** task.retry_count) * 10)

        self.db.commit()
