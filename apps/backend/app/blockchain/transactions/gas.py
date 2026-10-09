import logging
from app.blockchain.client import blockchain_client
from app.blockchain.config import blockchain_settings
from app.blockchain.exceptions import GasEstimationError

logger = logging.getLogger("blockchain.transactions.gas")

class GasManager:
    """
    Handles gas estimation and fee management.
    """
    @staticmethod
    def estimate_gas_limit(transaction: dict) -> int:
        try:
            estimated = blockchain_client.w3.eth.estimate_gas(transaction)
            # Add safety multiplier
            return int(estimated * blockchain_settings.GAS_MULTIPLIER)
        except Exception as e:
            logger.error(f"Gas estimation failed: {e}")
            raise GasEstimationError(f"Failed to estimate gas: {e}")

    @staticmethod
    def apply_fees(transaction: dict) -> dict:
        """
        Applies EIP-1559 fee parameters to the transaction if supported by the network.
        Guarantees minimum priority fee for Polygon Amoy network.
        """
        try:
            latest_block = blockchain_client.w3.eth.get_block('latest')
            min_priority = blockchain_client.w3.to_wei(35, 'gwei')
            if 'baseFeePerGas' in latest_block:
                base_fee = latest_block.get('baseFeePerGas', 0)
                try:
                    net_priority = blockchain_client.w3.eth.max_priority_fee
                except Exception:
                    net_priority = min_priority
                priority_fee = max(net_priority, min_priority)
                max_fee = int(base_fee * 2) + int(priority_fee * 1.3)
                
                transaction['maxFeePerGas'] = max_fee
                transaction['maxPriorityFeePerGas'] = priority_fee
            else:
                # Legacy network
                transaction['gasPrice'] = max(blockchain_client.w3.eth.gas_price, min_priority)
        except Exception as e:
            logger.warning(f"Error fetching EIP-1559 fees, falling back to legacy: {e}")
            transaction['gasPrice'] = max(blockchain_client.w3.eth.gas_price, blockchain_client.w3.to_wei(35, 'gwei'))
            
        return transaction

gas_manager = GasManager()
