import logging
from app.blockchain.client import blockchain_client
from app.blockchain.config import blockchain_settings
from app.blockchain.types import HealthStatus

logger = logging.getLogger("blockchain.monitoring.health")

class HealthMonitoringService:
    def get_health(self) -> HealthStatus:
        try:
            is_connected = blockchain_client.is_connected()
            if not is_connected:
                return self._offline_status()

            chain_id = blockchain_client.get_chain_id()
            current_block = blockchain_client.get_current_block()
            balance = blockchain_client.get_balance()

            return {
                "status": "healthy",
                "network": blockchain_settings.NETWORK_NAME,
                "chainId": chain_id,
                "currentBlock": current_block,
                "rpcConnected": True,
                "walletAddress": blockchain_client.wallet_address,
                "walletBalanceEth": balance,
                "contracts": self._check_contracts()
            }
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return self._offline_status()

    def _check_contracts(self):
        from app.blockchain.contracts.loader import contract_loader
        status = {}
        # Check all 6 deployed contracts
        all_contracts = [
            "PatientRegistry",
            "DoctorRegistry",
            "PharmacyRegistry",
            "MedicalRecordRegistry",
            "PrescriptionRegistry",
            "ConsentManagement",
        ]
        for name in all_contracts:
            try:
                contract = contract_loader.get_contract(name)
                # Try a lightweight read-only call to verify the contract is responsive
                if hasattr(contract.functions, "paused"):
                    contract.functions.paused().call()
                    status[name] = "available"
                else:
                    # Fallback: query with a known-empty hash; an expected revert still proves connectivity
                    self._probe_contract(contract, name)
                    status[name] = "available"
            except Exception as e:
                err_str = str(e)
                # Contract reverts with business logic errors still prove the contract is reachable
                if "EntityNotFound" in err_str or "execution reverted" in err_str:
                    status[name] = "available"
                elif "Address not found" in err_str or "ABI file not found" in err_str:
                    status[name] = "not_configured"
                else:
                    logger.warning(f"Contract check failed for {name}: {e}")
                    status[name] = "unavailable"
        return status

    def _probe_contract(self, contract, name: str):
        """Try a read-only call with an empty hash to verify contract is reachable."""
        empty_hash = b'\x00' * 32
        probe_methods = {
            "PharmacyRegistry": "getPharmacy",
            "PatientRegistry": "getPatient",
            "DoctorRegistry": "getDoctor",
            "MedicalRecordRegistry": "getRecord",
            "PrescriptionRegistry": "getPrescription",
        }
        method_name = probe_methods.get(name)
        if method_name and hasattr(contract.functions, method_name):
            getattr(contract.functions, method_name)(empty_hash).call()

    def _offline_status(self) -> HealthStatus:
        return {
            "status": "unhealthy",
            "network": blockchain_settings.NETWORK_NAME,
            "chainId": None,
            "currentBlock": None,
            "rpcConnected": False,
            "walletAddress": getattr(blockchain_client, "wallet_address", None),
            "walletBalanceEth": None
        }

health_service = HealthMonitoringService()

