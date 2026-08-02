import logging
from app.blockchain.client import blockchain_client
from app.blockchain.config import blockchain_settings
from app.blockchain.types import HealthStatus

logger = logging.getLogger("blockchain.monitoring.health")

class HealthMonitoringService:
    def get_health(self) -> HealthStatus:
        try:
            is_connected = blockchain_client.is_connected()
            if not is_connected:
                return self._offline_status()

            chain_id = blockchain_client.get_chain_id()
            current_block = blockchain_client.get_current_block()
            balance = blockchain_client.get_balance()

            return {
                "status": "healthy",
                "network": blockchain_settings.NETWORK_NAME,
                "chainId": chain_id,
                "currentBlock": current_block,
                "rpcConnected": True,
                "walletAddress": blockchain_client.wallet_address,
                "walletBalanceEth": balance
            }
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return self._offline_status()

    def _offline_status(self) -> HealthStatus:
        return {
            "status": "unhealthy",
            "network": blockchain_settings.NETWORK_NAME,
            "chainId": None,
            "currentBlock": None,
            "rpcConnected": False,
            "walletAddress": getattr(blockchain_client, "wallet_address", None),
            "walletBalanceEth": None
        }

health_service = HealthMonitoringService()
