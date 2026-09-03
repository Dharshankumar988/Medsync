"""
Provider factory for the Blockchain Gateway.

Resolution order:
1. BLOCKCHAIN_MODE env var  ("production" | "mock")
2. Auto-detect: try importing web3; if it fails, fall back to mock.

This module is the ONLY place where the decision is made.
Every other module imports `blockchain_gateway` from here.
"""
import os
import logging

logger = logging.getLogger("blockchain.provider")

_BLOCKCHAIN_MODE = os.getenv("BLOCKCHAIN_MODE", "auto").strip().lower()


def _can_import_web3() -> bool:
    """Check whether the native web3 stack is available."""
    try:
        import web3  # noqa: F401
        import eth_account  # noqa: F401
        return True
    except ImportError:
        return False


def _resolve_mode() -> str:
    """Return 'production' or 'mock'."""
    mode = _BLOCKCHAIN_MODE
    if mode == "production" or mode == "real":
        if not _can_import_web3():
            raise ImportError(
                "BLOCKCHAIN_MODE is set to 'production'/'real', but web3 is not installed. "
                "Failing startup instead of silently falling back to mock mode."
            )
        return "production"
    elif mode == "mock":
        return "mock"
    elif mode == "auto":
        # auto — probe for web3
        if _can_import_web3():
            return "production"
        return "mock"
    else:
        raise ValueError(f"Invalid BLOCKCHAIN_MODE: {mode}. Must be 'production', 'real', 'mock', or 'auto'.")


def get_gateway():
    """Instantiate and return the correct gateway implementation."""
    mode = _resolve_mode()
    if mode == "production":
        logger.info("Blockchain mode: PRODUCTION (real web3)")
        from app.blockchain.gateway import BlockchainGateway
        return BlockchainGateway()
    else:
        logger.warning(
            "Blockchain mode: MOCK — blockchain writes are simulated. "
            "Set BLOCKCHAIN_MODE=production for real transactions."
        )
        from app.blockchain.mock_gateway import MockBlockchainGateway
        return MockBlockchainGateway()


# Singleton used across the application
blockchain_gateway = get_gateway()
