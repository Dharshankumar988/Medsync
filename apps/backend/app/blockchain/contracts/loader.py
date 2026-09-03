import os
import json
import logging
from typing import Dict, Any
from web3.contract import Contract
from app.blockchain.client import blockchain_client
from app.blockchain.config import blockchain_settings
from app.blockchain.exceptions import ContractNotFound

logger = logging.getLogger("blockchain.contracts")

def _resolve_paths() -> tuple[str, str]:
    """
    Resolve deployment and ABI directories.
    Priority: CONTRACT_ADDRESSES_DIR env var > relative path from source tree.
    """
    env_dir = os.getenv("CONTRACT_ADDRESSES_DIR")
    if env_dir and os.path.isdir(env_dir):
        deployments_dir = os.path.join(env_dir, blockchain_settings.NETWORK_NAME)
        # ABIs: check sibling 'abis' dir or /blockchain/abis (Docker mount)
        abis_dir = os.getenv("CONTRACT_ABIS_DIR", os.path.join(os.path.dirname(env_dir), "abis"))
        if not os.path.isdir(abis_dir):
            abis_dir = "/blockchain/abis"
        return deployments_dir, abis_dir

    # Fallback: resolve relative to source tree (local dev without Docker)
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # Check if artifacts are bundled inside the app (Docker approach)
    bundled_deployments = os.path.join(backend_dir, "blockchain", "artifacts", "deployments", blockchain_settings.NETWORK_NAME)
    bundled_abis = os.path.join(backend_dir, "blockchain", "artifacts", "abis")
    
    if os.path.isdir(bundled_deployments):
        return bundled_deployments, bundled_abis
        
    workspace_dir = os.path.dirname(os.path.dirname(backend_dir))
    deployments_dir = os.path.join(workspace_dir, "blockchain", "deployments", blockchain_settings.NETWORK_NAME)
    abis_dir = os.path.join(workspace_dir, "blockchain", "abis")
    return deployments_dir, abis_dir

class ContractLoader:
    """
    Dynamically loads smart contracts from deployment artifacts.
    """
    def __init__(self):
        self.contracts: Dict[str, Contract] = {}
        self.addresses: Dict[str, str] = {}

        # In mock mode, skip all filesystem/RPC work — there are no contracts.
        from app.blockchain.provider import RESOLVED_BLOCKCHAIN_MODE
        if RESOLVED_BLOCKCHAIN_MODE == "mock":
            logger.info("Contract loader: mock mode — skipping contract address loading.")
            self.deployments_dir = ""
            self.abis_dir = ""
            return

        self.deployments_dir, self.abis_dir = _resolve_paths()
        self._load_addresses()

    def _load_addresses(self):
        address_file = os.path.join(self.deployments_dir, "contract-addresses.json")
        try:
            if os.path.exists(address_file):
                with open(address_file, "r") as f:
                    self.addresses = json.load(f)
                logger.info(f"Loaded {len(self.addresses)} contract addresses from {blockchain_settings.NETWORK_NAME}")
            else:
                logger.warning(f"Address file not found at {address_file}. Contracts will not be preloaded.")
        except Exception as e:
            logger.error(f"Error loading contract addresses: {e}")

    def get_abi(self, contract_name: str) -> list:
        abi_file = os.path.join(self.abis_dir, f"{contract_name}.json")
        if not os.path.exists(abi_file):
            raise ContractNotFound(f"ABI file not found for {contract_name}")
        with open(abi_file, "r") as f:
            data = json.load(f)
            return data.get("abi", data) if isinstance(data, dict) else data

    def get_contract(self, contract_name: str) -> Contract:
        if contract_name in self.contracts:
            return self.contracts[contract_name]

        if contract_name not in self.addresses:
            raise ContractNotFound(f"Address not found for {contract_name} in network {blockchain_settings.NETWORK_NAME}")

        address = self.addresses[contract_name]
        checksum_address = blockchain_client.w3.to_checksum_address(address)
        abi = self.get_abi(contract_name)

        contract = blockchain_client.w3.eth.contract(address=checksum_address, abi=abi)
        self.contracts[contract_name] = contract
        logger.info(f"Loaded contract {contract_name} at {checksum_address}")
        
        return contract

contract_loader = ContractLoader()


