import os
from pydantic_settings import BaseSettings, SettingsConfigDict

def _clean(value: str | None) -> str:
    return value.strip() if value else ""

def _resolve_rpc_url() -> str:
    """Resolve RPC URL: BLOCKCHAIN_RPC_URL takes priority, then network-specific RPC, falls back to Amoy/Alchemy."""
    url = os.getenv("BLOCKCHAIN_RPC_URL")
    if not url:
        network = os.getenv("BLOCKCHAIN_NETWORK", "amoy").lower()
        if network == "amoy":
            url = os.getenv("POLYGON_AMOY_RPC_URL") or os.getenv("NEXT_PUBLIC_POLYGON_RPC_URL") or os.getenv("POLYGON_RPC_URL")
        else:
            url = os.getenv("POLYGON_RPC_URL")
    return (url or "https://polygon-amoy.g.alchemy.com/v2/alch__Nw1xD-aIASoR5r0zqb1c").strip()

class BlockchainSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    BLOCKCHAIN_RPC_URL: str | None = None
    # Backward compat alias — existing code references POLYGON_RPC_URL
    POLYGON_RPC_URL: str | None = None
    # Polygon Amoy testnet specific
    POLYGON_AMOY_RPC_URL: str | None = None
    BACKEND_PRIVATE_KEY: str = _clean(os.getenv("BACKEND_PRIVATE_KEY", ""))
    BLOCKCHAIN_NETWORK: str = "amoy"
    # Polygonscan API key for fetching transaction data
    POLYGONSCAN_API_KEY: str = _clean(os.getenv("POLYGONSCAN_API_KEY", ""))
    # MedSync wallet address for dashboard display
    MEDSYNC_WALLET_ADDRESS: str = _clean(os.getenv("MEDSYNC_WALLET_ADDRESS", ""))

    @property
    def NETWORK_NAME(self) -> str:
        return self.BLOCKCHAIN_NETWORK
    
    # Gas & Transactions
    GAS_MULTIPLIER: float = float(os.getenv("GAS_MULTIPLIER", "1.2"))
    MAX_RETRIES: int = int(os.getenv("MAX_RETRIES", "3"))
    RETRY_DELAY_SECONDS: int = int(os.getenv("RETRY_DELAY_SECONDS", "5"))
    TX_TIMEOUT_SECONDS: int = int(os.getenv("TX_TIMEOUT_SECONDS", "120"))
    
    def validate(self):
        # Resolve RPC URL at runtime so .env is already loaded by Pydantic
        if not self.BLOCKCHAIN_RPC_URL:
            network = self.BLOCKCHAIN_NETWORK.lower()
            if network == "amoy":
                self.BLOCKCHAIN_RPC_URL = (
                    self.POLYGON_AMOY_RPC_URL 
                    or os.getenv("NEXT_PUBLIC_POLYGON_RPC_URL") 
                    or self.POLYGON_RPC_URL 
                    or "https://polygon-amoy.g.alchemy.com/v2/alch__Nw1xD-aIASoR5r0zqb1c"
                )
            else:
                self.BLOCKCHAIN_RPC_URL = self.POLYGON_RPC_URL or "https://polygon-amoy.g.alchemy.com/v2/alch__Nw1xD-aIASoR5r0zqb1c"

        # Log the resolved RPC URL for debugging
        import logging
        logger = logging.getLogger("blockchain.config")
        logger.info(f"Resolved RPC URL: {self.BLOCKCHAIN_RPC_URL[:50]}... for network {self.BLOCKCHAIN_NETWORK}")

        if not self.BLOCKCHAIN_RPC_URL or self.BLOCKCHAIN_RPC_URL == "http://127.0.0.1:8545":
            if os.getenv("BLOCKCHAIN_MODE") in ("production", "real"):
                logger.warning("RPC URL is set to localhost in production mode")

        # Only require private key in production mode
        if os.getenv("BLOCKCHAIN_MODE") in ("production", "real"):
            if not self.BACKEND_PRIVATE_KEY:
                raise ValueError("BACKEND_PRIVATE_KEY must be configured in production mode")
        else:
            # In mock mode, private key is optional but we still try to derive wallet if provided
            if not self.BACKEND_PRIVATE_KEY:
                logger.info("BACKEND_PRIVATE_KEY not configured - using mock wallet address")
                self.BACKEND_PRIVATE_KEY = "0x0000000000000000000000000000000000000000000000000000000000000001"

blockchain_settings = BlockchainSettings()

