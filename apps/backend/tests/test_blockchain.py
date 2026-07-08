import pytest
import json
from app.utils.hash import generate_prescription_hash
from app.models.blockchain import BlockchainTaskStatus
from app.blockchain.client import Web3Client

def test_generate_prescription_hash_determinism():
    """Test that the hash is perfectly deterministic regardless of dictionary key order."""
    data_1 = {
        "prescription_id": "123e4567-e89b-12d3-a456-426614174000",
        "patient_id": "123e4567-e89b-12d3-a456-426614174001",
        "doctor_id": "123e4567-e89b-12d3-a456-426614174002",
        "diagnosis": "Common Cold"
    }
    
    data_2 = {
        "diagnosis": "Common Cold",
        "doctor_id": "123e4567-e89b-12d3-a456-426614174002",
        "patient_id": "123e4567-e89b-12d3-a456-426614174001",
        "prescription_id": "123e4567-e89b-12d3-a456-426614174000"
    }
    
    hash_1 = generate_prescription_hash(data_1)
    hash_2 = generate_prescription_hash(data_2)
    
    assert hash_1 == hash_2, "Hashes must be identical for the same data"

def test_generate_prescription_hash_mutation():
    """Test that any slight modification changes the hash completely."""
    data_1 = {
        "prescription_id": "123e4567-e89b-12d3-a456-426614174000",
        "diagnosis": "Common Cold",
    }
    data_2 = {
        "prescription_id": "123e4567-e89b-12d3-a456-426614174000",
        "diagnosis": "Common cold", # lowercase c
    }
    
    assert generate_prescription_hash(data_1) != generate_prescription_hash(data_2)

@pytest.mark.asyncio
async def test_blockchain_status_enums():
    """Verify enum states are correctly mapped"""
    assert BlockchainTaskStatus.PENDING == "PENDING"
    assert BlockchainTaskStatus.FAILED == "FAILED"
    assert BlockchainTaskStatus.CONFIRMED == "CONFIRMED"

# Note: In a full test suite, we would mock AsyncSessionLocal and the Web3 RPC calls 
# using unittests.mock.patch to verify that the worker correctly retries or confirms tasks.
