import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, or_, and_
from app.database.session import AsyncSessionLocal
from app.models.blockchain import BlockchainSyncTask, SyncStatus, BlockchainEventQueue, BlockchainQueueStatus
# Note: If BlockchainSyncService is sync, it needs to run in a thread or be refactored.
# For this phase, we ensure the queue state machine is robust.
from app.blockchain.services.sync_service import BlockchainSyncService

logger = logging.getLogger("blockchain.workers.retry")

async def process_retry_queue():
    """
    Polls the database for failed tasks (both outbound Sync Tasks and inbound Event Queue Tasks)
    and schedules them for retry using exponential backoff.
    """
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        
        # 1. Process Outbound Sync Tasks (Database -> Blockchain)
        try:
            result = await db.execute(
                select(BlockchainSyncTask).where(
                    or_(
                        BlockchainSyncTask.status == SyncStatus.PENDING,
                        and_(
                            BlockchainSyncTask.status == SyncStatus.RETRYING,
                            BlockchainSyncTask.next_retry_time <= now
                        )
                    )
                ).limit(10)
            )
            sync_tasks = result.scalars().all()
            
            if sync_tasks:
                logger.info(f"Found {len(sync_tasks)} outbound sync tasks to process.")
                # We instantiate sync_service with the async session (if supported) or handle it
                # For compatibility, assuming sync_service can handle the session
                sync_service = BlockchainSyncService(db)
                for task in sync_tasks:
                    try:
                        # Assuming execute_sync_task is refactored to be async, or run it appropriately.
                        # If it's still sync, in a real env we'd use run_in_executor.
                        await sync_service.execute_sync_task(task.id) 
                    except Exception as e:
                        logger.error(f"Error processing outbound task {task.id}: {e}")
        except Exception as e:
            logger.error(f"Error in retry_worker outbound: {e}")

        # 2. Process Inbound Event Queue (Blockchain -> Database)
        try:
            # Find FAILED events that are ready to retry
            result = await db.execute(
                select(BlockchainEventQueue).where(
                    and_(
                        BlockchainEventQueue.status == BlockchainQueueStatus.FAILED,
                        or_(
                            BlockchainEventQueue.next_retry_time == None,
                            BlockchainEventQueue.next_retry_time <= now
                        )
                    )
                ).limit(50)
            )
            event_tasks = result.scalars().all()
            
            for event in event_tasks:
                # Exponential backoff (e.g. 2^retry_count minutes)
                backoff_minutes = 2 ** event.retry_count
                event.next_retry_time = now + timedelta(minutes=backoff_minutes)
                event.status = BlockchainQueueStatus.PENDING # Back to pending so event_worker picks it up
                
                await db.commit()
                logger.info(f"Scheduled retry for inbound event {event.id} at {event.next_retry_time}")
                
        except Exception as e:
            logger.error(f"Error in retry_worker inbound: {e}")
