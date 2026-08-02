import logging
from sqlalchemy import select
from app.database.session import AsyncSessionLocal
from app.models.blockchain import BlockchainEventQueue, BlockchainQueueStatus, BlockchainAuditLog, SyncEntityType
from app.websocket.manager import manager as websocket_manager

logger = logging.getLogger("blockchain.workers.events")

async def process_event(db, event: BlockchainEventQueue):
    """
    Business logic for processing a specific blockchain event.
    """
    logger.info(f"Processing event: {event.event_name} from tx {event.transaction_hash}")
    
    # 1. Deduplicate / Check if already handled in AuditLog
    existing = await db.execute(select(BlockchainAuditLog).where(BlockchainAuditLog.transaction_hash == event.transaction_hash))
    if existing.scalar_one_or_none():
        logger.info(f"Event {event.event_name} for tx {event.transaction_hash} already processed.")
        return
        
    # 2. Determine Entity Type
    entity_type = SyncEntityType.PATIENT # Default, should map based on event_name
    entity_id = event.event_data.get("patientId") or event.event_data.get("doctorId") or event.event_data.get("recordId") or event.event_data.get("prescriptionId")
    
    if "Doctor" in event.event_name:
        entity_type = SyncEntityType.DOCTOR
    elif "Prescription" in event.event_name:
        entity_type = SyncEntityType.PRESCRIPTION
    elif "MedicalRecord" in event.event_name:
        entity_type = SyncEntityType.MEDICAL_RECORD
    elif "Pharmacy" in event.event_name:
        entity_type = SyncEntityType.PHARMACY
        
    # 3. Create Audit Log Entry
    if entity_id:
        log = BlockchainAuditLog(
            entity_type=entity_type,
            entity_id=entity_id,
            action=event.event_name,
            transaction_hash=event.transaction_hash,
            block_number=event.block_number,
            contract_address=event.contract_address,
            event_data=event.event_data,
            status="CONFIRMED"
        )
        db.add(log)
        
    # 4. Trigger WebSocket Notification
    await websocket_manager.emit_blockchain_event(
        event_type=event.event_name, 
        data=event.event_data, 
        user_id=None # Can be targeted if we map entity_id to user_id
    )

async def sync_events(db=None):
    """
    Pulls PENDING events from the Event Queue and processes them.
    This replaces the old direct polling implementation.
    """
    if db is not None:
        await _process_sync_events_batch(db)
    else:
        async with AsyncSessionLocal() as db_session:
            await _process_sync_events_batch(db_session)

async def _process_sync_events_batch(db):
    try:
        # Fetch pending events (limit to 50 per batch)
        result = await db.execute(
            select(BlockchainEventQueue)
            .where(BlockchainEventQueue.status == BlockchainQueueStatus.PENDING)
            .order_by(BlockchainEventQueue.created_at)
            .limit(50)
        )
        events = result.scalars().all() if hasattr(result, "scalars") else []
        
        for event in events:
            event.status = BlockchainQueueStatus.PROCESSING
            await db.commit() # Lock the event conceptually
            
            try:
                await process_event(db, event)
                event.status = BlockchainQueueStatus.PROCESSED
            except Exception as e:
                logger.error(f"Failed to process event {event.id}: {e}")
                event.retry_count += 1
                if event.retry_count >= event.max_retries:
                    event.status = BlockchainQueueStatus.DLQ
                else:
                    event.status = BlockchainQueueStatus.FAILED
                event.error_message = str(e)
            
            await db.commit()
            
    except Exception as e:
        logger.error(f"Error in sync_events worker: {e}")

