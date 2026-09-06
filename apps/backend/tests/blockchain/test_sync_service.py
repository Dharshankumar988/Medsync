import pytest
import uuid
import asyncio
from unittest.mock import MagicMock, patch
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select
from app.database.base_class import Base
from app.models.blockchain import (
    BlockchainSyncTask, SyncEntityType, SyncActionType, SyncStatus,
    BlockchainTransaction
)
from app.blockchain.services.sync_service import BlockchainSyncService

# Setup in-memory sqlite for tests using async driver
engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
AsyncSessionTesting = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

@pytest.fixture(scope="function", autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture(scope="function")
async def db_session():
    async with AsyncSessionTesting() as session:
        yield session

@pytest.fixture
def sync_service(db_session):
    return BlockchainSyncService(db_session)

@pytest.mark.asyncio
@patch("app.blockchain.services.sync_service.blockchain_gateway")
async def test_create_and_execute_prescription_sync(mock_gateway, sync_service, db_session):
    # Mock gateway response
    mock_receipt = {
        "transactionHash": "0x123abc",
        "blockNumber": 42,
        "gasUsed": 21000,
        "status": 1,
        "fromAddress": "0xBackendWallet"
    }
    mock_gateway.write_contract.return_value = mock_receipt
    
    # 1. Create Sync Task
    patient_id = uuid.uuid4()
    doctor_id = uuid.uuid4()
    prescription_id = uuid.uuid4()
    
    task = await sync_service.create_sync_task(
        entity_type=SyncEntityType.PRESCRIPTION,
        entity_id=prescription_id,
        action_type=SyncActionType.CREATE,
        payload={"patient_id": str(patient_id), "doctor_id": str(doctor_id)}
    )
    
    assert task.status == SyncStatus.PENDING
    assert task.entity_id == prescription_id
    
    # 2. Execute Sync Task
    await sync_service.execute_sync_task(task.id)
    
    # 3. Verify Database Updates
    await db_session.refresh(task)
    assert task.status == SyncStatus.CONFIRMED
    assert task.transaction_hash == "0x123abc"
    
    # Verify Transaction was saved
    result = await db_session.execute(select(BlockchainTransaction).filter_by(transaction_hash="0x123abc"))
    tx = result.scalar_one_or_none()
    assert tx is not None
    assert tx.block_number == 42
    assert tx.status == "CONFIRMED"

@pytest.mark.asyncio
@patch("app.blockchain.services.sync_service.blockchain_gateway")
async def test_sync_task_retry_logic(mock_gateway, sync_service, db_session):
    # Simulate a network failure
    mock_gateway.write_contract.side_effect = Exception("RPC Timeout")
    
    task = await sync_service.create_sync_task(
        entity_type=SyncEntityType.PATIENT,
        entity_id=uuid.uuid4(),
        action_type=SyncActionType.CREATE,
        payload={"data": "test"}
    )
    
    await sync_service.execute_sync_task(task.id)
    
    await db_session.refresh(task)
    # Should be set to RETRYING and retry_count incremented
    assert task.status == SyncStatus.RETRYING
    assert task.retry_count == 1
    assert "RPC Timeout" in task.error_message
