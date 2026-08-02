"""
Mock Blockchain Gateway for local development.
Implements the exact same interface as the real BlockchainGateway so that
the rest of the application can function identically without web3/eth deps.

Activated by setting BLOCKCHAIN_MODE=mock in the environment.
"""
import logging
import hashlib
import time
from typing import Any, Dict, List
from app.blockchain.types import TransactionReceiptResult, HealthStatus

logger = logging.getLogger("blockchain.mock_gateway")

_tx_counter = 0


def _mock_tx_hash() -> str:
    global _tx_counter
    _tx_counter += 1
    seed = f"mock-tx-{_tx_counter}-{time.time()}"
    return "0x" + hashlib.sha256(seed.encode()).hexdigest()[:64]


class MockBlockchainGateway:
    """
    Drop-in replacement for BlockchainGateway that returns deterministic
    mock data. Used exclusively for local ARM development where web3
    native dependencies cannot be compiled.

    Production deployments MUST use the real BlockchainGateway.
    """

    def read_contract(self, contract_name: str, function_name: str, *args) -> Any:
        logger.info(
            f"[MOCK] read_contract {contract_name}.{function_name} args={args}"
        )
        # Return sensible defaults depending on common function patterns
        return True

    def write_contract(
        self, contract_name: str, function_name: str, *args
    ) -> TransactionReceiptResult:
        tx_hash = _mock_tx_hash()
        logger.info(
            f"[MOCK] write_contract {contract_name}.{function_name} -> {tx_hash}"
        )
        return {
            "transactionHash": tx_hash,
            "blockNumber": 99999,
            "gasUsed": 21000,
            "status": 1,
            "fromAddress": "0x0000000000000000000000000000000000000000",
            "toAddress": "0x0000000000000000000000000000000000000001",
            "logs": [],
        }

    def get_past_events(
        self, contract_name: str, event_name: str, from_block: int
    ) -> List[Dict[str, Any]]:
        logger.info(
            f"[MOCK] get_past_events {contract_name}.{event_name} from={from_block}"
        )
        return []

    def get_health_status(self) -> HealthStatus:
        return {
            "status": "healthy (mock)",
            "network": "mock",
            "chainId": 0,
            "currentBlock": 0,
            "rpcConnected": False,
            "walletAddress": "0x0000000000000000000000000000000000000000",
            "walletBalanceEth": 0.0,
        }
