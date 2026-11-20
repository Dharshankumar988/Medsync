import json
import uuid
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text

from app.database.base_class import Base
from app.models.user import User, UserRole, UserStatus
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.prescription import Prescription
from app.models.appointment import Appointment, AppointmentStatus
from app.models.hospital import Hospital
from app.models.pharmacy import Pharmacy
from app.models.pharmacy_system import Medicine, MedicineOrder, OrderStatus
from app.models.blockchain import BlockchainTransaction
from app.models.audit_log import AdminAIAuditLog
from app.schemas.ai import ChatRequest
from app.ai.tools.admin_tools import AdminAITools
from app.services.admin_ai import AdminAIService
from app.ai.prompts.templates import ADMIN_SYSTEM_PROMPT


@pytest.fixture
async def real_db():
    """Provides a real in-memory SQLite async database with all tables created."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_tool_definitions():
    """Verify tool definitions are properly exposed for Admin AI."""
    defs = AdminAITools.get_tool_definitions()
    names = [t["function"]["name"] for t in defs]
    assert "query_database_analytics" in names
    assert "list_users" in names
    assert "delete_user" in names


@pytest.mark.asyncio
async def test_query_database_analytics_prescriptions_allowed(real_db: AsyncSession):
    """Verify prescription volume queries are allowed (fixes previous restriction bug)."""
    admin_id = uuid.uuid4()
    session_id = uuid.uuid4()

    # Seed a prescription
    patient_user = User(id=uuid.uuid4(), email="p1@test.com", role=UserRole.PATIENT, status=UserStatus.ACTIVE)
    real_db.add(patient_user)
    await real_db.commit()

    rx = Prescription(id=uuid.uuid4(), patient_id=patient_user.id, is_finalized=True)
    real_db.add(rx)
    await real_db.commit()
    
    # Query counting prescriptions
    result = await AdminAITools.execute_tool(
        real_db, admin_id, session_id,
        "query_database_analytics",
        {"query": "SELECT COUNT(*) as total_rx FROM prescriptions;"}
    )
    data = json.loads(result)
    assert "error" not in data
    assert "results" in data
    assert int(data["results"][0]["total_rx"]) >= 1


@pytest.mark.asyncio
async def test_query_database_analytics_blocks_mutations(real_db: AsyncSession):
    """Verify non-SELECT mutation queries are blocked by security policy."""
    admin_id = uuid.uuid4()
    session_id = uuid.uuid4()
    
    mutations = [
        "DROP TABLE users;",
        "DELETE FROM users WHERE id = '123';",
        "UPDATE users SET role = 'ADMIN';",
        "INSERT INTO users (email) VALUES ('hacked@test.com');",
        "ALTER TABLE users ADD COLUMN hacked text;"
    ]
    for q in mutations:
        result = await AdminAITools.execute_tool(
            real_db, admin_id, session_id,
            "query_database_analytics",
            {"query": q}
        )
        data = json.loads(result)
        assert "error" in data
        assert "Security Policy Violation" in data["error"]


@pytest.mark.asyncio
async def test_query_database_analytics_blocks_credential_hashes(real_db: AsyncSession):
    """Verify password_hash and pin_hash are blocked."""
    admin_id = uuid.uuid4()
    session_id = uuid.uuid4()
    
    result = await AdminAITools.execute_tool(
        real_db, admin_id, session_id,
        "query_database_analytics",
        {"query": "SELECT email, password_hash FROM users;"}
    )
    data = json.loads(result)
    assert "error" in data
    assert "Security Policy Violation" in data["error"]


@pytest.mark.asyncio
async def test_query_database_analytics_normalizes_mysql_syntax(real_db: AsyncSession):
    """Verify common MySQL date idioms (CURDATE, DATE_SUB) are normalized."""
    admin_id = uuid.uuid4()
    session_id = uuid.uuid4()
    
    # Query with CURDATE()
    result = await AdminAITools.execute_tool(
        real_db, admin_id, session_id,
        "query_database_analytics",
        {"query": "SELECT COUNT(*) as cnt FROM appointments WHERE appointment_date >= CURDATE();"}
    )
    data = json.loads(result)
    assert "error" not in data
    assert "results" in data


@pytest.mark.asyncio
async def test_list_users_with_search(real_db: AsyncSession):
    """Verify list_users supports filtering by role and search query."""
    admin_id = uuid.uuid4()
    session_id = uuid.uuid4()
    
    # Create test user
    uid = uuid.uuid4()
    test_user = User(
        id=uid,
        email="amit.kumar.test@medsync.health",
        role=UserRole.PATIENT,
        status=UserStatus.ACTIVE
    )
    test_patient = Patient(
        id=uuid.uuid4(),
        user_id=uid,
        full_name="Amit Kumar",
        phone_number="9876543210"
    )
    real_db.add(test_user)
    real_db.add(test_patient)
    await real_db.commit()
    
    # Search for Amit
    result = await AdminAITools.execute_tool(
        real_db, admin_id, session_id,
        "list_users",
        {"search": "Amit Kumar"}
    )
    data = json.loads(result)
    assert "error" not in data
    assert data["count"] >= 1
    found_emails = [u["email"] for u in data["users"]]
    assert "amit.kumar.test@medsync.health" in found_emails


@pytest.mark.asyncio
async def test_delete_user_protects_admin(real_db: AsyncSession):
    """Verify cannot delete admin users."""
    admin_id = uuid.uuid4()
    session_id = uuid.uuid4()
    
    admin_user = User(
        id=uuid.uuid4(),
        email="superadmin@medsync.health",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE
    )
    real_db.add(admin_user)
    await real_db.commit()
    
    result = await AdminAITools.execute_tool(
        real_db, admin_id, session_id,
        "delete_user",
        {"user_id": str(admin_user.id), "reason": "test"}
    )
    data = json.loads(result)
    assert "error" in data
    assert "Cannot delete admin users" in data["error"]


@pytest.mark.asyncio
async def test_admin_system_prompt_contracts():
    """Verify ADMIN_SYSTEM_PROMPT includes all 5 core domains and schema contracts."""
    assert "Platform Analytics" in ADMIN_SYSTEM_PROMPT
    assert "Operational Health Reports" in ADMIN_SYSTEM_PROMPT
    assert "Fraud & Anomaly Detection" in ADMIN_SYSTEM_PROMPT
    assert "Technical Oversight" in ADMIN_SYSTEM_PROMPT
    assert "Data Retrieval" in ADMIN_SYSTEM_PROMPT
    assert "query_database_analytics" in ADMIN_SYSTEM_PROMPT
    assert "users does NOT have first_name or last_name" in ADMIN_SYSTEM_PROMPT


@pytest.mark.asyncio
async def test_handle_chat_multiturn_tool_execution(real_db: AsyncSession):
    """Verify AdminAIService handles tool calls in a loop without 'tool_choice=none'."""
    admin = User(
        id=uuid.uuid4(),
        email="admin_tester@medsync.health",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE
    )
    real_db.add(admin)
    await real_db.commit()

    # Create mock tool call
    mock_tool_call = MagicMock()
    mock_tool_call.id = "call_abc999"
    mock_tool_call.function.name = "query_database_analytics"
    mock_tool_call.function.arguments = json.dumps({"query": "SELECT COUNT(*) as cnt FROM users;"})

    # Response 1 has a tool call
    mock_response_1 = MagicMock()
    mock_response_1.tool_calls = [mock_tool_call]
    mock_response_1.content = None

    # Response 2 has the final executive markdown summary
    mock_response_2 = MagicMock()
    mock_response_2.tool_calls = None
    mock_response_2.content = "### 📊 Platform Analytics Dashboard\n\nTotal Users: 1\n- System operating normally."

    with patch("app.ai.core.service_manager.ai_service_manager.get_llm_client") as mock_get_client:
        mock_client = MagicMock()
        mock_client.chat_completion = AsyncMock(side_effect=[mock_response_1, mock_response_2])
        mock_get_client.return_value = mock_client

        req = ChatRequest(message="Give me an overview of total users")
        result = await AdminAIService.handle_chat(real_db, admin.id, req)

        assert "session_id" in result
        assert "Platform Analytics Dashboard" in result["reply"]

        # Crucial check: verify tool_choice="none" was NEVER sent
        for call_args in mock_client.chat_completion.call_args_list:
            kwargs = call_args.kwargs
            assert kwargs.get("tool_choice") != "none", "tool_choice='none' must NEVER be sent to Groq!"


@pytest.mark.asyncio
async def test_handle_chat_graceful_tool_fallback(real_db: AsyncSession):
    """Verify that if Groq fails on tool calling, it falls back to clean completion without 400 error."""
    admin = User(
        id=uuid.uuid4(),
        email="admin_fallback@medsync.health",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE
    )
    real_db.add(admin)
    await real_db.commit()

    with patch("app.ai.core.service_manager.ai_service_manager.get_llm_client") as mock_get_client:
        mock_client = MagicMock()
        # First call fails, fallback call succeeds
        mock_client.chat_completion = AsyncMock(side_effect=[
            Exception("Groq tool parsing failure"),
            "Fallback plain text summary of platform status."
        ])
        mock_get_client.return_value = mock_client

        req = ChatRequest(message="Analyze system health")
        result = await AdminAIService.handle_chat(real_db, admin.id, req)

        assert "session_id" in result
        assert "Fallback plain text summary" in result["reply"]
