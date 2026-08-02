import os
import json
import logging
from typing import Dict, Any
from web3.contract import Contract
from app.blockchain.client import blockchain_client
from app.blockchain.config import blockchain_settings
from app.blockchain.exceptions import ContractNotFound

logger = logging.getLogger("blockchain.contracts")

class ContractLoader:
    """
    Dynamically loads smart contracts from deployment artifacts.
    """
    def __init__(self):
        self.contracts: Dict[str, Contract] = {}
        # Path relative to the backend app running location or using absolute resolving
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        workspace_dir = os.path.dirname(os.path.dirname(backend_dir)) # Up from backend/app/blockchain
        
        # Paths point to the apps/blockchain project
        self.deployments_dir = os.path.join(workspace_dir, "blockchain", "deployments", blockchain_settings.NETWORK_NAME)
        self.abis_dir = os.path.join(workspace_dir, "blockchain", "abis")
        
        self.addresses: Dict[str, str] = {}
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
            return json.load(f)

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
