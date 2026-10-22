import asyncio
import logging
import os
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.database.session import AsyncSessionLocal
from app.models.blockchain import BlockchainEventQueue, BlockchainSyncState
from app.blockchain.client import blockchain_client
from app.blockchain.contracts.loader import contract_loader
from app.blockchain.monitoring.events import serialize_event_args

logger = logging.getLogger("blockchain.listener")

# List of all known contracts to listen to
TRACKED_CONTRACTS = ["PatientRegistry", "DoctorRegistry", "PrescriptionRegistry", "MedicalRecordRegistry", "PharmacyRegistry"]

def _is_rate_limit_error(err: Exception) -> bool:
    msg = str(err).lower()
    return "429" in msg or "too many requests" in msg or "capacity limit exceeded" in msg or "compute units" in msg

async def fetch_and_enqueue_batch(from_block: int, to_block: int, db) -> bool:
    """
    Fetch all events for all tracked contracts in a single batched eth_getLogs call,
    decode them locally in memory using contract ABIs, and enqueue them into BlockchainEventQueue.
    """
    if not blockchain_client.w3:
        return True

    contract_map = {}
    addresses = []
    for name in TRACKED_CONTRACTS:
        try:
            contract = contract_loader.get_contract(name)
            contract_map[contract.address.lower()] = (name, contract)
            addresses.append(contract.address)
        except Exception as e:
            logger.debug(f"Contract {name} not loaded for event listening: {e}")

    if not addresses:
        return True

    raw_logs = []
    try:
        # Fetch logs for all contracts in 1 single RPC call
        raw_logs = await asyncio.to_thread(
            blockchain_client.w3.eth.get_logs,
            {
                "address": addresses,
                "fromBlock": from_block,
                "toBlock": to_block
            }
        )
    except Exception as e:
        if _is_rate_limit_error(e):
            raise
        # If multi-address querying is not supported by provider, query per contract
        logger.debug(f"Batched get_logs failed ({e}), falling back to per-contract queries")
        for addr in addresses:
            name, contract = contract_map[addr.lower()]
            try:
                logs = await asyncio.to_thread(
                    blockchain_client.w3.eth.get_logs,
                    {
                        "address": contract.address,
                        "fromBlock": from_block,
                        "toBlock": to_block
                    }
                )
                raw_logs.extend(logs)
            except Exception as sub_e:
                if _is_rate_limit_error(sub_e):
                    raise
                logger.error(f"Error fetching logs for {name}: {sub_e}")

    if not raw_logs:
        return True

    # Decode logs locally using contract ABIs (zero RPC calls)
    for log in raw_logs:
        log_addr = (log.get("address") or "").lower()
        if log_addr not in contract_map:
            continue

        contract_name, contract = contract_map[log_addr]
        decoded = None
        matched_event_name = None

        for event_abi in contract.events:
            event_name = event_abi.event_name
            event_type = getattr(contract.events, event_name)
            try:
                decoded = event_type().process_log(log)
                matched_event_name = event_name
                break
            except Exception:
                continue

        if decoded and matched_event_name:
            tx_h = log.get("transactionHash")
            tx_str = tx_h.hex() if hasattr(tx_h, "hex") else str(tx_h)
            blk = log.get("blockNumber", 0)
            blk_num = int(blk, 16) if isinstance(blk, str) else int(blk)
            idx = log.get("logIndex", 0)
            idx_num = int(idx, 16) if isinstance(idx, str) else int(idx)

            queue_item = BlockchainEventQueue(
                event_name=matched_event_name,
                contract_name=contract_name,
                contract_address=contract.address,
                transaction_hash=tx_str,
                block_number=blk_num,
                log_index=idx_num,
                event_data=serialize_event_args(dict(decoded.args))
            )
            db.add(queue_item)
            try:
                await db.commit()
                logger.info(f"Enqueued {matched_event_name} event from {contract_name} tx {tx_str}")
            except IntegrityError:
                await db.rollback()
                pass
            except Exception as e:
                await db.rollback()
                logger.error(f"Failed to save event {matched_event_name} to queue: {e}")

    return True

async def fetch_and_enqueue_events(contract_name: str, from_block: int, to_block: int, db):
    """Backwards-compatible helper for fetching a single contract's events."""
    await fetch_and_enqueue_batch(from_block, to_block, db)

async def block_listener_loop():
    from app.blockchain.provider import RESOLVED_BLOCKCHAIN_MODE
    if RESOLVED_BLOCKCHAIN_MODE not in ("production", "real"):
        logger.info("Mock mode — blockchain event listener loop skipped.")
        return

    logger.info("Starting blockchain event listener loop...")
    backoff_delay = 5.0

    while True:
        caught_up = True
        try:
            latest_block = await asyncio.to_thread(lambda: blockchain_client.w3.eth.block_number)

            async with AsyncSessionLocal() as db:
                # 1. Load or initialize sync states for all tracked contracts
                sync_states = {}
                for contract_name in TRACKED_CONTRACTS:
                    result = await db.execute(
                        select(BlockchainSyncState).where(BlockchainSyncState.contract_name == contract_name)
                    )
                    st = result.scalar_one_or_none()
                    if not st:
                        st = BlockchainSyncState(contract_name=contract_name, last_processed_block=latest_block)
                        db.add(st)
                        await db.commit()
                    sync_states[contract_name] = st

                # 2. Determine lowest processed block across tracked contracts
                min_processed = min(st.last_processed_block for st in sync_states.values())

                # Lookback guard: clamp to prevent endless catch-up queries on historical blocks
                MAX_SYNC_LOOKBACK = int(os.getenv("BLOCKCHAIN_MAX_LOOKBACK", "200"))
                if min_processed < latest_block - MAX_SYNC_LOOKBACK:
                    new_min = latest_block - MAX_SYNC_LOOKBACK
                    logger.warning(
                        f"Sync state ({min_processed}) is > {MAX_SYNC_LOOKBACK} blocks behind latest ({latest_block}). "
                        f"Fast-forwarding to {new_min} to prevent RPC throttling."
                    )
                    for st in sync_states.values():
                        st.last_processed_block = new_min
                    await db.commit()
                    min_processed = new_min

                from_block = min_processed + 1
                if from_block <= latest_block:
                    caught_up = False
                    MAX_BLOCKS = int(os.getenv("BLOCKCHAIN_MAX_BLOCKS", "10"))
                    to_block = min(latest_block, from_block + MAX_BLOCKS - 1)

                    logger.debug(f"Syncing contracts from block {from_block} to {to_block}")
                    await fetch_and_enqueue_batch(from_block, to_block, db)

                    # Update all sync states to to_block
                    for st in sync_states.values():
                        st.last_processed_block = to_block
                    await db.commit()

            # Reset backoff on success
            backoff_delay = 5.0

        except Exception as e:
            caught_up = True
            if _is_rate_limit_error(e):
                logger.warning(
                    f"RPC rate limit (429) hit in listener loop: {str(e)[:150]}. "
                    f"Attempting RPC failover and backing off for {backoff_delay:.1f}s..."
                )
                blockchain_client.switch_to_fallback()
                await asyncio.sleep(backoff_delay)
                backoff_delay = min(backoff_delay * 1.5, 60.0)
                continue
            else:
                logger.error(f"Listener loop error: {e}")
                await asyncio.sleep(10)
                continue

        if caught_up:
            POLL_INTERVAL = float(os.getenv("BLOCKCHAIN_POLL_INTERVAL", "15.0"))
            await asyncio.sleep(POLL_INTERVAL)
        else:
            CATCHUP_DELAY = float(os.getenv("BLOCKCHAIN_CATCHUP_DELAY", "2.0"))
            await asyncio.sleep(CATCHUP_DELAY)

def start_event_listener():
    # Will be called during app startup
    asyncio.create_task(block_listener_loop())
