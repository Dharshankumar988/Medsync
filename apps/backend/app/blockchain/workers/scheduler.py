import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.blockchain.workers.retry_worker import process_retry_queue
from app.blockchain.workers.confirmation_worker import poll_confirmations
from app.blockchain.workers.event_worker import sync_events
from app.blockchain.monitoring.listener import start_event_listener

logger = logging.getLogger("blockchain.scheduler")

scheduler = AsyncIOScheduler()

def start_scheduler():
    from app.blockchain.provider import RESOLVED_BLOCKCHAIN_MODE
    
    if RESOLVED_BLOCKCHAIN_MODE == "mock":
        logger.info("Blockchain mode: mock — blockchain scheduler disabled.")
        return

    logger.info("Starting Blockchain Synchronization Workers...")
    
    # Process retry queue every 30 seconds
    scheduler.add_job(
        process_retry_queue,
        trigger=IntervalTrigger(seconds=30),
        id="retry_worker",
        replace_existing=True
    )
    
    # Poll for transaction confirmations every 15 seconds
    scheduler.add_job(
        poll_confirmations,
        trigger=IntervalTrigger(seconds=15),
        id="confirmation_worker",
        replace_existing=True
    )
    
    # Process events from the Database Event Queue every 5 seconds
    scheduler.add_job(
        sync_events,
        trigger=IntervalTrigger(seconds=5),
        id="event_worker",
        replace_existing=True,
        max_instances=1
    )
    
    # Start the background long-running block listener
    start_event_listener()
    
    scheduler.start()

def stop_scheduler():
    logger.info("Stopping Blockchain Synchronization Workers...")
    scheduler.shutdown()
