import os
import logging
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag

logger = logging.getLogger("medsync.encryption")

class EncryptionError(Exception):
    pass

class EncryptionService:
    """
    Handles authenticated encryption using AES-256-GCM.
    
    Serialization Format: [12-byte nonce][ciphertext + authentication tag]
    
    WARNING: This service never logs keys or plaintext.
    """

    @staticmethod
    def encrypt(plaintext: bytes, key: bytes) -> bytes:
        """
        Encrypts plaintext using AES-256-GCM.
        Generates a secure random 12-byte nonce for each operation.
        
        Returns:
            bytes: serialized format [nonce][ciphertext + tag]
        """
        if not isinstance(plaintext, bytes):
            raise EncryptionError("Plaintext must be bytes.")
            
        if len(key) != 32:
            raise EncryptionError("Key must be 32 bytes for AES-256.")

        # Generate a cryptographically secure 12-byte nonce
        nonce = os.urandom(12)
        
        # Initialize AES-GCM cipher
        aesgcm = AESGCM(key)
        
        # Encrypt the data
        try:
            ciphertext = aesgcm.encrypt(nonce, plaintext, None)
            return nonce + ciphertext
        except Exception as e:
            # Catch all unexpected crypto errors to prevent leakage
            logger.error("Encryption operation failed.")
            raise EncryptionError("Encryption failed.") from e

    @staticmethod
    def decrypt(encrypted_bytes: bytes, key: bytes) -> bytes:
        """
        Decrypts the serialized encrypted payload using AES-256-GCM.
        
        Expects:
            encrypted_bytes: [12-byte nonce][ciphertext + tag]
            
        Returns:
            bytes: The original plaintext
        """
        if not isinstance(encrypted_bytes, bytes):
            raise EncryptionError("Encrypted payload must be bytes.")
            
        if len(key) != 32:
            raise EncryptionError("Key must be 32 bytes for AES-256.")
            
        if len(encrypted_bytes) < 28: # 12 bytes nonce + 16 bytes tag + min 0 byte ciphertext
            raise EncryptionError("Encrypted payload is too short or malformed.")

        nonce = encrypted_bytes[:12]
        ciphertext = encrypted_bytes[12:]
        
        aesgcm = AESGCM(key)
        
        try:
            plaintext = aesgcm.decrypt(nonce, ciphertext, None)
            return plaintext
        except InvalidTag:
            logger.error("Authentication tag validation failed during decryption.")
            raise EncryptionError("Decryption failed. Invalid key, corrupted data, or tampered payload.")
        except Exception as e:
            logger.error("Decryption operation failed.")
            raise EncryptionError("Decryption failed.") from e
