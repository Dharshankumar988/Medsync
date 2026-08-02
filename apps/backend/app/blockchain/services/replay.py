import logging
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy import select, or_, and_
from uuid import UUID
from app.database.session import AsyncSessionLocal
from app.models.blockchain import BlockchainEventQueue, BlockchainQueueStatus

logger = logging.getLogger("blockchain.services.replay")

class EventReplayService:
    """
    Provides capabilities to replay permanently failed events from the Dead Letter Queue (DLQ).
    """
    
    @staticmethod
    async def replay_dlq_event(event_id: UUID) -> bool:
        """Replay a specific event from the DLQ."""
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(BlockchainEventQueue).where(BlockchainEventQueue.id == event_id))
            event = result.scalar_one_or_none()
            
            if not event or event.status != BlockchainQueueStatus.DLQ:
                logger.warning(f"Event {event_id} not found in DLQ.")
                return False
                
            # Reset event to pending and clear errors
            event.status = BlockchainQueueStatus.PENDING
            event.retry_count = 0
            event.next_retry_time = datetime.now(timezone.utc)
            
            await db.commit()
            logger.info(f"Successfully scheduled DLQ event {event_id} for replay.")
            return True

    @staticmethod
    async def replay_dlq_bulk(contract_name: Optional[str] = None) -> int:
        """Replay all events in DLQ, optionally filtered by contract."""
        async with AsyncSessionLocal() as db:
            query = select(BlockchainEventQueue).where(BlockchainEventQueue.status == BlockchainQueueStatus.DLQ)
            if contract_name:
                query = query.where(BlockchainEventQueue.contract_name == contract_name)
                
            result = await db.execute(query)
            events = result.scalars().all()
            
            count = 0
            for event in events:
                event.status = BlockchainQueueStatus.PENDING
                event.retry_count = 0
                event.next_retry_time = datetime.now(timezone.utc)
                count += 1
                
            await db.commit()
            logger.info(f"Scheduled {count} DLQ events for replay.")
            return count

replay_service = EventReplayService()
