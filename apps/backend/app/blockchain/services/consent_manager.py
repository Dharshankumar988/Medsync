from app.blockchain.client import w3_client
from app.blockchain.config import blockchain_settings
import uuid

class ConsentManagerService:
    @staticmethod
    def grant_access(record_id: uuid.UUID, doctor_id: uuid.UUID, patient_id: uuid.UUID):
        print(f"BLOCKCHAIN: Granting access to {record_id} for Doctor {doctor_id}")
        return w3_client.sign_and_send(None)
        
    @staticmethod
    def revoke_access(record_id: uuid.UUID, doctor_id: uuid.UUID, patient_id: uuid.UUID):
        print(f"BLOCKCHAIN: Revoking access to {record_id} from Doctor {doctor_id}")
        return w3_client.sign_and_send(None)
