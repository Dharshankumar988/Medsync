import os
from pydantic_settings import BaseSettings, SettingsConfigDict

def _clean(value: str | None) -> str:
    return value.strip() if value else ""

class BlockchainSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    POLYGON_RPC_URL: str = _clean(os.getenv("POLYGON_RPC_URL", "http://127.0.0.1:8545"))
    BACKEND_PRIVATE_KEY: str = _clean(os.getenv("BACKEND_PRIVATE_KEY", ""))
    NETWORK_NAME: str = _clean(os.getenv("BLOCKCHAIN_NETWORK", "amoy"))
    
    # Gas & Transactions
    GAS_MULTIPLIER: float = float(os.getenv("GAS_MULTIPLIER", "1.2"))
    MAX_RETRIES: int = int(os.getenv("MAX_RETRIES", "3"))
    RETRY_DELAY_SECONDS: int = int(os.getenv("RETRY_DELAY_SECONDS", "5"))
    TX_TIMEOUT_SECONDS: int = int(os.getenv("TX_TIMEOUT_SECONDS", "120"))
    
    def validate(self):
        if not self.POLYGON_RPC_URL:
            raise ValueError("POLYGON_RPC_URL must be configured")
        if not self.BACKEND_PRIVATE_KEY:
            raise ValueError("BACKEND_PRIVATE_KEY must be configured")

blockchain_settings = BlockchainSettings()
