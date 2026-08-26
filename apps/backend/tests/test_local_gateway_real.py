import os
import sys
import logging

# Ensure imports work from the root of apps/backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Ensure environment variables are loaded
from dotenv import load_dotenv
load_dotenv()

from app.blockchain.gateway import BlockchainGateway
from app.blockchain.client import blockchain_client

logging.basicConfig(level=logging.INFO)

def main():
    if not blockchain_client.w3.is_connected():
        print("Failed to connect to local Hardhat node.")
        sys.exit(1)
        
    print(f"Connected to local node at {blockchain_client.w3.provider.endpoint_uri}")

    gateway = BlockchainGateway()
    
    # Generate synthetic bytes32 hashes
    import secrets
    record_hash = "0x" + secrets.token_hex(32)
    patient_hash = "0x" + secrets.token_hex(32)
    doctor_hash = "0x" + secrets.token_hex(32)
    prescription_hash = "0x" + secrets.token_hex(32)
    pharmacy_hash = "0x" + secrets.token_hex(32)

    # 1. Test PatientRegistry
    print("\n--- Testing PatientRegistry ---")
    try:
        # Dummy patient address
        patient_address = "0x" + "11" * 20
        receipt = gateway.write_contract("PatientRegistry", "registerPatient", patient_hash, patient_address)
        print(f"[SUCCESS] registerPatient Tx: {receipt['transactionHash']}")
        
        is_verified = gateway.read_contract("PatientRegistry", "verifyPatient", patient_hash)
        print(f"[SUCCESS] verifyPatient returned: {is_verified}")
    except Exception as e:
        print(f"[ERROR] PatientRegistry failed: {e}")

    # 2. Test MedicalRecordRegistry
    print("\n--- Testing MedicalRecordRegistry ---")
    try:
        receipt = gateway.write_contract("MedicalRecordRegistry", "registerRecord", record_hash, patient_hash)
        print(f"[SUCCESS] registerRecord Tx: {receipt['transactionHash']}")
        
        is_verified = gateway.read_contract("MedicalRecordRegistry", "verifyRecord", record_hash)
        print(f"[SUCCESS] verifyRecord returned: {is_verified}")
    except Exception as e:
        print(f"[ERROR] MedicalRecordRegistry failed: {e}")

    # 3. Test PrescriptionRegistry
    print("\n--- Testing PrescriptionRegistry ---")
    try:
        receipt = gateway.write_contract("PrescriptionRegistry", "createPrescription", prescription_hash, patient_hash, doctor_hash)
        print(f"[SUCCESS] createPrescription Tx: {receipt['transactionHash']}")
        
        is_verified = gateway.read_contract("PrescriptionRegistry", "verifyPrescription", prescription_hash)
        print(f"[SUCCESS] verifyPrescription returned: {is_verified}")
    except Exception as e:
        print(f"[ERROR] PrescriptionRegistry failed: {e}")

    # 4. Test AuditTrail
    print("\n--- Testing AuditTrail ---")
    try:
        receipt = gateway.write_contract("AuditTrail", "logEvent", patient_hash, record_hash)
        print(f"[SUCCESS] logEvent Tx: {receipt['transactionHash']}")
        # AuditTrail.logEvent just logs an event, it doesn't return state data
    except Exception as e:
        print(f"[ERROR] AuditTrail failed: {e}")

if __name__ == "__main__":
    main()
