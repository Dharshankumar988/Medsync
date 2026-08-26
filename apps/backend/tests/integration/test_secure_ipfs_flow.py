import os
import pytest
import logging
from unittest.mock import patch, MagicMock
from app.services.key_management import KeyManagementService, KeyManagementError
from app.services.encryption import EncryptionService, EncryptionError
from app.utils.crypto_hash import generate_sha256_hash
from app.services.ipfs import IPFSService, IPFSServiceError
from app.blockchain.gateway import blockchain_gateway
from app.services.record import MedicalRecordService
from app.services.prescription import PrescriptionService

# Use synthetic content only
SYNTHETIC_PLAINTEXT = b"MedSync encrypted IPFS integration test"

def test_key_management_fails_in_prod(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("MEDSYNC_DEV_ENCRYPTION_KEY", "00"*32)
    with pytest.raises(KeyManagementError, match="strictly forbidden in production"):
        KeyManagementService.get_encryption_key()

def test_key_management_missing_key(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.delenv("MEDSYNC_DEV_ENCRYPTION_KEY", raising=False)
    with pytest.raises(KeyManagementError, match="MEDSYNC_DEV_ENCRYPTION_KEY is missing"):
        KeyManagementService.get_encryption_key()

def test_encryption_round_trip():
    key = os.urandom(32)
    ciphertext = EncryptionService.encrypt(SYNTHETIC_PLAINTEXT, key)
    assert ciphertext != SYNTHETIC_PLAINTEXT
    
    plaintext = EncryptionService.decrypt(ciphertext, key)
    assert plaintext == SYNTHETIC_PLAINTEXT

def test_encryption_wrong_key():
    key1 = os.urandom(32)
    key2 = os.urandom(32)
    ciphertext = EncryptionService.encrypt(SYNTHETIC_PLAINTEXT, key1)
    with pytest.raises(EncryptionError, match="Decryption failed"):
        EncryptionService.decrypt(ciphertext, key2)

def test_encryption_tampered_ciphertext():
    key = os.urandom(32)
    ciphertext = bytearray(EncryptionService.encrypt(SYNTHETIC_PLAINTEXT, key))
    # Flip a bit in ciphertext/tag
    ciphertext[-1] ^= 0x01
    with pytest.raises(EncryptionError, match="Decryption failed"):
        EncryptionService.decrypt(bytes(ciphertext), key)

def test_encryption_tampered_nonce():
    key = os.urandom(32)
    ciphertext = bytearray(EncryptionService.encrypt(SYNTHETIC_PLAINTEXT, key))
    # Flip a bit in nonce (first 12 bytes)
    ciphertext[0] ^= 0x01
    with pytest.raises(EncryptionError, match="Decryption failed"):
        EncryptionService.decrypt(bytes(ciphertext), key)

def test_encryption_non_deterministic():
    key = os.urandom(32)
    c1 = EncryptionService.encrypt(SYNTHETIC_PLAINTEXT, key)
    c2 = EncryptionService.encrypt(SYNTHETIC_PLAINTEXT, key)
    assert c1 != c2

def test_hash_deterministic():
    data = b"test_hash"
    h1 = generate_sha256_hash(data)
    h2 = generate_sha256_hash(data)
    assert h1 == h2

@pytest.mark.asyncio
async def test_ipfs_boundary(monkeypatch):
    monkeypatch.setenv("MEDSYNC_DEV_ENCRYPTION_KEY", os.urandom(32).hex())
    monkeypatch.setenv("ENVIRONMENT", "development")
    
    key = KeyManagementService.get_encryption_key()
    encrypted_bytes = EncryptionService.encrypt(SYNTHETIC_PLAINTEXT, key)
    
    # Mock IPFSService._pinata_upload to verify arguments
    async def mock_upload(file_bytes, filename, content_type):
        assert file_bytes == encrypted_bytes
        assert file_bytes != SYNTHETIC_PLAINTEXT
        assert SYNTHETIC_PLAINTEXT not in file_bytes
        # Do not log PINATA_JWT or key
        return "mock_cid"
        
    monkeypatch.setattr(IPFSService, "_pinata_upload", mock_upload)
    
    cid = await IPFSService.upload_encrypted_content(encrypted_bytes, "test_enc")
    assert cid == "mock_cid"
    
    # Test plaintext methods are disabled
    with pytest.raises(NotImplementedError):
        await IPFSService.upload_bytes(SYNTHETIC_PLAINTEXT, "plain")

@pytest.mark.asyncio
async def test_blockchain_synthetic_flow(monkeypatch, caplog):
    monkeypatch.setenv("MEDSYNC_DEV_ENCRYPTION_KEY", os.urandom(32).hex())
    monkeypatch.setenv("ENVIRONMENT", "development")
    
    key = KeyManagementService.get_encryption_key()
    encrypted_bytes = EncryptionService.encrypt(SYNTHETIC_PLAINTEXT, key)
    enc_hash = generate_sha256_hash(encrypted_bytes)
    
    # Check if real blockchain integration is enabled
    run_real = os.getenv("RUN_BLOCKCHAIN_INTEGRATION_TESTS", "false").lower() == "true"
    
    if run_real:
        assert os.getenv("BLOCKCHAIN_NETWORK") == "amoy", "Must run on amoy for integration test"
        # Actual integration test could happen here if needed, but for safety we mock by default
        # the requirement states: "Never silently spend POL during pytest."
    else:
        # Mock blockchain gateway
        mock_write = MagicMock()
        monkeypatch.setattr(blockchain_gateway, "write_contract", mock_write)
        
        patient_hash = bytes.fromhex(generate_sha256_hash(b"fake_patient"))
        enc_hash_bytes = bytes.fromhex(enc_hash)
        blockchain_gateway.register_medical_record(enc_hash_bytes, patient_hash)
        
        mock_write.assert_called_once()
        args = mock_write.call_args[0]
        # args = ("MedicalRecordRegistry", "registerRecord", enc_hash_bytes, patient_hash)
        
        # Verify no plaintext or key in blockchain args
        for arg in args:
            if isinstance(arg, bytes):
                assert arg != SYNTHETIC_PLAINTEXT
                assert key not in arg
        
    # Verify no keys in logs
    for record in caplog.records:
        assert key.hex() not in record.message
        pinata_jwt = os.getenv("PINATA_JWT", "")
        if pinata_jwt:
            assert pinata_jwt not in record.message

def test_medical_record_service_unchanged():
    # Verify no new IPFS logic is added to MedicalRecordService.upload_record
    # We inspect the code text to ensure it's not using the new IPFS methods
    import inspect
    source = inspect.getsource(MedicalRecordService.upload_record)
    assert "IPFSService.upload_encrypted_content" not in source

def test_prescription_service_unchanged():
    import inspect
    source = inspect.getsource(PrescriptionService.create_prescription)
    assert "IPFSService.upload_encrypted_content" not in source
