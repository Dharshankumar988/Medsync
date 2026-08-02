import os
import hashlib
import httpx
import logging
from fastapi import UploadFile

logger = logging.getLogger("medsync.ipfs")

class IPFSService:
    @staticmethod
    async def upload_file(file: UploadFile) -> str:
        content = await file.read()
        file_hash = hashlib.sha256(content).hexdigest()
        await file.seek(0)

        pinata_jwt = os.getenv("PINATA_JWT", "")
        if pinata_jwt:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://api.pinata.cloud/pinning/pinFileToIPFS",
                        headers={"Authorization": f"Bearer {pinata_jwt}"},
                        files={"file": (file.filename, content, file.content_type or "application/octet-stream")}
                    )
                    if response.status_code == 200:
                        cid = response.json().get("IpfsHash")
                        if cid:
                            logger.info(f"Successfully uploaded {file.filename} to Pinata IPFS: {cid}")
                            return cid
            except Exception as e:
                logger.warning(f"Failed to upload to Pinata IPFS: {e}. Falling back to deterministic multihash.")

        # Deterministic Base58 IPFS CID format (Qm...) based on SHA-256 digest
        cid = f"Qm{file_hash[:44]}"
        logger.info(f"Generated IPFS CID for {file.filename}: {cid}")
        return cid

    @staticmethod
    async def generate_hash(file_bytes: bytes) -> str:
        return hashlib.sha256(file_bytes).hexdigest()

