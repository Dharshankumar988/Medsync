import pytest
from app.services.ipfs import IPFSService, IPFSServiceError

# ---------------------------------------------------------
# VERIFICATION THAT IPFS IS DISCONNECTED & DECOMMISSIONED
# ---------------------------------------------------------

def test_ipfs_service_is_disabled():
    """Verify that IPFS is globally flagged as disabled/disconnected."""
    assert IPFSService.IS_ENABLED is False
    assert IPFSService.STATUS == "disconnected"

@pytest.mark.asyncio
async def test_ipfs_upload_synthetic_disabled():
    """Verify synthetic uploads are blocked and raise IPFSServiceError."""
    with pytest.raises(IPFSServiceError, match="disconnected"):
        await IPFSService.upload_synthetic_test_content(b"Test content")

@pytest.mark.asyncio
async def test_ipfs_upload_encrypted_disabled():
    """Verify encrypted uploads are blocked."""
    with pytest.raises(IPFSServiceError, match="disconnected"):
        await IPFSService.upload_encrypted_content(b"Encrypted data", "file.enc")

@pytest.mark.asyncio
async def test_ipfs_retrieve_disabled():
    """Verify retrievals are blocked."""
    with pytest.raises(IPFSServiceError, match="disconnected"):
        await IPFSService.retrieve_encrypted_content("QmTest123Hash")

@pytest.mark.asyncio
async def test_upload_file_disabled():
    """Verify file uploads raise NotImplementedError."""
    with pytest.raises(NotImplementedError, match="disconnected"):
        await IPFSService.upload_file(None)

@pytest.mark.asyncio
async def test_upload_bytes_disabled():
    """Verify byte uploads raise NotImplementedError."""
    with pytest.raises(NotImplementedError, match="disconnected"):
        await IPFSService.upload_bytes(b"test", "test.bin")

def test_generate_hash_utility_remains_functional():
    """Verify SHA-256 hash helper continues to work safely for system integrity."""
    test_data = b"MedSync data integrity check"
    digest = IPFSService.generate_hash(test_data)
    assert isinstance(digest, str)
    assert len(digest) == 64
