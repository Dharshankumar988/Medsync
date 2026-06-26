import hashlib
from fastapi import UploadFile

class IPFSService:
    @staticmethod
    async def upload_file(file: UploadFile) -> str:
        # Generate SHA-256
        content = await file.read()
        file_hash = hashlib.sha256(content).hexdigest()
        
        # Reset pointer for downstream tasks
        await file.seek(0)
        
        print(f"IPFS: Hashed file {file.filename} -> {file_hash}")
        print("IPFS: Uploading to decentralized storage...")
        
        # Mock CID return
        mock_cid = f"Qm_mock_cid_{file_hash[:10]}"
        return mock_cid

    @staticmethod
    async def generate_hash(file_bytes: bytes) -> str:
        return hashlib.sha256(file_bytes).hexdigest()
