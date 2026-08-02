"""
Blockchain package entry-point.

Imports the gateway from the provider factory, which transparently
returns either the real Web3-backed gateway or the mock depending
on BLOCKCHAIN_MODE / dependency availability.
"""
from app.blockchain.provider import blockchain_gateway
from app.blockchain.exceptions import *

__all__ = ["blockchain_gateway"]
