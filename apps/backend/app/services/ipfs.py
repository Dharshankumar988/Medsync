import os
import hashlib
import logging
from fastapi import UploadFile

logger = logging.getLogger("medsync.ipfs")

class IPFSServiceError(Exception):
    pass

class IPFSService:
    """
    IPFS Service (DEPRECATED & DISCONNECTED).
    Decentralized IPFS / Pinata storage has been permanently disconnected.
    MedSync manages medical file storage directly via Supabase Storage
    with tamper-proof cryptographic integrity anchored on the Polygon blockchain.
    """

    IS_ENABLED: bool = False
    STATUS: str = "disconnected"

    @staticmethod
    def _get_pinata_jwt() -> str:
        raise IPFSServiceError("IPFS service has been permanently disconnected. Pinata JWT is not used.")
        
    @staticmethod
    async def _pinata_upload(file_bytes: bytes, filename: str, content_type: str = "application/octet-stream") -> str:
        raise IPFSServiceError("IPFS service is disconnected. Uploads to Pinata are disabled.")

    @staticmethod
    async def upload_encrypted_content(encrypted_bytes: bytes, filename: str) -> str:
        raise IPFSServiceError("IPFS service is disconnected. Encrypted IPFS uploads are disabled.")
        
    @staticmethod
    async def retrieve_encrypted_content(cid: str) -> bytes:
        raise IPFSServiceError("IPFS service is disconnected. IPFS gateway retrievals are disabled.")

    @staticmethod
    async def upload_synthetic_test_content(content: bytes, filename: str = "synthetic_test.txt") -> str:
        raise IPFSServiceError("IPFS service is disconnected. Synthetic test uploads are disabled.")

    @staticmethod
    async def upload_file(file: UploadFile) -> str:
        raise NotImplementedError("IPFS service is permanently disconnected.")

    @staticmethod
    async def upload_bytes(file_bytes: bytes, filename: str) -> str:
        raise NotImplementedError("IPFS service is permanently disconnected.")

    @staticmethod
    def generate_hash(file_bytes: bytes) -> str:
        """Utility SHA-256 hash generation remains active for content verification."""
        return hashlib.sha256(file_bytes).hexdigest()

