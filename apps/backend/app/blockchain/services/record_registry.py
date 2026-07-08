import uuid
from app.blockchain.client import w3_client
from app.blockchain.config import blockchain_settings
import logging

logger = logging.getLogger("record_registry")

class MedicalRecordRegistryService:
    @staticmethod
    def register_record(record_id: uuid.UUID, storage_type: str, storage_reference: str, sha256_hash: str, owner_id: uuid.UUID, version: int):
        logger.info(f"BLOCKCHAIN: Registering Record {record_id} v{version} on Polygon (Hash: {sha256_hash})")
        
        # Actual interaction
        contract = w3_client.load_contract(blockchain_settings.RECORD_REGISTRY_ADDRESS, "MedicalRecordRegistry")
        tx_func = contract.functions.registerRecordVersion(
            str(record_id), 
            storage_type,
            storage_reference,
            sha256_hash, 
            str(owner_id), 
            version
        )
        return w3_client.send_and_wait_transaction(tx_func)
