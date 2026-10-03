import logging
import os
from web3 import Web3
from eth_account import Account
from app.blockchain.config import blockchain_settings
from app.blockchain.exceptions import RPCConnectionError, WalletConfigurationError

logger = logging.getLogger("blockchain.client")


def _redact_url(url: str) -> str:
    """Redact API keys from RPC URLs for safe logging/display."""
    if not url:
        return "Not configured"
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        return f"{parsed.scheme}://{parsed.hostname}"
    except Exception:
        return "<redacted>"

class BlockchainClient:
    """
    Singleton client responsible for managing the RPC connection and wallet.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(BlockchainClient, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        from app.blockchain.provider import RESOLVED_BLOCKCHAIN_MODE

        self.configured = False
        self.w3 = None
        self.wallet_address = "0x0000000000000000000000000000000000000000"
        
        # ── Always derive wallet address from private key (identity, not writes) ──
        try:
            pk = blockchain_settings.BACKEND_PRIVATE_KEY
            if not pk.startswith("0x"):
                pk = "0x" + pk
            self.account = Account.from_key(pk)
            self.wallet_address = self.account.address
            logger.info(f"Blockchain client: derived wallet address {self.wallet_address}")
        except Exception as e:
            logger.error("Failed to derive wallet from private key. Ensure BACKEND_PRIVATE_KEY is correct.")
            # Keep default zero address if derivation fails
        
        # ── Always connect to RPC for reads, even in mock mode, to show true network status ──
        if RESOLVED_BLOCKCHAIN_MODE not in ("production", "real"):
            logger.info("Blockchain client: mock mode — writes disabled, but RPC connected for reads.")

        try:
            blockchain_settings.validate()
        except ValueError as e:
            logger.warning(f"Blockchain configuration missing: {e}. Blockchain features disabled.")
            return

        from web3.middleware import geth_poa_middleware
        from requests.adapters import HTTPAdapter
        from urllib3.util.retry import Retry
        import requests
        import urllib3

        # Resolve SSL CA bundle: prefer certifi, then system default, then disable
        ssl_verify: str | bool = True
        try:
            import certifi
            ssl_verify = certifi.where()
        except ImportError:
            # certifi not installed — try system default first
            pass

        # Setup robust session with retries for the HTTP Provider
        session = requests.Session()
        retry = Retry(connect=3, read=3, backoff_factor=0.5, status_forcelist=(429, 500, 502, 503, 504))
        adapter = HTTPAdapter(max_retries=retry)
        session.mount('http://', adapter)
        session.mount('https://', adapter)

        # Test connectivity with current ssl_verify setting
        rpc_url = blockchain_settings.BLOCKCHAIN_RPC_URL
        try:
            session.post(rpc_url, json={"jsonrpc": "2.0", "method": "web3_clientVersion", "params": [], "id": 1},
                         verify=ssl_verify, timeout=5)
        except requests.exceptions.SSLError:
            logger.warning("SSL certificate verification failed — falling back to unverified mode for RPC.")
            ssl_verify = False
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

        session.verify = ssl_verify

        self.w3 = Web3(Web3.HTTPProvider(rpc_url, session=session, request_kwargs={'timeout': 10, 'verify': ssl_verify}))
        
        # Inject POA middleware for Polygon compatibility
        self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        
        if not self.w3.is_connected():
            logger.error(
                f"BLOCKCHAIN_MODE=production but RPC node is unreachable: "
                f"{_redact_url(blockchain_settings.BLOCKCHAIN_RPC_URL)}  — "
                f"blockchain features will be unavailable until the node is reachable."
            )
            # Do not raise here so app doesn't crash on boot; wait until invoked
            return

        self.configured = True
        logger.info(f"Blockchain client: RPC connected and wallet configured")

    def _ensure_configured(self):
        if not getattr(self, 'configured', False):
            raise WalletConfigurationError("Blockchain functionality is not configured.")

    def _ensure_rpc_available(self):
        if self.w3 is None:
            raise WalletConfigurationError("RPC connection not available (mock mode or not configured).")

    def get_chain_id(self) -> int:
        self._ensure_configured()
        self._ensure_rpc_available()
        return self.w3.eth.chain_id

    def get_current_block(self) -> int:
        self._ensure_configured()
        self._ensure_rpc_available()
        return self.w3.eth.block_number

    def get_balance(self, address: str = None) -> float:
        self._ensure_configured()
        self._ensure_rpc_available()
        target = address or self.wallet_address
        balance_wei = self.w3.eth.get_balance(Web3.to_checksum_address(target))
        return float(self.w3.from_wei(balance_wei, "ether"))

    def is_connected(self) -> bool:
        return self.w3 is not None and self.w3.is_connected()

blockchain_client = BlockchainClient()

