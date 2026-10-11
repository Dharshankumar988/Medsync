import json
import pytest
from app.models.hospital import Hospital
from app.models.doctor import Doctor
from app.models.pharmacy import Pharmacy
from app.models.patient import Patient
from app.models.user import UserRole, UserStatus
from app.models.verification import RoleType, VerificationStatus
from app.models.blockchain import SyncEntityType, SyncActionType, SyncStatus
from app.schemas.admin import (
    RelationshipGraphResponse,
    GraphNode,
    GraphEdge,
    GraphNodeEntityData
)
from app.schemas.response import APIResponse


def test_hospital_model_attributes_and_aliases():
    """Verify Hospital supports phone_number, contact_number, type, and hospital_type."""
    h = Hospital(
        name="Metro Hospital",
        address="123 Health Ave",
        phone_number="123-456-7890",
        type="specialty"
    )
    # Direct access
    assert h.phone_number == "123-456-7890"
    assert h.type == "specialty"

    # Alias access
    assert h.contact_number == "123-456-7890"
    assert h.hospital_type == "specialty"

    # Mutability via alias
    h.contact_number = "987-654-3210"
    assert h.phone_number == "987-654-3210"

    h.hospital_type = "general"
    assert h.type == "general"


def test_doctor_model_attributes_and_aliases():
    """Verify Doctor supports clinic_phone, phone_number, and contact_number."""
    d = Doctor(
        full_name="Dr. Smith",
        clinic_phone="555-0100"
    )
    assert d.clinic_phone == "555-0100"
    assert d.phone_number == "555-0100"
    assert d.contact_number == "555-0100"

    d.phone_number = "555-0200"
    assert d.clinic_phone == "555-0200"


def test_pharmacy_model_attributes_and_aliases():
    """Verify Pharmacy supports contact_number and phone_number."""
    p = Pharmacy(
        business_name="City Pharmacy",
        contact_number="555-0300"
    )
    assert p.contact_number == "555-0300"
    assert p.phone_number == "555-0300"

    p.phone_number = "555-0400"
    assert p.contact_number == "555-0400"


def test_patient_model_attributes_and_aliases():
    """Verify Patient supports phone_number and contact_number."""
    pat = Patient(
        full_name="John Doe",
        phone_number="555-0500"
    )
    assert pat.phone_number == "555-0500"
    assert pat.contact_number == "555-0500"

    pat.contact_number = "555-0600"
    assert pat.phone_number == "555-0600"


def test_enums_string_compatibility_and_json_serialization():
    """Verify all critical Enums inherit from str and serialize cleanly to JSON."""
    enums_to_check = [
        UserRole.ADMIN,
        UserRole.DOCTOR,
        UserRole.PATIENT,
        UserRole.PHARMACY,
        UserRole.HOSPITAL,
        UserStatus.ACTIVE,
        UserStatus.PENDING,
        RoleType.DOCTOR,
        VerificationStatus.APPROVED,
        VerificationStatus.PENDING,
        SyncEntityType.PRESCRIPTION,
        SyncActionType.CREATE,
        SyncStatus.CONFIRMED,
    ]

    for enum_val in enums_to_check:
        # Must compare equal to its string equivalent
        assert enum_val == enum_val.value
        assert isinstance(enum_val, str)

        # Must serialize cleanly in standard json.dumps
        serialized = json.dumps({"key": enum_val})
        assert f'"{enum_val.value}"' in serialized


def test_graph_schema_validation_and_serialization():
    """Verify RelationshipGraphResponse can validate and serialize nodes with mixed entity data."""
    nodes = [
        GraphNode(
            id="MEDICINE",
            label="Medicine",
            type="Medicine",
            isCentral=True,
            details="Central hub"
        ),
        GraphNode(
            id="HOSPITAL_1",
            label="General Hospital",
            type="Hospital",
            entityData=GraphNodeEntityData(
                name="General Hospital",
                phone="123-456",
                type="hospital",
                city="Metropolis"
            )
        ),
        GraphNode(
            id="ADMIN_1",
            label="admin",
            type="Admin",
            entityData=GraphNodeEntityData(
                email="admin@medsync.io",
                role=UserRole.ADMIN.value,
                status=UserStatus.ACTIVE.value,
                isVerified=True
            )
        )
    ]

    edges = [
        GraphEdge(source="MEDICINE", target="HOSPITAL_1", type="hosts"),
        GraphEdge(source="MEDICINE", target="ADMIN_1", type="manages")
    ]

    graph = RelationshipGraphResponse(nodes=nodes, links=edges)
    assert len(graph.nodes) == 3
    assert len(graph.links) == 2

    # Verify APIResponse wrapper serialization
    api_response = APIResponse(message="Graph retrieved", data=graph)
    dumped = api_response.model_dump(mode="json")

    assert dumped["status"] == "success"
    assert len(dumped["data"]["nodes"]) == 3
    assert dumped["data"]["nodes"][2]["entityData"]["role"] == "ADMIN"


def test_blockchain_analytics_schema_and_serialization():
    """Verify BlockchainAnalyticsData schema correctly serializes and preserves authentic metric contracts."""
    from app.schemas.blockchain import (
        BlockchainAnalyticsData, BlockchainNetworkStats, BlockchainGasStats,
        BlockchainContractMetric, BlockchainDailyMetric, BlockchainWalletMetric,
        BlockchainRecentTx, BlockchainSyncTaskStats, BlockchainSmartContractInfo
    )

    data = BlockchainAnalyticsData(
        transactions={"CONFIRMED": 57},
        events={"ConsentRevoked": 0},
        total_transactions=57,
        total_events=0,
        network=BlockchainNetworkStats(
            name="Polygon Amoy Testnet",
            chain_id=80002,
            connected=True,
            latest_block=49873182,
            gas_price_gwei=449.28,
            wallet_balance_pol=0.4994
        ),
        gas=BlockchainGasStats(
            total_gas_used=13601910,
            avg_gas_per_tx=238630.0,
            min_gas_used=21000,
            max_gas_used=1093398,
            current_gas_price_gwei=449.28
        ),
        contracts=[
            BlockchainContractMetric(
                contract_name="DoctorRegistry",
                tx_count=1,
                percentage=1.75,
                total_gas_used=1088016,
                avg_gas_used=1088016.0,
                min_gas=1088016,
                max_gas=1088016
            )
        ],
        daily_timeline=[
            BlockchainDailyMetric(date="2026-10-11", tx_count=56, gas_used=13580910)
        ],
        top_wallets=[
            BlockchainWalletMetric(address="0x6ec559064e5bfae4a98d1879c717139acee49822", tx_count=39, gas_used=13223910)
        ],
        sync_tasks=BlockchainSyncTaskStats(
            total_tasks=1,
            by_status={"CONFIRMED": 1},
            by_entity_type={"MEDICAL_RECORD": 1}
        ),
        smart_contracts=[
            BlockchainSmartContractInfo(
                name="DoctorRegistry",
                address="0x260d8C75009B62009aA2762c1d76d8daAeA1A7A9",
                status="DEPLOYED",
                tx_count=1,
                total_gas=1088016,
                explorer_url="https://amoy.polygonscan.com/address/0x260d8C75009B62009aA2762c1d76d8daAeA1A7A9"
            )
        ],
        recent_transactions=[
            BlockchainRecentTx(
                hash="0x65dad0a55fd5f1",
                short_hash="0x65da...5fd5f1",
                contract_name="Polygon Transfer / Call",
                gas_used=21000,
                status="CONFIRMED",
                explorer_url="https://amoy.polygonscan.com/tx/0x65dad0a55fd5f1"
            )
        ]
    )

    api_resp = APIResponse(message="Analytics retrieved", data=data)
    dumped = api_resp.model_dump(mode="json")

    assert dumped["status"] == "success"
    assert dumped["data"]["total_transactions"] == 57
    assert dumped["data"]["gas"]["total_gas_used"] == 13601910
    assert dumped["data"]["contracts"][0]["contract_name"] == "DoctorRegistry"
    assert dumped["data"]["network"]["chain_id"] == 80002
    assert dumped["data"]["sync_tasks"]["by_status"]["CONFIRMED"] == 1

