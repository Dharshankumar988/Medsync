import threading
import logging
from app.blockchain.client import blockchain_client

logger = logging.getLogger("blockchain.transactions.nonce")

class NonceManager:
    """
    Manages nonces for outgoing transactions to prevent overlaps or gaps
    in a multithreaded backend environment.
    """
    def __init__(self):
        self._lock = threading.Lock()
        self._current_nonce = None

    def get_next_nonce(self) -> int:
        with self._lock:
            if self._current_nonce is None:
                # Fetch pending transaction count from network
                self._current_nonce = blockchain_client.w3.eth.get_transaction_count(
                    blockchain_client.wallet_address,
                    "pending"
                )
            
            nonce = self._current_nonce
            self._current_nonce += 1
            return nonce
            
    def reset(self):
        """Forces a re-sync of the nonce from the network on next request."""
        with self._lock:
            self._current_nonce = None
            logger.info("Nonce manager reset")

nonce_manager = NonceManager()
