import logging
from typing import Any, Dict, List

from app.blockchain.contracts.loader import contract_loader
from app.blockchain.transactions.manager import transaction_manager
from app.blockchain.monitoring.events import event_listener
from app.blockchain.monitoring.health import health_service
from app.blockchain.types import TransactionReceiptResult, HealthStatus
from app.blockchain.exceptions import ContractExecutionError

logger = logging.getLogger("blockchain.gateway")

class BlockchainGateway:
    """
    Central authoritative gateway for all blockchain interactions in MedSync.
    No domain logic should interact with Web3 directly outside of this class.
    """
    
    def read_contract(self, contract_name: str, function_name: str, *args) -> Any:
        """
        Executes a read-only (view/pure) function on a contract.
        """
        try:
            contract = contract_loader.get_contract(contract_name)
            func = getattr(contract.functions, function_name)
            return func(*args).call()
        except Exception as e:
            logger.error(f"Read call failed on {contract_name}.{function_name}: {e}")
            raise ContractExecutionError(f"Failed to read from contract: {e}")

    def write_contract(self, contract_name: str, function_name: str, *args) -> TransactionReceiptResult:
        """
        Executes a state-changing transaction on a contract.
        """
        logger.info(f"Initiating write to {contract_name}.{function_name}")
        try:
            contract = contract_loader.get_contract(contract_name)
            func = getattr(contract.functions, function_name)
            
            # Build the un-transacted contract function invocation
            contract_function = func(*args)
            
            # Use TransactionManager to estimate gas, nonce, sign, and broadcast
            receipt = transaction_manager.send_transaction(contract_function)
            
            # Attempt to decode events directly from receipt to enrich the return
            decoded_events = event_listener.decode_logs(contract_name, receipt['logs'])
            receipt['decoded_events'] = decoded_events
            
            return receipt
            
        except Exception as e:
            logger.error(f"Write call failed on {contract_name}.{function_name}: {e}")
            raise

    def get_past_events(self, contract_name: str, event_name: str, from_block: int) -> List[Dict[str, Any]]:
        """
        Fetches historical events from a contract.
        """
        return event_listener.get_past_events(contract_name, event_name, from_block)

    def get_health_status(self) -> HealthStatus:
        """
        Retrieves the health status of the blockchain node and wallet.
        """
        return health_service.get_health()

    # --- Application-Level Blockchain Methods ---

    def register_medical_record(self, record_hash: bytes, patient_hash: bytes) -> TransactionReceiptResult:
        return self.write_contract("MedicalRecordRegistry", "registerRecord", record_hash, patient_hash)

    def verify_medical_record(self, record_hash: bytes) -> TransactionReceiptResult:
        return self.write_contract("MedicalRecordRegistry", "verifyRecord", record_hash)

    def register_prescription(self, prescription_hash: bytes, patient_hash: bytes, doctor_hash: bytes) -> TransactionReceiptResult:
        return self.write_contract("PrescriptionRegistry", "createPrescription", prescription_hash, patient_hash, doctor_hash)

    def verify_prescription(self, prescription_hash: bytes) -> TransactionReceiptResult:
        return self.write_contract("PrescriptionRegistry", "verifyPrescription", prescription_hash)

    def register_patient(self, patient_hash: bytes, wallet: str) -> TransactionReceiptResult:
        if len(patient_hash) != 32:
            raise ValueError(f"patient_hash must be exactly 32 bytes for bytes32 ABI, got {len(patient_hash)}")
        return self.write_contract("PatientRegistry", "registerPatient", patient_hash, wallet)

    def verify_patient(self, patient_hash: bytes) -> TransactionReceiptResult:
        if len(patient_hash) != 32:
            raise ValueError(f"patient_hash must be exactly 32 bytes for bytes32 ABI, got {len(patient_hash)}")
        return self.write_contract("PatientRegistry", "verifyPatient", patient_hash)

    def register_doctor(self, doctor_hash: bytes, license_hash: bytes, hospital_hash: bytes, wallet: str) -> TransactionReceiptResult:
        return self.write_contract("DoctorRegistry", "registerDoctor", doctor_hash, license_hash, hospital_hash, wallet)

    def verify_doctor(self, doctor_hash: bytes) -> TransactionReceiptResult:
        return self.write_contract("DoctorRegistry", "verifyDoctor", doctor_hash)

    def register_pharmacy(self, pharmacy_hash: bytes, license_hash: bytes, owner: str) -> TransactionReceiptResult:
        return self.write_contract("PharmacyRegistry", "registerPharmacy", pharmacy_hash, license_hash, owner)

    def verify_pharmacy(self, pharmacy_hash: bytes) -> TransactionReceiptResult:
        return self.write_contract("PharmacyRegistry", "verifyPharmacy", pharmacy_hash)

    def log_audit_event(self, event_type: bytes, entity_hash: bytes) -> TransactionReceiptResult:
        # Enforce exact 32 bytes for bytes32
        if len(event_type) < 32:
            event_type = event_type.ljust(32, b'\x00')
        elif len(event_type) > 32:
            raise ValueError(f"event_type must be <= 32 bytes to fit in bytes32 ABI, got {len(event_type)}")
            
        if len(entity_hash) != 32:
            raise ValueError(f"entity_hash must be exactly 32 bytes for bytes32 ABI, got {len(entity_hash)}")
            
        return self.write_contract("AuditTrail", "logEvent", event_type, entity_hash)

blockchain_gateway = BlockchainGateway()
