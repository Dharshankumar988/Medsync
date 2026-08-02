class BlockchainError(Exception):
    """Base exception for all blockchain-related errors."""
    pass

class RPCConnectionError(BlockchainError):
    """Raised when the connection to the RPC node fails."""
    pass

class ContractNotFound(BlockchainError):
    """Raised when a contract cannot be found in the deployment metadata."""
    pass

class GasEstimationError(BlockchainError):
    """Raised when gas estimation fails."""
    pass

class TransactionReverted(BlockchainError):
    """Raised when a transaction is reverted by the EVM."""
    pass

class InvalidNetwork(BlockchainError):
    """Raised when the configured network is invalid or unsupported."""
    pass

class InvalidNonce(BlockchainError):
    """Raised when there is a nonce synchronization issue."""
    pass

class ContractExecutionError(BlockchainError):
    """Raised when a contract call fails."""
    pass

class WalletConfigurationError(BlockchainError):
    """Raised when the wallet is improperly configured or missing."""
    pass
