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
    curr = os.path.abspath(__file__)
    for _ in range(7):
        curr = os.path.dirname(curr)
        candidate_deployments = os.path.join(curr, "apps", "blockchain", "deployments", blockchain_settings.NETWORK_NAME)
        candidate_abis = os.path.join(curr, "apps", "blockchain", "abis")
        if os.path.isdir(candidate_deployments) or os.path.isdir(candidate_abis):
            return candidate_deployments, candidate_abis

    # Check if artifacts are bundled inside the app (Docker approach)
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    bundled_deployments = os.path.join(backend_dir, "blockchain", "artifacts", "deployments", blockchain_settings.NETWORK_NAME)
    bundled_abis = os.path.join(backend_dir, "blockchain", "artifacts", "abis")
    
    if os.path.isdir(bundled_deployments):
        return bundled_deployments, bundled_abis
        
    return "", ""

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
        address_file = os.path.join(self.deployments_dir, "contract-addresses.json") if self.deployments_dir else ""
        try:
            if address_file and os.path.exists(address_file):
                with open(address_file, "r") as f:
                    self.addresses = json.load(f)
                logger.info(f"Loaded {len(self.addresses)} contract addresses from {blockchain_settings.NETWORK_NAME}")
            else:
                logger.warning(f"Address file not found at {address_file}. Using env/fallback addresses.")
        except Exception as e:
            logger.error(f"Error loading contract addresses: {e}")

        # Fallback to env vars and known Polygon Amoy deployed contracts
        default_amoy_contracts = {
            "ConsentManagement": "0x755F2DBB9Caaa78Eac77fF3115F92984BAc37e52",
            "PatientRegistry": "0x9Dcd620f006555ffFA072d2280ef47506C5Da2A3",
            "DoctorRegistry": "0x260d8C75009B62009aA2762c1d76d8daAeA1A7A9",
            "PharmacyRegistry": "0x50dc448bf7260f736A0A3a10151Ccb1a495d3BE9",
            "MedicalRecordRegistry": "0xfC15AA7EF7759dAEF6C9d3dfB6EEc30DC4783104",
            "PrescriptionRegistry": "0x94013b71F9A3eEbCdbcD11fE460E8E9253916A6D"
        }

        env_map = {
            "PatientRegistry": ["PATIENT_REGISTRY_ADDRESS", "PATIENTREGISTRY_ADDRESS"],
            "DoctorRegistry": ["DOCTOR_REGISTRY_ADDRESS", "DOCTORREGISTRY_ADDRESS"],
            "PharmacyRegistry": ["PHARMACY_REGISTRY_ADDRESS", "PHARMACYREGISTRY_ADDRESS"],
            "MedicalRecordRegistry": ["RECORD_REGISTRY_ADDRESS", "MEDICALRECORDREGISTRY_ADDRESS"],
            "PrescriptionRegistry": ["PRESCRIPTION_REGISTRY_ADDRESS", "PRESCRIPTIONREGISTRY_ADDRESS"],
            "ConsentManagement": ["CONSENT_MANAGER_ADDRESS", "CONSENTMANAGEMENT_ADDRESS"]
        }
        for name, keys in env_map.items():
            if name not in self.addresses:
                for k in keys:
                    v = os.getenv(k)
                    if v and v != "0x..." and v != "0x0000000000000000000000000000000000000000":
                        self.addresses[name] = v
                        break

        # Fallback to defaults if still missing
        for name, def_addr in default_amoy_contracts.items():
            if name not in self.addresses or not self.addresses[name]:
                self.addresses[name] = def_addr

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


