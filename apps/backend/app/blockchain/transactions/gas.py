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
        Falls back to legacy gasPrice otherwise.
        """
        try:
            latest_block = blockchain_client.w3.eth.get_block('latest')
            if 'baseFeePerGas' in latest_block:
                base_fee = latest_block['baseFeePerGas']
                # Adding 50% buffer to base fee for priority
                max_fee = int(base_fee * 1.5)
                max_priority = blockchain_client.w3.eth.max_priority_fee
                
                transaction['maxFeePerGas'] = max_fee
                transaction['maxPriorityFeePerGas'] = max_priority
            else:
                # Legacy network
                transaction['gasPrice'] = blockchain_client.w3.eth.gas_price
        except Exception as e:
            logger.warning(f"Error fetching EIP-1559 fees, falling back to legacy: {e}")
            transaction['gasPrice'] = blockchain_client.w3.eth.gas_price
            
        return transaction

gas_manager = GasManager()
