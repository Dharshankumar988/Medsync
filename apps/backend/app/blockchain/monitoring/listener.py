import asyncio
import logging
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from web3.exceptions import BlockNotFound
from app.database.session import AsyncSessionLocal
from app.models.blockchain import BlockchainEventQueue, BlockchainSyncState
from app.blockchain.client import blockchain_client
from app.blockchain.contracts.loader import contract_loader
from app.blockchain.monitoring.events import event_listener

logger = logging.getLogger("blockchain.listener")

# List of all known contracts to listen to
TRACKED_CONTRACTS = ["PatientRegistry", "DoctorRegistry", "PrescriptionRegistry", "MedicalRecordRegistry", "PharmacyRegistry"]

async def fetch_and_enqueue_events(contract_name: str, from_block: int, to_block: int):
    # Retrieve all events for this contract by using the web3 get_logs with topics or just iterating contract events
    # We will use the existing get_past_events for each event in the contract, or a generalized get_logs.
    
    # Since event_listener.get_past_events requires event_name, we can inspect contract.events
    try:
        contract = contract_loader.get_contract(contract_name)
    except Exception as e:
        logger.error(f"Failed to load contract {contract_name} for listening: {e}")
        return

    async with AsyncSessionLocal() as db:
        for event_abi in contract.events:
            event_name = event_abi.event_name
            try:
                events = event_listener.get_past_events(contract_name, event_name, from_block, to_block)
                for e in events:
                    # Enqueue event
                    queue_item = BlockchainEventQueue(
                        event_name=e["event"],
                        contract_name=contract_name,
                        contract_address=contract.address,
                        transaction_hash=e["transactionHash"],
                        block_number=e["blockNumber"],
                        log_index=e.get("logIndex", 0), # Fallback to 0 if not provided by get_past_events
                        event_data=e["args"]
                    )
                    db.add(queue_item)
                    
                    try:
                        await db.commit()
                        logger.info(f"Enqueued {event_name} event from {contract_name} tx {e['transactionHash']}")
                    except IntegrityError:
                        await db.rollback()
                        # Duplicate event (tx_hash, log_index)
                        pass
            except Exception as e:
                logger.error(f"Error fetching {event_name} from {contract_name}: {e}")
                
import os

async def block_listener_loop():
    from app.blockchain.provider import RESOLVED_BLOCKCHAIN_MODE
    if RESOLVED_BLOCKCHAIN_MODE not in ("production", "real"):
        logger.info("Mock mode — blockchain event listener loop skipped.")
        return
        
    logger.info("Starting blockchain event listener loop...")
    while True:
        try:
            latest_block = blockchain_client.w3.eth.block_number
            
            async with AsyncSessionLocal() as db:
                for contract_name in TRACKED_CONTRACTS:
                    # Get sync state
                    result = await db.execute(select(BlockchainSyncState).where(BlockchainSyncState.contract_name == contract_name))
                    sync_state = result.scalar_one_or_none()
                    
                    if not sync_state:
                        sync_state = BlockchainSyncState(contract_name=contract_name, last_processed_block=latest_block)
                        db.add(sync_state)
                        await db.commit()
                    
                    from_block = sync_state.last_processed_block + 1
                    
                    if from_block <= latest_block:
                        logger.debug(f"Syncing {contract_name} from {from_block} to {latest_block}")
                        await fetch_and_enqueue_events(contract_name, from_block, latest_block)
                        
                        sync_state.last_processed_block = latest_block
                        await db.commit()
                        
        except Exception as e:
            logger.error(f"Listener loop error: {e}")
        
        await asyncio.sleep(15) # Poll every 15 seconds (typical block time)

def start_event_listener():
    # Will be called during app startup
    asyncio.create_task(block_listener_loop())
