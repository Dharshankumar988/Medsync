import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.blockchain import BlockchainSyncTask, SyncEntityType, SyncActionType, SyncStatus

class BlockchainSyncService:
    @staticmethod
    async def enqueue_sync_task(
        db: AsyncSession,
        entity_type: SyncEntityType,
        entity_id: uuid.UUID,
        action_type: SyncActionType,
        payload: Optional[dict] = None
    ) -> BlockchainSyncTask:
        """
        Enqueues a task for the background worker to sync this entity to the blockchain.
        """
        task = BlockchainSyncTask(
            id=uuid.uuid4(),
            entity_type=entity_type,
            entity_id=entity_id,
            action_type=action_type,
            status=SyncStatus.PENDING,
            payload=payload or {}
        )
        db.add(task)
        await db.flush()  # So it gets an ID but doesn't commit yet (let caller commit)
        return task

    @staticmethod
    async def get_task_by_entity(db: AsyncSession, entity_type: SyncEntityType, entity_id: uuid.UUID) -> Optional[BlockchainSyncTask]:
        stmt = select(BlockchainSyncTask).where(
            BlockchainSyncTask.entity_type == entity_type,
            BlockchainSyncTask.entity_id == entity_id
        ).order_by(BlockchainSyncTask.created_at.desc())
        
        result = await db.execute(stmt)
        return result.scalars().first()
