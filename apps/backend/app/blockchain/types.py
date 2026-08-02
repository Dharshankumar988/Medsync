from enum import Enum
from typing import Any, Dict, List, Optional, TypedDict

class TransactionStatus(str, Enum):
    CREATED = "CREATED"
    SIGNED = "SIGNED"
    BROADCASTED = "BROADCASTED"
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    FAILED = "FAILED"
    REPLACED = "REPLACED"
    REVERTED = "REVERTED"

class ContractMetadata(TypedDict):
    contractName: str
    address: str
    version: int
    timestamp: str
    transactionHash: str
    blockNumber: int
    deployer: str
    network: str
    chainId: int

class TransactionReceiptResult(TypedDict):
    transactionHash: str
    blockNumber: int
    gasUsed: int
    status: int
    fromAddress: str
    toAddress: Optional[str]
    logs: List[Dict[str, Any]]

class HealthStatus(TypedDict):
    status: str
    network: str
    chainId: Optional[int]
    currentBlock: Optional[int]
    rpcConnected: bool
    walletAddress: Optional[str]
    walletBalanceEth: Optional[float]
