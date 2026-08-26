import hashlib
import logging

logger = logging.getLogger("medsync.crypto_hash")

class CryptoHashError(Exception):
    pass

def generate_sha256_hash(data: bytes) -> str:
    """
    Generates a deterministic SHA-256 hash of the provided bytes.
    
    WARNING: For secure workflows, this should ONLY be called on ENCRYPTED data,
    never on plaintext PHI, to ensure the resulting cryptographic identifier
    can be safely placed on the blockchain or IPFS.
    
    Returns:
        str: A 64-character hex string representing the SHA-256 hash.
    """
    if not isinstance(data, bytes):
        raise CryptoHashError("Data must be bytes to compute hash.")
        
    return hashlib.sha256(data).hexdigest()
