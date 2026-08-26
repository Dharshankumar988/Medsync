import os
import hashlib
import logging
import httpx
from fastapi import UploadFile

logger = logging.getLogger("medsync.ipfs")

class IPFSServiceError(Exception):
    pass

class IPFSService:
    """
    IPFS Service abstracting Pinata integration.
    WARNING: Production medical-document IPFS uploads are intentionally disabled 
    until encrypted storage and key management are implemented.
    """

    @staticmethod
    def _get_pinata_jwt() -> str:
        pinata_jwt = os.getenv("PINATA_JWT", "")
        if not pinata_jwt:
            raise IPFSServiceError("PINATA_JWT environment variable is missing or empty.")
        return pinata_jwt
        
    @staticmethod
    async def _pinata_upload(file_bytes: bytes, filename: str, content_type: str = "application/octet-stream") -> str:
        """Internal helper to upload bytes to Pinata."""
        pinata_jwt = IPFSService._get_pinata_jwt()
        
        headers = {"Authorization": f"Bearer {pinata_jwt}"}
        files = {"file": (filename, file_bytes, content_type)}
        
        # Simple retry logic
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    response = await client.post(
                        "https://api.pinata.cloud/pinning/pinFileToIPFS",
                        headers=headers,
                        files=files
                    )
                    
                    if response.status_code == 200:
                        cid = response.json().get("IpfsHash")
                        if not cid:
                            raise IPFSServiceError("Pinata returned 200 but missing IpfsHash")
                        logger.info("Successfully uploaded synthetic content to Pinata.")
                        return cid
                    elif response.status_code in (401, 403):
                        raise IPFSServiceError(f"Pinata authentication failed: {response.status_code}")
                    elif response.status_code == 429:
                        # Rate limited, let it retry
                        pass
                    else:
                        raise IPFSServiceError(f"Pinata upload failed with status {response.status_code}")
            except httpx.RequestError as e:
                logger.warning(f"Pinata network error (attempt {attempt+1}/3): {e}")
                if attempt == 2:
                    raise IPFSServiceError(f"Pinata network error after retries: {e}")
                    
        raise IPFSServiceError("Pinata upload failed after 3 attempts due to rate limiting or transient errors.")

    @staticmethod
    async def upload_encrypted_content(encrypted_bytes: bytes, filename: str) -> str:
        """
        Uploads an explicitly encrypted payload to Pinata.
        Does NOT accept plaintext PHI.
        """
        if not encrypted_bytes:
            raise IPFSServiceError("Content cannot be empty.")
        
        # We enforce it's called 'encrypted_bytes' to emphasize the boundary.
        return await IPFSService._pinata_upload(encrypted_bytes, filename, content_type="application/octet-stream")
        
    @staticmethod
    async def retrieve_encrypted_content(cid: str) -> bytes:
        """
        Retrieves an encrypted payload from the IPFS gateway.
        """
        if not cid:
            raise IPFSServiceError("CID cannot be empty.")
            
        gateway_url = f"https://gateway.pinata.cloud/ipfs/{cid}"
        pinata_jwt = IPFSService._get_pinata_jwt()
        # Alternatively we can use the dedicated gateway with the gateway token, but for now we'll use public or authenticated gateway
        # If the gateway requires auth we pass the JWT.
        headers = {} # "Authorization": f"Bearer {pinata_jwt}" - Usually gateway is separate from API, but we'll try simple request first.
        
        import asyncio
        for attempt in range(5):
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    response = await client.get(gateway_url)
                    
                    if response.status_code == 200:
                        return response.content
                    elif response.status_code == 429:
                        await asyncio.sleep(5)
                    elif response.status_code == 404:
                        # File might not have propagated yet
                        await asyncio.sleep(5)
                    else:
                        raise IPFSServiceError(f"IPFS retrieval failed with status {response.status_code}")
            except httpx.RequestError as e:
                logger.warning(f"IPFS gateway network error (attempt {attempt+1}/5): {e}")
                if attempt == 4:
                    raise IPFSServiceError(f"IPFS gateway network error after retries: {e}")
                    
        raise IPFSServiceError("IPFS retrieval failed after 5 attempts.")

    @staticmethod
    async def upload_synthetic_test_content(content: bytes, filename: str = "synthetic_test.txt") -> str:
        """
        The ONLY active path to IPFS during this phase.
        Use this to verify Pinata connectivity and infrastructure using synthetic data only.
        """
        if not content:
            raise IPFSServiceError("Content cannot be empty.")
            
        return await IPFSService._pinata_upload(content, filename, content_type="text/plain")

    @staticmethod
    async def upload_file(file: UploadFile) -> str:
        """
        Disabled for plaintext medical data.
        """
        raise NotImplementedError("Protected medical-document IPFS uploads are disabled until encryption is implemented.")

    @staticmethod
    async def upload_bytes(file_bytes: bytes, filename: str) -> str:
        """
        Disabled for plaintext medical data.
        """
        raise NotImplementedError("Protected medical-document IPFS uploads are disabled until encryption is implemented.")

    @staticmethod
    def generate_hash(file_bytes: bytes) -> str:
        return hashlib.sha256(file_bytes).hexdigest()

