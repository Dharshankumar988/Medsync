import os
import sys
import logging

# Ensure imports work from the root of apps/backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Swap the private key to an unauthorized account (Hardhat Account #1)
os.environ["BACKEND_PRIVATE_KEY"] = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
os.environ["BLOCKCHAIN_MODE"] = "real"
os.environ["BLOCKCHAIN_NETWORK"] = "localhost"

from app.blockchain.gateway import BlockchainGateway
from app.blockchain.client import blockchain_client

logging.basicConfig(level=logging.INFO)

def main():
    if not blockchain_client.w3.is_connected():
        print("Failed to connect to local Hardhat node.")
        sys.exit(1)
        
    print(f"Connected to local node at {blockchain_client.w3.provider.endpoint_uri}")
    print(f"Testing with UNAUTHORIZED Wallet Address: {blockchain_client.wallet_address}")

    gateway = BlockchainGateway()
    
    import secrets
    record_hash = "0x" + secrets.token_hex(32)
    patient_hash = "0x" + secrets.token_hex(32)

    print("\n--- Testing Unauthorized Access on PatientRegistry ---")
    try:
        receipt = gateway.write_contract("PatientRegistry", "registerPatient", patient_hash, "0x" + "22" * 20)
        print(f"[FAIL] Transaction succeeded when it should have failed! Tx: {receipt['transactionHash']}")
    except Exception as e:
        print(f"[SUCCESS] Transaction correctly reverted: {e}")

if __name__ == "__main__":
    main()
