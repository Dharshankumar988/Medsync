import logging
from typing import Any, Dict, List

from app.blockchain.contracts.loader import contract_loader
from app.blockchain.transactions.manager import transaction_manager
from app.blockchain.monitoring.events import event_listener
from app.blockchain.monitoring.health import health_service
from app.blockchain.types import TransactionReceiptResult, HealthStatus
from app.blockchain.exceptions import ContractExecutionError

logger = logging.getLogger("blockchain.gateway")

class BlockchainGateway:
    """
    Central authoritative gateway for all blockchain interactions in MedSync.
    No domain logic should interact with Web3 directly outside of this class.
    """
    
    def read_contract(self, contract_name: str, function_name: str, *args) -> Any:
        """
        Executes a read-only (view/pure) function on a contract.
        """
        try:
            contract = contract_loader.get_contract(contract_name)
            func = getattr(contract.functions, function_name)
            return func(*args).call()
        except Exception as e:
            logger.error(f"Read call failed on {contract_name}.{function_name}: {e}")
            raise ContractExecutionError(f"Failed to read from contract: {e}")

    def write_contract(self, contract_name: str, function_name: str, *args) -> TransactionReceiptResult:
        """
        Executes a state-changing transaction on a contract.
        """
        logger.info(f"Initiating write to {contract_name}.{function_name}")
        try:
            contract = contract_loader.get_contract(contract_name)
            func = getattr(contract.functions, function_name)
            
            # Build the un-transacted contract function invocation
            contract_function = func(*args)
            
            # Use TransactionManager to estimate gas, nonce, sign, and broadcast
            receipt = transaction_manager.send_transaction(contract_function)
            
            # Attempt to decode events directly from receipt to enrich the return
            decoded_events = event_listener.decode_logs(contract_name, receipt['logs'])
            receipt['decoded_events'] = decoded_events
            
            return receipt
            
        except Exception as e:
            logger.error(f"Write call failed on {contract_name}.{function_name}: {e}")
            raise

    def get_past_events(self, contract_name: str, event_name: str, from_block: int) -> List[Dict[str, Any]]:
        """
        Fetches historical events from a contract.
        """
        return event_listener.get_past_events(contract_name, event_name, from_block)

    def get_health_status(self) -> HealthStatus:
        """
        Retrieves the health status of the blockchain node and wallet.
        """
        return health_service.get_health()

blockchain_gateway = BlockchainGateway()
