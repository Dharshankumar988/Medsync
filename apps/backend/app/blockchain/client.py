import logging
import os
try:
    from web3 import Web3
    from eth_account import Account
except ImportError:
    Web3 = None
    Account = None
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

        if Web3 is None or Account is None:
            logger.info("web3 / eth_account packages not available — blockchain client running in mock mode.")
            return

        # ── Always derive wallet address from private key (identity, not writes) ──
        pk = (blockchain_settings.BACKEND_PRIVATE_KEY or "").strip()
        clean_pk = pk[2:] if pk.startswith("0x") else pk
        if clean_pk and len(clean_pk) == 64:
            try:
                self.account = Account.from_key("0x" + clean_pk)
                self.wallet_address = self.account.address
                logger.info(f"Blockchain client: derived wallet address {self.wallet_address}")
            except Exception as e:
                logger.warning(f"Failed to derive wallet from private key: {e}. Using mock address.")
        elif blockchain_settings.MEDSYNC_WALLET_ADDRESS:
            self.wallet_address = blockchain_settings.MEDSYNC_WALLET_ADDRESS
            logger.info(f"Blockchain client: using configured wallet address {self.wallet_address}")
        else:
            logger.info("Using configured or default wallet address for blockchain client.")

        # ── Always connect to RPC for reads, even in mock mode, to show true network status ──
        if RESOLVED_BLOCKCHAIN_MODE not in ("production", "real"):
            logger.info("Blockchain client: mock mode — writes disabled, but RPC connected for reads.")

        try:
            blockchain_settings.validate()
        except ValueError as e:
            logger.warning(f"Blockchain configuration missing: {e}. Blockchain features disabled.")
            self.configured = True  # Mark as configured even if missing private key (for mock mode)
            return

        try:
            from web3.middleware import geth_poa_middleware
            from requests.adapters import HTTPAdapter
            from urllib3.util.retry import Retry
            import requests
            import urllib3
        except ImportError as ie:
            logger.warning(f"Optional web3/requests dependencies not available: {ie}")
            return

        # Disable warnings for fallback non-verified SSL on Windows
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

        # Resolve SSL CA bundle: prefer certifi, then system default, then disable
        ssl_verify: str | bool = False
        try:
            import certifi
            ssl_verify = certifi.where()
        except ImportError:
            pass

        # Setup robust session with retries for the HTTP Provider
        session = requests.Session()
        retry = Retry(
            total=4,
            connect=3,
            read=3,
            backoff_factor=1.0,
            status_forcelist=(429, 500, 502, 503, 504),
            respect_retry_after_header=True
        )
        adapter = HTTPAdapter(max_retries=retry)
        session.mount('http://', adapter)
        session.mount('https://', adapter)
        self.session = session

        FALLBACK_RPCS = [
            "https://polygon-amoy-bor-rpc.publicnode.com",
            "https://polygon-amoy.drpc.org",
        ]

        # Candidate URLs to attempt: primary configured first, followed by public fallbacks
        primary_rpc = (blockchain_settings.BLOCKCHAIN_RPC_URL or "").strip()
        candidates = []
        if primary_rpc:
            candidates.append(primary_rpc)
        for fb in FALLBACK_RPCS:
            if fb not in candidates:
                candidates.append(fb)

        chosen_rpc = candidates[0] if candidates else "https://polygon-amoy-bor-rpc.publicnode.com"
        
        # Test candidate connectivity and auto-switch if rate-limited (429) or unreachable
        for candidate in candidates:
            try:
                res = session.post(
                    candidate,
                    json={"jsonrpc": "2.0", "method": "web3_clientVersion", "params": [], "id": 1},
                    verify=ssl_verify,
                    timeout=5
                )
                if res.status_code == 200:
                    chosen_rpc = candidate
                    break
                else:
                    logger.warning(
                        f"RPC candidate {_redact_url(candidate)} responded with status {res.status_code}. "
                        f"Trying next fallback..."
                    )
            except Exception as e:
                # SSL test failure fallback: try with verify=False once
                try:
                    res = session.post(
                        candidate,
                        json={"jsonrpc": "2.0", "method": "web3_clientVersion", "params": [], "id": 1},
                        verify=False,
                        timeout=5
                    )
                    if res.status_code == 200:
                        ssl_verify = False
                        chosen_rpc = candidate
                        break
                except Exception:
                    logger.warning(f"RPC candidate {_redact_url(candidate)} unreachable: {e}")

        session.verify = ssl_verify
        self.ssl_verify = ssl_verify
        self.current_rpc_url = chosen_rpc
        req_kwargs = {'timeout': 10, 'verify': ssl_verify}

        self.w3 = Web3(Web3.HTTPProvider(chosen_rpc, session=session, request_kwargs=req_kwargs))

        # Inject POA middleware for Polygon compatibility
        self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)

        if not self.w3.is_connected():
            if RESOLVED_BLOCKCHAIN_MODE in ("production", "real"):
                logger.error(
                    f"BLOCKCHAIN_MODE=production but RPC node is unreachable: "
                    f"{_redact_url(chosen_rpc)} — blockchain features will be unavailable until the node is reachable."
                )
            else:
                logger.warning(
                    f"RPC node is unreachable (mock mode): {_redact_url(chosen_rpc)}"
                )
            self.configured = True
            return

        self.configured = True
        logger.info(f"Blockchain client: RPC connected to {_redact_url(chosen_rpc)} and wallet configured")

    def switch_to_fallback(self) -> bool:
        """
        Dynamically fail over to the next working public RPC endpoint when the active endpoint
        is rate-limited (429) or down.
        """
        if not self.w3:
            return False
        try:
            import requests
            from web3 import Web3
            from web3.middleware import geth_poa_middleware
            
            fallback_candidates = [
                "https://polygon-amoy-bor-rpc.publicnode.com",
                "https://polygon-amoy.drpc.org",
            ]
            
            curr = getattr(self, "current_rpc_url", None)
            for candidate in fallback_candidates:
                if candidate == curr:
                    continue
                try:
                    test_res = requests.post(
                        candidate,
                        json={"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1},
                        verify=getattr(self, "ssl_verify", False),
                        timeout=5
                    )
                    if test_res.status_code == 200:
                        logger.warning(
                            f"Failing over blockchain RPC from {_redact_url(curr or '')} to {_redact_url(candidate)}"
                        )
                        self.current_rpc_url = candidate
                        session = getattr(self, "session", None) or requests.Session()
                        req_kwargs = {'timeout': 10, 'verify': getattr(self, "ssl_verify", False)}
                        self.w3 = Web3(Web3.HTTPProvider(candidate, session=session, request_kwargs=req_kwargs))
                        self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
                        try:
                            from app.blockchain.contracts.loader import contract_loader
                            contract_loader.contracts.clear()
                        except Exception:
                            pass
                        return True
                except Exception:
                    continue
        except Exception as e:
            logger.error(f"Error while switching to fallback RPC: {e}")
        return False

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

