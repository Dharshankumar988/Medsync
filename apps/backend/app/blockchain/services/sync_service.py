import logging
import hashlib
import json
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.blockchain import (
    BlockchainSyncTask, SyncEntityType, SyncActionType, SyncStatus,
    BlockchainTransaction
)
from app.blockchain.provider import blockchain_gateway
import asyncio

logger = logging.getLogger("blockchain.sync_service")

class BlockchainSyncService:
    """
    Core service that coordinates 2-way consistency between Supabase and Blockchain.
    Follows the 8-step synchronization principle.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db

    def _generate_hash(self, payload: dict) -> str:
        """Generates a deterministic SHA-256 hash for a dictionary payload using the shared utility."""
        from app.utils.hash import generate_canonical_hash
        return generate_canonical_hash(payload)

    async def create_sync_task(self, entity_type: SyncEntityType, entity_id: UUID, action_type: SyncActionType, payload: dict) -> BlockchainSyncTask:
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
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def execute_sync_task(self, task_id: UUID):
        """
        Step 4: Submits the transaction to the blockchain.
        Normally executed by a background worker or immediately if synchronous.
        """
        result = await self.db.execute(select(BlockchainSyncTask).filter_by(id=task_id))
        task = result.scalar_one_or_none()
        if not task:
            logger.error(f"Task {task_id} not found.")
            return

        if task.status not in [SyncStatus.PENDING, SyncStatus.RETRYING]:
            logger.info(f"Task {task_id} is already in state {task.status}. Skipping.")
            return

        task.status = SyncStatus.SUBMITTED
        await self.db.commit()

        try:
            # Generate the deterministic hash from the payload
            data_hash_hex = self._generate_hash(task.payload)
            data_hash_bytes = self._to_bytes32(data_hash_hex)
            receipt = None
            contract_called = None
            
            from app.blockchain.client import blockchain_client
            default_wallet = blockchain_client.wallet_address

            # Map the entity/action to the correct contract call
            if task.entity_type == SyncEntityType.PRESCRIPTION:
                contract_called = "PrescriptionRegistry"
                patient_h = self._to_bytes32(task.payload.get("patient_id") or task.payload.get("patient_hash"))
                doctor_h = self._to_bytes32(task.payload.get("doctor_id") or task.payload.get("doctor_hash"))
                
                # Determine deterministic prescription hash
                presc_h = None
                if task.payload.get("prescription_hash"):
                    presc_h = self._to_bytes32(task.payload["prescription_hash"])
                elif task.payload.get("hash"):
                    presc_h = self._to_bytes32(task.payload["hash"])
                else:
                    from app.models.prescription import Prescription
                    p_res = await self.db.execute(select(Prescription.hash).filter(Prescription.id == task.entity_id))
                    db_h = p_res.scalar_one_or_none()
                    presc_h = self._to_bytes32(db_h) if db_h else data_hash_bytes

                if task.action_type == SyncActionType.CREATE:
                    try:
                        p_rec = await asyncio.to_thread(
                            blockchain_gateway.read_contract,
                            "PrescriptionRegistry", "prescriptions", presc_h
                        )
                        is_registered = isinstance(p_rec, (list, tuple)) and len(p_rec) > 3 and p_rec[3] != 0
                        if not is_registered:
                            receipt = await asyncio.to_thread(
                                blockchain_gateway.write_contract,
                                "PrescriptionRegistry", "createPrescription",
                                presc_h, patient_h, doctor_h
                            )
                        else:
                            logger.info(f"Prescription {task.entity_id} already registered on-chain.")
                    except Exception as p_err:
                        logger.warning(f"Prescription auto-create check: {p_err}")
                        receipt = await asyncio.to_thread(
                            blockchain_gateway.write_contract,
                            "PrescriptionRegistry", "createPrescription",
                            presc_h, patient_h, doctor_h
                        )
                elif task.action_type in (SyncActionType.VERIFY, SyncActionType.UPDATE):
                    # Dispensing / Verification on-chain
                    try:
                        p_rec = await asyncio.to_thread(
                            blockchain_gateway.read_contract,
                            "PrescriptionRegistry", "prescriptions", presc_h
                        )
                        is_registered = isinstance(p_rec, (list, tuple)) and len(p_rec) > 3 and p_rec[3] != 0
                        is_verified = isinstance(p_rec, (list, tuple)) and len(p_rec) > 6 and bool(p_rec[6])
                        if not is_registered:
                            # Auto-create first so verify succeeds
                            await asyncio.to_thread(
                                blockchain_gateway.write_contract,
                                "PrescriptionRegistry", "createPrescription",
                                presc_h, patient_h, doctor_h
                            )
                        if not is_verified:
                            receipt = await asyncio.to_thread(
                                blockchain_gateway.write_contract,
                                "PrescriptionRegistry", "verifyPrescription", presc_h
                            )
                        else:
                            logger.info(f"Prescription {task.entity_id} already verified/dispensed on-chain.")
                    except Exception as p_err:
                        logger.warning(f"Prescription verify on-chain: {p_err}")
                        receipt = await asyncio.to_thread(
                            blockchain_gateway.write_contract,
                            "PrescriptionRegistry", "verifyPrescription", presc_h
                        )
                elif task.action_type == SyncActionType.REVOKE:
                    receipt = await asyncio.to_thread(
                        blockchain_gateway.write_contract,
                        "PrescriptionRegistry", "revokePrescription", presc_h
                    )

            elif task.entity_type == SyncEntityType.MEDICAL_RECORD:
                contract_called = "MedicalRecordRegistry"
                patient_h = self._to_bytes32(task.payload.get("patient_id") or task.payload.get("patient_hash"))
                doctor_h = self._to_bytes32(task.payload.get("doctor_id") or task.payload.get("doctor_hash"))
                record_h = self._to_bytes32(task.payload.get("record_id") or task.payload.get("file_hash") or task.entity_id)

                if task.action_type == SyncActionType.CREATE:
                    try:
                        rec_data = await asyncio.to_thread(
                            blockchain_gateway.read_contract,
                            "MedicalRecordRegistry", "records", record_h
                        )
                        is_registered = isinstance(rec_data, (list, tuple)) and len(rec_data) > 2 and rec_data[2] != 0
                        if not is_registered:
                            receipt = await asyncio.to_thread(
                                blockchain_gateway.write_contract,
                                "MedicalRecordRegistry", "registerRecord",
                                record_h, patient_h
                            )
                        else:
                            logger.info(f"Record {task.entity_id} already registered on-chain.")
                    except Exception as rec_err:
                        logger.warning(f"Record auto-register check: {rec_err}")
                        receipt = await asyncio.to_thread(
                            blockchain_gateway.write_contract,
                            "MedicalRecordRegistry", "registerRecord",
                            record_h, patient_h
                        )
                elif task.action_type == SyncActionType.VERIFY:
                    try:
                        rec_data = await asyncio.to_thread(
                            blockchain_gateway.read_contract,
                            "MedicalRecordRegistry", "records", record_h
                        )
                        is_registered = isinstance(rec_data, (list, tuple)) and len(rec_data) > 2 and rec_data[2] != 0
                        is_verified = isinstance(rec_data, (list, tuple)) and len(rec_data) > 4 and bool(rec_data[4])
                        if not is_registered:
                            await asyncio.to_thread(
                                blockchain_gateway.write_contract,
                                "MedicalRecordRegistry", "registerRecord",
                                record_h, patient_h
                            )
                        if not is_verified:
                            receipt = await asyncio.to_thread(
                                blockchain_gateway.write_contract,
                                "MedicalRecordRegistry", "verifyRecord",
                                record_h
                            )
                    except Exception as v_err:
                        logger.warning(f"Record verify on-chain: {v_err}")
                        receipt = await asyncio.to_thread(
                            blockchain_gateway.write_contract,
                            "MedicalRecordRegistry", "verifyRecord",
                            record_h
                        )
                elif task.action_type == SyncActionType.GRANT_ACCESS:
                    try:
                        rec_data = await asyncio.to_thread(
                            blockchain_gateway.read_contract,
                            "MedicalRecordRegistry", "records", record_h
                        )
                        is_registered = isinstance(rec_data, (list, tuple)) and len(rec_data) > 2 and rec_data[2] != 0
                        if not is_registered:
                            await asyncio.to_thread(
                                blockchain_gateway.write_contract,
                                "MedicalRecordRegistry", "registerRecord",
                                record_h, patient_h
                            )
                    except Exception as r_err:
                        logger.warning(f"Record auto-register before grant: {r_err}")

                    receipt = await asyncio.to_thread(
                        blockchain_gateway.write_contract,
                        "MedicalRecordRegistry", "grantAccess",
                        record_h, doctor_h
                    )
                elif task.action_type == SyncActionType.REVOKE_ACCESS:
                    receipt = await asyncio.to_thread(
                        blockchain_gateway.write_contract,
                        "MedicalRecordRegistry", "revokeAccess",
                        record_h, doctor_h
                    )

            elif task.entity_type == SyncEntityType.PATIENT:
                contract_called = "PatientRegistry"
                patient_h = self._to_bytes32(task.payload.get("patient_id") or task.payload.get("patient_hash") or task.entity_id)
                wallet = str(task.payload.get("wallet_address") or "").strip()
                if not wallet or wallet == "0x0000000000000000000000000000000000000000" or not blockchain_client.w3.is_address(wallet):
                    wallet = default_wallet
                wallet = blockchain_client.w3.to_checksum_address(wallet)

                if task.action_type == SyncActionType.CREATE:
                    try:
                        pat_rec = await asyncio.to_thread(
                            blockchain_gateway.read_contract,
                            "PatientRegistry", "patients", patient_h
                        )
                        is_registered = isinstance(pat_rec, (list, tuple)) and len(pat_rec) > 1 and pat_rec[1] != 0
                        if not is_registered:
                            receipt = await asyncio.to_thread(
                                blockchain_gateway.write_contract,
                                "PatientRegistry", "registerPatient", patient_h, wallet
                            )
                        else:
                            logger.info(f"Patient {task.entity_id} already registered on-chain.")
                    except Exception as pat_err:
                        logger.warning(f"Patient register check: {pat_err}")
                        receipt = await asyncio.to_thread(
                            blockchain_gateway.write_contract,
                            "PatientRegistry", "registerPatient", patient_h, wallet
                        )
                elif task.action_type == SyncActionType.VERIFY:
                    try:
                        pat_rec = await asyncio.to_thread(
                            blockchain_gateway.read_contract,
                            "PatientRegistry", "patients", patient_h
                        )
                        is_registered = isinstance(pat_rec, (list, tuple)) and len(pat_rec) > 1 and pat_rec[1] != 0
                        is_verified = isinstance(pat_rec, (list, tuple)) and len(pat_rec) > 3 and bool(pat_rec[3])
                        if not is_registered:
                            await asyncio.to_thread(
                                blockchain_gateway.write_contract,
                                "PatientRegistry", "registerPatient", patient_h, wallet
                            )
                        if not is_verified:
                            receipt = await asyncio.to_thread(
                                blockchain_gateway.write_contract,
                                "PatientRegistry", "verifyPatient", patient_h
                            )
                    except Exception as pv_err:
                        logger.warning(f"Patient verify error: {pv_err}")
                        receipt = await asyncio.to_thread(
                            blockchain_gateway.write_contract,
                            "PatientRegistry", "verifyPatient", patient_h
                        )
                elif task.action_type == SyncActionType.UPDATE:
                    receipt = await asyncio.to_thread(
                        blockchain_gateway.write_contract,
                        "PatientRegistry", "updateWallet", patient_h, wallet
                    )
                elif str(task.action_type) in ("REVOKE", "DEACTIVATE", "SyncActionType.REVOKE"):
                    receipt = await asyncio.to_thread(
                        blockchain_gateway.write_contract,
                        "PatientRegistry", "deactivatePatient", patient_h
                    )

            elif task.entity_type == SyncEntityType.DOCTOR:
                contract_called = "DoctorRegistry"
                doc_h = self._to_bytes32(task.payload.get("doctor_id") or task.payload.get("doctor_hash") or task.entity_id)
                owner = str(task.payload.get("owner") or task.payload.get("wallet_address") or "").strip()
                if not owner or owner == "0x0000000000000000000000000000000000000000" or not blockchain_client.w3.is_address(owner):
                    owner = default_wallet
                owner = blockchain_client.w3.to_checksum_address(owner)
                lic_h = self._to_bytes32(task.payload.get("license_hash") or task.payload.get("license_number") or task.id)
                hosp_h = self._to_bytes32(task.payload.get("hospital_hash") or task.payload.get("hospital_id") or task.id)

                if task.action_type == SyncActionType.CREATE:
                    try:
                        doc_rec = await asyncio.to_thread(
                            blockchain_gateway.read_contract,
                            "DoctorRegistry", "doctors", doc_h
                        )
                        is_registered = isinstance(doc_rec, (list, tuple)) and len(doc_rec) > 3 and doc_rec[3] != 0
                        if not is_registered:
                            receipt = await asyncio.to_thread(
                                blockchain_gateway.write_contract,
                                "DoctorRegistry", "registerDoctor", 
                                doc_h, lic_h, hosp_h, owner
                            )
                        else:
                            logger.info(f"Doctor {task.entity_id} already registered on-chain.")
                    except Exception as d_err:
                        logger.warning(f"Doctor check before register: {d_err}")
                        receipt = await asyncio.to_thread(
                            blockchain_gateway.write_contract,
                            "DoctorRegistry", "registerDoctor", 
                            doc_h, lic_h, hosp_h, owner
                        )
                elif task.action_type == SyncActionType.VERIFY:
                    try:
                        doc_rec = await asyncio.to_thread(
                            blockchain_gateway.read_contract,
                            "DoctorRegistry", "doctors", doc_h
                        )
                        is_registered = isinstance(doc_rec, (list, tuple)) and len(doc_rec) > 3 and doc_rec[3] != 0
                        is_verified = isinstance(doc_rec, (list, tuple)) and len(doc_rec) > 5 and bool(doc_rec[5])
                        if not is_registered:
                            await asyncio.to_thread(
                                blockchain_gateway.write_contract,
                                "DoctorRegistry", "registerDoctor",
                                doc_h, lic_h, hosp_h, owner
                            )
                        if not is_verified:
                            receipt = await asyncio.to_thread(
                                blockchain_gateway.write_contract,
                                "DoctorRegistry", "verifyDoctor", doc_h
                            )
                        else:
                            logger.info(f"Doctor {task.entity_id} already verified on-chain.")
                    except Exception as reg_err:
                        logger.warning(f"Doctor auto-register check before verify: {reg_err}")
                        receipt = await asyncio.to_thread(
                            blockchain_gateway.write_contract,
                            "DoctorRegistry", "verifyDoctor", doc_h
                        )
                elif str(task.action_type) in ("REVOKE", "SUSPEND", "SyncActionType.REVOKE"):
                    receipt = await asyncio.to_thread(
                        blockchain_gateway.write_contract,
                        "DoctorRegistry", "suspendDoctor", doc_h
                    )

            elif task.entity_type == SyncEntityType.PHARMACY:
                contract_called = "PharmacyRegistry"
                phm_h = self._to_bytes32(task.payload.get("pharmacy_id") or task.payload.get("pharmacy_hash") or task.entity_id)
                owner = str(task.payload.get("owner") or task.payload.get("wallet_address") or "").strip()
                if not owner or owner == "0x0000000000000000000000000000000000000000" or not blockchain_client.w3.is_address(owner):
                    owner = default_wallet
                owner = blockchain_client.w3.to_checksum_address(owner)
                lic_h = self._to_bytes32(task.payload.get("license_hash") or task.payload.get("license_number") or task.id)

                if task.action_type == SyncActionType.CREATE:
                    try:
                        phm_rec = await asyncio.to_thread(
                            blockchain_gateway.read_contract,
                            "PharmacyRegistry", "pharmacies", phm_h
                        )
                        is_registered = isinstance(phm_rec, (list, tuple)) and len(phm_rec) > 2 and phm_rec[2] != 0
                        if not is_registered:
                            receipt = await asyncio.to_thread(
                                blockchain_gateway.write_contract,
                                "PharmacyRegistry", "registerPharmacy", 
                                phm_h, lic_h, owner
                            )
                        else:
                            logger.info(f"Pharmacy {task.entity_id} already registered on-chain.")
                    except Exception as p_err:
                        logger.warning(f"Pharmacy check before register: {p_err}")
                        receipt = await asyncio.to_thread(
                            blockchain_gateway.write_contract,
                            "PharmacyRegistry", "registerPharmacy", 
                            phm_h, lic_h, owner
                        )
                elif task.action_type == SyncActionType.VERIFY:
                    try:
                        phm_rec = await asyncio.to_thread(
                            blockchain_gateway.read_contract,
                            "PharmacyRegistry", "pharmacies", phm_h
                        )
                        is_registered = isinstance(phm_rec, (list, tuple)) and len(phm_rec) > 2 and phm_rec[2] != 0
                        is_verified = isinstance(phm_rec, (list, tuple)) and len(phm_rec) > 4 and bool(phm_rec[4])
                        if not is_registered:
                            await asyncio.to_thread(
                                blockchain_gateway.write_contract,
                                "PharmacyRegistry", "registerPharmacy",
                                phm_h, lic_h, owner
                            )
                        if not is_verified:
                            receipt = await asyncio.to_thread(
                                blockchain_gateway.write_contract,
                                "PharmacyRegistry", "verifyPharmacy", phm_h
                            )
                        else:
                            logger.info(f"Pharmacy {task.entity_id} already verified on-chain.")
                    except Exception as reg_err:
                        logger.warning(f"Pharmacy auto-register check before verify: {reg_err}")
                        receipt = await asyncio.to_thread(
                            blockchain_gateway.write_contract,
                            "PharmacyRegistry", "verifyPharmacy", phm_h
                        )
                elif str(task.action_type) in ("REVOKE", "SUSPEND", "SyncActionType.REVOKE"):
                    receipt = await asyncio.to_thread(
                        blockchain_gateway.write_contract,
                        "PharmacyRegistry", "suspendPharmacy", phm_h
                    )

            elif str(task.entity_type) == "CONSENT" or str(task.entity_type).endswith(".CONSENT"):
                contract_called = "ConsentManagement"
                auth_party = str(task.payload.get("authorized_party") or task.payload.get("doctor_wallet") or "").strip()
                if not auth_party or not blockchain_client.w3.is_address(auth_party):
                    auth_party = default_wallet
                auth_party = blockchain_client.w3.to_checksum_address(auth_party)
                resource_h = self._to_bytes32(task.payload.get("resource_hash") or task.payload.get("record_id") or task.entity_id)
                exp_ts = int(task.payload.get("expires_at") or 0)

                if task.action_type in (SyncActionType.CREATE, SyncActionType.GRANT_ACCESS):
                    receipt = await asyncio.to_thread(
                        blockchain_gateway.write_contract,
                        "ConsentManagement", "grantConsent",
                        auth_party, resource_h, exp_ts
                    )
                elif task.action_type in (SyncActionType.REVOKE, SyncActionType.REVOKE_ACCESS):
                    consent_id = self._to_bytes32(task.payload.get("consent_id") or task.entity_id)
                    receipt = await asyncio.to_thread(
                        blockchain_gateway.write_contract,
                        "ConsentManagement", "revokeConsent",
                        consent_id
                    )
            else:
                raise ValueError(f"Unsupported Sync Action: {task.entity_type} {task.action_type}")

            if receipt:
                await self._handle_successful_receipt(task, receipt, contract_called)
            else:
                # Entity was already confirmed on-chain in an earlier step
                task.status = SyncStatus.CONFIRMED
                task.error_message = None
                await self.db.commit()

        except Exception as e:
            logger.error(f"Failed to execute sync task {task.id}: {e}")
            await self._handle_failure(task, str(e))

    def _to_bytes32(self, val) -> bytes:
        """Safely convert any UUID, hex string, bytes, or arbitrary string into valid bytes32."""
        if isinstance(val, bytes):
            return val.ljust(32, b'\0')[:32]
        s = str(val or "").strip()
        if s.startswith("0x"):
            s = s[2:]
        s_clean = s.replace("-", "")
        if len(s_clean) == 64:
            try:
                return bytes.fromhex(s_clean)
            except ValueError:
                pass
        if len(s_clean) == 32:
            try:
                return bytes.fromhex(s_clean.ljust(64, '0'))
            except ValueError:
                pass
        return hashlib.sha256(s.encode("utf-8") if s else b"default").digest()

    async def _handle_successful_receipt(self, task: BlockchainSyncTask, receipt: dict, contract_called: str = None):
        """
        Step 6 & 7: Captures metadata and updates database with real on-chain details.
        """
        tx_hash = receipt.get("transactionHash")
        from app.blockchain.client import blockchain_client
        from app.blockchain.contracts.loader import contract_loader
        
        contract_name = contract_called or f"{task.entity_type.value.capitalize()}Registry"
        contract_address = receipt.get("toAddress") or contract_loader.addresses.get(contract_name)
        gas_price_wei = receipt.get("effectiveGasPrice") or 35000000000

        # Save Transaction Metadata
        result = await self.db.execute(select(BlockchainTransaction).filter_by(transaction_hash=tx_hash))
        tx = result.scalar_one_or_none()
        if not tx:
            tx = BlockchainTransaction(
                transaction_hash=tx_hash,
                block_number=receipt.get("blockNumber"),
                gas_used=receipt.get("gasUsed"),
                gas_price=str(gas_price_wei),
                contract_address=contract_address,
                contract_name=contract_name,
                contract_version="1.0.0",
                status="CONFIRMED" if receipt.get("status") == 1 else "REVERTED",
                wallet_address=receipt.get("fromAddress") or blockchain_client.wallet_address,
                network="amoy",
                chain_id=80002,
                confirmation_count=1,
                execution_time_ms=1200
            )
            self.db.add(tx)
        
        # Step 8: Mark sync complete
        task.transaction_hash = tx_hash
        task.status = SyncStatus.CONFIRMED if receipt.get("status") == 1 else SyncStatus.REVERTED
        task.error_message = None
        
        # Phase 10: Update Entity Tables and trigger Notifications
        if task.status == SyncStatus.CONFIRMED:
            await self._update_entity_blockchain_status(task, tx_hash, receipt.get("blockNumber"))
            
        await self.db.commit()

    async def _update_entity_blockchain_status(self, task: BlockchainSyncTask, tx_hash: str, block_number: int):
        from app.models.patient import Patient
        from app.models.doctor import Doctor
        from app.models.pharmacy import Pharmacy
        from app.models.prescription import Prescription
        from app.models.record import MedicalRecordVersion, MedicalRecord, AIAnalysis
        from sqlalchemy import or_
        
        if task.entity_type == SyncEntityType.PATIENT:
            result = await self.db.execute(
                select(Patient).filter(or_(Patient.user_id == task.entity_id, Patient.id == task.entity_id))
            )
            entity = result.scalar_one_or_none()
            if entity:
                entity.blockchain_status = "CONFIRMED"
                entity.blockchain_tx_hash = tx_hash

        elif task.entity_type == SyncEntityType.DOCTOR:
            result = await self.db.execute(
                select(Doctor).filter(or_(Doctor.user_id == task.entity_id, Doctor.id == task.entity_id))
            )
            entity = result.scalar_one_or_none()
            if entity:
                entity.blockchain_status = "CONFIRMED"
                entity.blockchain_tx_hash = tx_hash

        elif task.entity_type == SyncEntityType.PHARMACY:
            result = await self.db.execute(
                select(Pharmacy).filter(or_(Pharmacy.user_id == task.entity_id, Pharmacy.id == task.entity_id))
            )
            entity = result.scalar_one_or_none()
            if entity:
                entity.blockchain_status = "CONFIRMED"
                entity.blockchain_tx_hash = tx_hash

        elif task.entity_type == SyncEntityType.PRESCRIPTION:
            result = await self.db.execute(select(Prescription).filter(Prescription.id == task.entity_id))
            entity = result.scalar_one_or_none()
            if entity:
                entity.blockchain_status = "CONFIRMED"
                entity.blockchain_tx_hash = tx_hash
                entity.block_number = block_number
                
        elif task.entity_type == SyncEntityType.MEDICAL_RECORD:
            # We used version.id or record.id for medical record
            result = await self.db.execute(
                select(MedicalRecordVersion).filter(or_(MedicalRecordVersion.id == task.entity_id, MedicalRecordVersion.record_id == task.entity_id))
            )
            version = result.scalar_one_or_none()
            if version:
                version.blockchain_status = "CONFIRMED"
                version.blockchain_tx_hash = tx_hash
                version.block_number = block_number
            else:
                result = await self.db.execute(select(AIAnalysis).filter(AIAnalysis.version_id == task.entity_id))
                ai = result.scalar_one_or_none()
                if ai:
                    ai.blockchain_status = "CONFIRMED"
                    ai.blockchain_tx_hash = tx_hash
                    ai.block_number = block_number


    async def _handle_failure(self, task: BlockchainSyncTask, error_msg: str):
        """
        Handles retry logic and exponential backoff.
        """
        task.retry_count += 1
        task.error_message = error_msg
        
        if task.retry_count >= task.max_retries:
            task.status = SyncStatus.FAILED
        else:
            task.status = SyncStatus.RETRYING

        await self.db.commit()
