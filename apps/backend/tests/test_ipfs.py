import os
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.services.ipfs import IPFSService, IPFSServiceError
import httpx

# ---------------------------------------------------------
# A. UNIT TESTS (Mocked)
# ---------------------------------------------------------

@pytest.fixture
def mock_env(monkeypatch):
    monkeypatch.setenv("PINATA_JWT", "fake_test_jwt")

@pytest.mark.asyncio
async def test_ipfs_upload_synthetic_success(mock_env):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"IpfsHash": "QmTest123Hash"}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        
        cid = await IPFSService.upload_synthetic_test_content(b"Test content", "test.txt")
        
        assert cid == "QmTest123Hash"
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert kwargs["headers"]["Authorization"] == "Bearer fake_test_jwt"
        assert kwargs["files"]["file"][0] == "test.txt"

@pytest.mark.asyncio
async def test_ipfs_missing_jwt(monkeypatch):
    monkeypatch.setenv("PINATA_JWT", "")
    
    with pytest.raises(IPFSServiceError) as excinfo:
        await IPFSService.upload_synthetic_test_content(b"Test")
        
    assert "PINATA_JWT environment variable is missing" in str(excinfo.value)

@pytest.mark.asyncio
async def test_ipfs_auth_failure(mock_env):
    mock_response = MagicMock()
    mock_response.status_code = 401

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        
        with pytest.raises(IPFSServiceError) as excinfo:
            await IPFSService.upload_synthetic_test_content(b"Test")
            
        assert "Pinata authentication failed: 401" in str(excinfo.value)

@pytest.mark.asyncio
async def test_ipfs_rate_limit_retry_failure(mock_env):
    mock_response = MagicMock()
    mock_response.status_code = 429

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        
        with pytest.raises(IPFSServiceError) as excinfo:
            await IPFSService.upload_synthetic_test_content(b"Test")
            
        assert "Pinata upload failed after 3 attempts" in str(excinfo.value)
        assert mock_post.call_count == 3

@pytest.mark.asyncio
async def test_upload_file_disabled(mock_env):
    with pytest.raises(NotImplementedError) as excinfo:
        await IPFSService.upload_file(None)
    assert "Protected medical-document IPFS uploads are disabled" in str(excinfo.value)


# ---------------------------------------------------------
# B. INTEGRATION TEST (Real Pinata)
# ---------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.skipif(os.getenv("RUN_PINATA_INTEGRATION_TESTS") != "true", reason="Integration tests not enabled")
async def test_real_pinata_integration():
    """
    This test runs only when RUN_PINATA_INTEGRATION_TESTS=true and a real PINATA_JWT is set.
    It verifies end-to-end upload of synthetic content.
    """
    test_content = b"MedSync IPFS integration test"
    
    cid = await IPFSService.upload_synthetic_test_content(test_content, "integration_test.txt")
    
    assert cid is not None
    assert isinstance(cid, str)
    assert len(cid) > 10  # Basic CID length check
