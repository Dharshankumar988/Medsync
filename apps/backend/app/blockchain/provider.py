"""
Provider factory for the Blockchain Gateway.

Resolution:
  "production" or "real"  → real Web3 provider (fails loudly if web3 missing or RPC unreachable)
  "mock" or empty/missing → mock provider (no RPC, no contracts)

This module is the ONLY place where the decision is made.
Every other module imports `blockchain_gateway` from here.
"""
import os
import logging

logger = logging.getLogger("blockchain.provider")

_raw = os.getenv("BLOCKCHAIN_MODE", "").strip().lower()
# Empty / missing / unrecognised → mock.  Only explicit "production"/"real" activates web3.
RESOLVED_BLOCKCHAIN_MODE = _raw if _raw in ("production", "real", "mock") else "mock"


def _can_import_web3() -> bool:
    """Check whether the native web3 stack is available."""
    try:
        import web3  # noqa: F401
        import eth_account  # noqa: F401
        return True
    except ImportError:
        return False


def _resolve_mode() -> str:
    """Return 'production' or 'mock'.  Never silently falls back."""
    mode = RESOLVED_BLOCKCHAIN_MODE
    if mode in ("production", "real"):
        if not _can_import_web3():
            raise ImportError(
                "BLOCKCHAIN_MODE is set to 'production'/'real', but web3 is not installed. "
                "Failing startup instead of silently falling back to mock mode."
            )
        return "production"
    # anything else (including empty) → mock
    return "mock"


def get_gateway():
    """Instantiate and return the correct gateway implementation."""
    mode = _resolve_mode()
    if mode == "production":
        logger.info("Blockchain mode: PRODUCTION (real web3)")
        from app.blockchain.gateway import BlockchainGateway
        return BlockchainGateway()
    else:
        logger.info(
            "Blockchain mode: MOCK — blockchain writes are simulated. "
            "Set BLOCKCHAIN_MODE=production for real transactions."
        )
        from app.blockchain.mock_gateway import MockBlockchainGateway
        return MockBlockchainGateway()


# Singleton used across the application
blockchain_gateway = get_gateway()
