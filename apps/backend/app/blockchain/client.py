import logging
from web3 import Web3
from eth_account import Account
from app.blockchain.config import blockchain_settings
from app.blockchain.exceptions import RPCConnectionError, WalletConfigurationError

logger = logging.getLogger("blockchain.client")

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
        import os
        self.configured = False
        self.w3 = None
        
        if os.getenv("BLOCKCHAIN_MODE", "mock").lower() == "mock":
            logger.info("Mock mode enabled. Skipping RPC and wallet initialization.")
            self.wallet_address = "0x0000000000000000000000000000000000000000"
            return
            
        try:
            blockchain_settings.validate()
        except ValueError as e:
            logger.warning(f"Blockchain configuration missing: {e}. Blockchain features disabled.")
            return

        from web3.middleware import geth_poa_middleware
        from requests.adapters import HTTPAdapter
        from urllib3.util.retry import Retry
        import requests

        # Setup robust session with retries for the HTTP Provider
        session = requests.Session()
        retry = Retry(connect=5, read=5, backoff_factor=0.3, status_forcelist=(429, 500, 502, 503, 504))
        adapter = HTTPAdapter(max_retries=retry)
        session.mount('http://', adapter)
        session.mount('https://', adapter)

        self.w3 = Web3(Web3.HTTPProvider(blockchain_settings.POLYGON_RPC_URL, session=session))
        
        # Inject POA middleware for Polygon compatibility
        self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        
        if not self.w3.is_connected():
            logger.error(f"Failed to connect to RPC node: {blockchain_settings.POLYGON_RPC_URL}")
            # Do not raise here so app doesn't crash on boot; wait until invoked
            return

        try:
            # Ensure the key has a 0x prefix if it's hex
            pk = blockchain_settings.BACKEND_PRIVATE_KEY
            if not pk.startswith("0x"):
                pk = "0x" + pk
            self.account = Account.from_key(pk)
            self.wallet_address = self.account.address
            self.configured = True
            logger.info(f"Initialized Blockchain Client with secure wallet: {self.wallet_address}")
        except Exception as e:
            logger.error("Failed to initialize wallet from private key. Ensure BACKEND_PRIVATE_KEY is correct.")
            # Do not raise during boot

    def _ensure_configured(self):
        if not getattr(self, 'configured', False) or self.w3 is None:
            raise WalletConfigurationError("Blockchain functionality is not configured.")


    def get_chain_id(self) -> int:
        self._ensure_configured()
        return self.w3.eth.chain_id

    def get_current_block(self) -> int:
        self._ensure_configured()
        return self.w3.eth.block_number

    def get_balance(self, address: str = None) -> float:
        self._ensure_configured()
        target = address or self.wallet_address
        balance_wei = self.w3.eth.get_balance(Web3.to_checksum_address(target))
        return float(self.w3.from_wei(balance_wei, "ether"))

    def is_connected(self) -> bool:
        return self.w3.is_connected()

blockchain_client = BlockchainClient()
