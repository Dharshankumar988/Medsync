import os

from pydantic_settings import BaseSettings


def _clean(value: str | None) -> str:
    return value.strip() if value else ""

class BlockchainSettings(BaseSettings):
    POLYGON_RPC_URL: str = _clean(os.getenv("POLYGON_RPC_URL"))
    BACKEND_PRIVATE_KEY: str = _clean(os.getenv("BACKEND_PRIVATE_KEY"))
    
    # Contract Addresses
    DOCTOR_REGISTRY_ADDRESS: str = _clean(os.getenv("DOCTOR_REGISTRY_ADDRESS"))
    PHARMACY_REGISTRY_ADDRESS: str = _clean(os.getenv("PHARMACY_REGISTRY_ADDRESS"))
    RECORD_REGISTRY_ADDRESS: str = _clean(os.getenv("RECORD_REGISTRY_ADDRESS"))
    PRESCRIPTION_REGISTRY_ADDRESS: str = _clean(os.getenv("PRESCRIPTION_REGISTRY_ADDRESS"))
    CONSENT_MANAGER_ADDRESS: str = _clean(os.getenv("CONSENT_MANAGER_ADDRESS"))
    AUDIT_LOGGER_ADDRESS: str = _clean(os.getenv("AUDIT_LOGGER_ADDRESS"))

    def missing_required(self) -> list[str]:
        return [
            name
            for name, value in (
                ("POLYGON_RPC_URL", self.POLYGON_RPC_URL),
                ("BACKEND_PRIVATE_KEY", self.BACKEND_PRIVATE_KEY),
                ("DOCTOR_REGISTRY_ADDRESS", self.DOCTOR_REGISTRY_ADDRESS),
                ("PHARMACY_REGISTRY_ADDRESS", self.PHARMACY_REGISTRY_ADDRESS),
                ("RECORD_REGISTRY_ADDRESS", self.RECORD_REGISTRY_ADDRESS),
                ("PRESCRIPTION_REGISTRY_ADDRESS", self.PRESCRIPTION_REGISTRY_ADDRESS),
                ("CONSENT_MANAGER_ADDRESS", self.CONSENT_MANAGER_ADDRESS),
                ("AUDIT_LOGGER_ADDRESS", self.AUDIT_LOGGER_ADDRESS),
            )
            if not value
        ]

    def is_configured(self) -> bool:
        return not self.missing_required()

blockchain_settings = BlockchainSettings()
