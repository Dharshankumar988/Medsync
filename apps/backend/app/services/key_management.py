import os
import logging

logger = logging.getLogger("medsync.key_management")

class KeyManagementError(Exception):
    pass

class KeyManagementService:
    """
    Key Management Boundary for MedSync.
    
    WARNING: DEVELOPMENT ONLY
    This service currently uses a local environment variable (MEDSYNC_DEV_ENCRYPTION_KEY)
    for development and testing purposes.
    
    It is designed to fail safely and require a ProductionKMSProvider when
    running in production mode.
    
    Keys are NEVER logged, returned through APIs, persisted to DB, or sent to IPFS/Polygon.
    """

    @staticmethod
    def get_encryption_key() -> bytes:
        """
        Retrieves the encryption key for the current environment.
        """
        # In a real system, we'd check ENVIRONMENT/ENV variables.
        # For this phase, we explicitly require MEDSYNC_DEV_ENCRYPTION_KEY
        # and warn heavily.
        
        env = os.getenv("ENVIRONMENT", "development")
        if env == "production":
            raise KeyManagementError(
                "Production mode detected. MEDSYNC_DEV_ENCRYPTION_KEY is strictly forbidden in production. "
                "A ProductionKMSProvider (e.g. AWS KMS, HashiCorp Vault) must be implemented."
            )

        key_hex = os.getenv("MEDSYNC_DEV_ENCRYPTION_KEY")
        if not key_hex:
            raise KeyManagementError(
                "MEDSYNC_DEV_ENCRYPTION_KEY is missing. "
                "Please set it for development/testing."
            )
            
        try:
            key_bytes = bytes.fromhex(key_hex)
        except ValueError:
            raise KeyManagementError("MEDSYNC_DEV_ENCRYPTION_KEY must be a valid hex string.")
            
        if len(key_bytes) != 32:
            raise KeyManagementError(f"Encryption key must be exactly 32 bytes (256 bits). Found {len(key_bytes)} bytes.")
            
        return key_bytes
