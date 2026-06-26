from app.blockchain.client import w3_client
from app.blockchain.config import blockchain_settings
import uuid

class MedicalRecordRegistryService:
    @staticmethod
    def register_record(record_id: uuid.UUID, ipfs_cid: str, sha256_hash: str, owner_id: uuid.UUID, version: int):
        print(f"BLOCKCHAIN: Registering Record {record_id} v{version} (CID: {ipfs_cid}, Hash: {sha256_hash})")
        # contract = w3_client.load_contract(blockchain_settings.RECORD_REGISTRY_ADDRESS, "MedicalRecordRegistry")
        # tx_func = contract.functions.registerRecordVersion(str(record_id), ipfs_cid, sha256_hash, str(owner_id), version)
        # return w3_client.sign_and_send(tx_func)
        return w3_client.sign_and_send(None)
