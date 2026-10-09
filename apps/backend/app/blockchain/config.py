import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Always load the backend .env explicitly
_backend_dir = Path(__file__).resolve().parent.parent.parent
_env_path = _backend_dir / ".env"
if _env_path.exists():
    load_dotenv(_env_path, override=False)
else:
    load_dotenv()

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
    model_config = SettingsConfigDict(
        env_file=str(_env_path) if _env_path.exists() else ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )
    BLOCKCHAIN_RPC_URL: str | None = None
    POLYGON_RPC_URL: str | None = None
    POLYGON_AMOY_RPC_URL: str | None = None
    BACKEND_PRIVATE_KEY: str = ""
    BLOCKCHAIN_NETWORK: str = "amoy"
    POLYGONSCAN_API_KEY: str = ""
    MEDSYNC_WALLET_ADDRESS: str = ""

    @property
    def NETWORK_NAME(self) -> str:
        return self.BLOCKCHAIN_NETWORK
    
    # Gas & Transactions
    GAS_MULTIPLIER: float = float(os.getenv("GAS_MULTIPLIER", "1.2"))
    MAX_RETRIES: int = int(os.getenv("MAX_RETRIES", "3"))
    RETRY_DELAY_SECONDS: int = int(os.getenv("RETRY_DELAY_SECONDS", "5"))
    TX_TIMEOUT_SECONDS: int = int(os.getenv("TX_TIMEOUT_SECONDS", "120"))
    
    def validate(self):
        # Re-check environment in case it was loaded after import
        if not self.BACKEND_PRIVATE_KEY:
            self.BACKEND_PRIVATE_KEY = _clean(os.getenv("BACKEND_PRIVATE_KEY", ""))
        if not self.MEDSYNC_WALLET_ADDRESS:
            self.MEDSYNC_WALLET_ADDRESS = _clean(os.getenv("MEDSYNC_WALLET_ADDRESS", ""))
        if not self.POLYGONSCAN_API_KEY:
            self.POLYGONSCAN_API_KEY = _clean(os.getenv("POLYGONSCAN_API_KEY", ""))

        # Resolve RPC URL at runtime
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

        import logging
        logger = logging.getLogger("blockchain.config")
        logger.info(f"Resolved RPC URL: {self.BLOCKCHAIN_RPC_URL[:50]}... for network {self.BLOCKCHAIN_NETWORK}")

        # Derive wallet address if not provided
        if not self.MEDSYNC_WALLET_ADDRESS and self.BACKEND_PRIVATE_KEY:
            try:
                from eth_account import Account
                pk = self.BACKEND_PRIVATE_KEY.strip()
                if pk.startswith("0x"):
                    pk = pk[2:]
                if len(pk) == 64:
                    self.MEDSYNC_WALLET_ADDRESS = Account.from_key("0x" + pk).address
            except Exception:
                pass

        # Only require private key in production mode
        if os.getenv("BLOCKCHAIN_MODE") in ("production", "real"):
            if not self.BACKEND_PRIVATE_KEY:
                raise ValueError("BACKEND_PRIVATE_KEY must be configured in production mode")
        else:
            if not self.BACKEND_PRIVATE_KEY:
                self.BACKEND_PRIVATE_KEY = "0x0000000000000000000000000000000000000000000000000000000000000001"

blockchain_settings = BlockchainSettings()
blockchain_settings.validate()


