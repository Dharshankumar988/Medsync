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
