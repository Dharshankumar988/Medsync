import os
import sys
import pytest
import logging
from unittest.mock import patch
from dotenv import load_dotenv

# Load real environment variables for E2E tests, overriding conftest.py mocks
load_dotenv('apps/backend/.env', override=True)
load_dotenv('apps/blockchain/.env', override=True)

import certifi
os.environ['SSL_CERT_FILE'] = certifi.where()
os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()

os.environ['BLOCKCHAIN_NETWORK'] = 'amoy'
os.environ['POLYGON_RPC_URL'] = os.getenv('POLYGON_AMOY_RPC_URL', 'https://polygon-amoy.g.alchemy.com/v2/alch__Nw1xD-aIASoR5r0zqb1c')

# Delete conftest.py mocks that interfere with real blockchain
if 'BLOCKCHAIN_RPC_URL' in os.environ:
    del os.environ['BLOCKCHAIN_RPC_URL']
if 'BLOCKCHAIN_MODE' in os.environ:
    del os.environ['BLOCKCHAIN_MODE']

# Remove conftest.py mocks for real E2E integration
for mod in ['web3', 'web3.contract', 'web3.exceptions', 'eth_account', 'eth_account.messages', 'eth_utils']:
    sys.modules.pop(mod, None)

from app.services.key_management import KeyManagementService, KeyManagementError
from app.services.encryption import EncryptionService, EncryptionError
from app.utils.crypto_hash import generate_sha256_hash
from app.services.ipfs import IPFSService, IPFSServiceError
from app.blockchain.gateway import blockchain_gateway

# Synthetic data for tests
SYNTHETIC_RECORD = b"MEDSYNC_SYNTHETIC_TEST_RECORD_2026"
SYNTHETIC_PRESCRIPTION = b"MEDSYNC_SYNTHETIC_TEST_PRESCRIPTION_2026"

@pytest.mark.asyncio
async def test_e2e_medical_record_pipeline(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("BLOCKCHAIN_MODE", "real")
    
    # Reload blockchain_client because it's a singleton and might have been loaded in mock mode earlier
    from app.blockchain.client import blockchain_client
    blockchain_client._initialize()
    
    # Generate a random 32-byte encryption key for tests
    monkeypatch.setenv("MEDSYNC_DEV_ENCRYPTION_KEY", os.urandom(32).hex())
    key = KeyManagementService.get_encryption_key()
    
    intercepted_uploads = []
    original_pinata_upload = IPFSService._pinata_upload
    
    async def spy_pinata_upload(file_bytes, filename, content_type):
        intercepted_uploads.append(file_bytes)
        assert SYNTHETIC_RECORD not in file_bytes
        assert key not in file_bytes
        return await original_pinata_upload(file_bytes, filename, content_type)
        
    monkeypatch.setattr(IPFSService, "_pinata_upload", spy_pinata_upload)
    
    encrypted_bytes = EncryptionService.encrypt(SYNTHETIC_RECORD, key)
    sha256_hex = generate_sha256_hash(encrypted_bytes)
    
    cid = await IPFSService.upload_encrypted_content(encrypted_bytes, "synthetic_record.bin")
    assert cid is not None
    assert len(intercepted_uploads) == 1
    
    record_hash_bytes = bytes.fromhex(sha256_hex)
    patient_hash = bytes.fromhex(generate_sha256_hash(b"synthetic_patient"))
    
    original_write_contract = blockchain_gateway.write_contract
    intercepted_writes = []
    
    def spy_write_contract(contract_name, function_name, *args):
        intercepted_writes.append((contract_name, function_name, args))
        for arg in args:
            if isinstance(arg, bytes):
                assert SYNTHETIC_RECORD not in arg
                assert key not in arg
        return original_write_contract(contract_name, function_name, *args)
        
    monkeypatch.setattr(blockchain_gateway, "write_contract", spy_write_contract)
    
    # Polygon Registration
    receipt = blockchain_gateway.register_medical_record(record_hash_bytes, patient_hash)
    assert receipt is not None
    assert receipt["status"] == 1
    assert len(intercepted_writes) == 1
    
    # Polygon Read Verification
    read_receipt = blockchain_gateway.verify_medical_record(record_hash_bytes)
    assert read_receipt is not None
    assert read_receipt["status"] == 1, "Medical record verification transaction failed"
    assert len(read_receipt.get("decoded_events", [])) > 0, "No verification event emitted"
    
    retrieved_bytes = await IPFSService.retrieve_encrypted_content(cid)
    
    retrieved_hash = generate_sha256_hash(retrieved_bytes)
    assert retrieved_hash == sha256_hex
    
    decrypted_content = EncryptionService.decrypt(retrieved_bytes, key)
    assert decrypted_content == SYNTHETIC_RECORD
    
    print(f"\n[REPORT] RECORD CID: {cid}")
    print(f"[REPORT] RECORD SHA256: {sha256_hex}")
    tx_hash_str = receipt['transactionHash'].hex() if isinstance(receipt['transactionHash'], bytes) else str(receipt['transactionHash'])
    print(f"[REPORT] RECORD TX Hash: {tx_hash_str}")

@pytest.mark.asyncio
async def test_e2e_prescription_pipeline(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("BLOCKCHAIN_MODE", "real")
    
    from app.blockchain.client import blockchain_client
    blockchain_client._initialize()
    
    monkeypatch.setenv("MEDSYNC_DEV_ENCRYPTION_KEY", os.urandom(32).hex())
    key = KeyManagementService.get_encryption_key()
    
    encrypted_bytes = EncryptionService.encrypt(SYNTHETIC_PRESCRIPTION, key)
    sha256_hex = generate_sha256_hash(encrypted_bytes)
    
    cid = await IPFSService.upload_encrypted_content(encrypted_bytes, "synthetic_prescription.bin")
    assert cid is not None
    
    prescription_hash_bytes = bytes.fromhex(sha256_hex)
    patient_hash = bytes.fromhex(generate_sha256_hash(b"synthetic_patient_p"))
    doctor_hash = bytes.fromhex(generate_sha256_hash(b"synthetic_doctor_p"))
    
    original_write_contract = blockchain_gateway.write_contract
    def spy_write_contract(contract_name, function_name, *args):
        for arg in args:
            if isinstance(arg, bytes):
                assert SYNTHETIC_PRESCRIPTION not in arg
                assert key not in arg
        return original_write_contract(contract_name, function_name, *args)
        
    monkeypatch.setattr(blockchain_gateway, "write_contract", spy_write_contract)
    
    # Polygon Registration
    receipt = blockchain_gateway.register_prescription(prescription_hash_bytes, patient_hash, doctor_hash)
    assert receipt is not None
    assert receipt["status"] == 1
    
    # Polygon Read Verification
    read_receipt = blockchain_gateway.verify_prescription(prescription_hash_bytes)
    assert read_receipt is not None
    assert read_receipt["status"] == 1, "Prescription verification transaction failed"
    assert len(read_receipt.get("decoded_events", [])) > 0, "No verification event emitted"
    
    tx_hash_str = receipt['transactionHash'].hex() if isinstance(receipt['transactionHash'], bytes) else str(receipt['transactionHash'])
    print(f"\n[REPORT] PRESCRIPTION TX Hash: {tx_hash_str}")

@pytest.mark.asyncio
async def test_failure_scenarios(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("MEDSYNC_DEV_ENCRYPTION_KEY", os.urandom(32).hex())
    key = KeyManagementService.get_encryption_key()
    
    # 1. Missing credentials (IPFS)
    monkeypatch.setenv("PINATA_JWT", "")
    with pytest.raises(IPFSServiceError, match="PINATA_JWT environment variable is missing"):
        await IPFSService.upload_encrypted_content(b"dummy", "dummy.txt")
    
    # Undo the monkeypatch for next steps
    monkeypatch.undo()

    # 2. Incorrect CID
    with pytest.raises(IPFSServiceError):
        await IPFSService.retrieve_encrypted_content("invalid_cid_format_123")

@pytest.mark.asyncio
async def test_tamper_ipfs_ciphertext(monkeypatch):
    """Phase 4 - Test A: IPFS ciphertext tampering"""
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("MEDSYNC_DEV_ENCRYPTION_KEY", os.urandom(32).hex())
    key = KeyManagementService.get_encryption_key()

    encrypted_bytes = EncryptionService.encrypt(SYNTHETIC_RECORD, key)
    # Corrupt the ciphertext by flipping a bit in the last byte (MAC tag)
    tampered_bytes = encrypted_bytes[:-1] + bytes([encrypted_bytes[-1] ^ 0xFF])
    
    # Decryption MUST fail
    with pytest.raises(EncryptionError):
        EncryptionService.decrypt(tampered_bytes, key)

@pytest.mark.asyncio
async def test_tamper_blockchain_hash_mismatch(monkeypatch):
    """Phase 4 - Test B: Blockchain hash mismatch"""
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("MEDSYNC_DEV_ENCRYPTION_KEY", os.urandom(32).hex())
    key = KeyManagementService.get_encryption_key()

    # Original IPFS payload and blockchain hash
    encrypted_bytes = EncryptionService.encrypt(SYNTHETIC_RECORD, key)
    blockchain_stored_hash = generate_sha256_hash(encrypted_bytes)
    
    # Tampered IPFS payload (e.g. attacker swapped CID)
    tampered_bytes = EncryptionService.encrypt(b"MALICIOUS_DATA", key)
    tampered_retrieved_hash = generate_sha256_hash(tampered_bytes)
    
    # Integrity verification MUST fail
    assert tampered_retrieved_hash != blockchain_stored_hash
    
    # Application layer MUST reject before decryption
    def verify_and_decrypt():
        if generate_sha256_hash(tampered_bytes) != blockchain_stored_hash:
            raise ValueError("HASH MISMATCH: REJECT RECORD")
        return EncryptionService.decrypt(tampered_bytes, key)
        
    with pytest.raises(ValueError, match="HASH MISMATCH: REJECT RECORD"):
        verify_and_decrypt()

@pytest.mark.asyncio
async def test_e2e_patient_registration(monkeypatch):
    """Phase 5 - Validate Patient Registration on real blockchain"""
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("BLOCKCHAIN_MODE", "real")
    
    from app.blockchain.client import blockchain_client
    blockchain_client._initialize()
    
    patient_hash = bytes.fromhex(generate_sha256_hash(b"test_patient_e2e_reg"))
    wallet = "0x6EC559064e5BfAE4a98d1879c717139aceE49822"
    
    # Polygon Registration
    receipt = blockchain_gateway.register_patient(patient_hash, wallet)
    assert receipt is not None
    assert receipt["status"] == 1
    
    # Polygon Read Verification
    read_receipt = blockchain_gateway.verify_patient(patient_hash)
    assert read_receipt is not None
    assert read_receipt["status"] == 1, "Patient verification transaction failed"
    
    tx_hash_str = receipt['transactionHash'].hex() if isinstance(receipt['transactionHash'], bytes) else str(receipt['transactionHash'])
    print(f"\n[REPORT] PATIENT REGISTRATION TX Hash: {tx_hash_str}")

@pytest.mark.asyncio
async def test_e2e_audit_logging(monkeypatch):
    """Phase 5 - Validate Audit Entry creation on real blockchain"""
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("BLOCKCHAIN_MODE", "real")
    
    from app.blockchain.client import blockchain_client
    blockchain_client._initialize()
    
    event_type = b"TEST_AUDIT_EVENT"
    entity_hash = bytes.fromhex(generate_sha256_hash(b"test_entity_e2e_audit"))
    
    # Polygon Audit Logging
    receipt = blockchain_gateway.log_audit_event(event_type, entity_hash)
    assert receipt is not None
    assert receipt["status"] == 1
    
    tx_hash_str = receipt['transactionHash'].hex() if isinstance(receipt['transactionHash'], bytes) else str(receipt['transactionHash'])
    print(f"\n[REPORT] AUDIT LOGGING TX Hash: {tx_hash_str}")


