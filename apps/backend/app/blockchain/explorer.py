"""
Centralized explorer URL generation for Polygon Amoy testnet.
All blockchain explorer links should use these functions to ensure consistency.
"""

EXPLORER_BASE = "https://amoy.polygonscan.com"


def tx_url(tx_hash: str) -> str:
    """Generate a transaction explorer URL."""
    return f"{EXPLORER_BASE}/tx/{tx_hash}"


def address_url(address: str) -> str:
    """Generate an address explorer URL."""
    return f"{EXPLORER_BASE}/address/{address}"


def block_url(block_number: int) -> str:
    """Generate a block explorer URL."""
    return f"{EXPLORER_BASE}/block/{block_number}"
