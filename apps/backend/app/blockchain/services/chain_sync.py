import logging
import datetime
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.blockchain import BlockchainTransaction
from app.blockchain.config import blockchain_settings

logger = logging.getLogger("blockchain.chain_sync")

KNOWN_CONTRACTS = {
    "0x9dcd620f006555fffa072d2280ef47506c5da2a3": "PatientRegistry",
    "0x260d8c75009b62009aa2762c1d76d8daaea1a7a9": "DoctorRegistry",
    "0x50dc448bf7260f736a0a3a10151ccb1a495d3be9": "PharmacyRegistry",
    "0xfc15aa7ef7759daef6c9d3dfb6eec30dc4783104": "MedicalRecordRegistry",
    "0x94013b71f9a3eebcdbcd11fe460e8e9253916a6d": "PrescriptionRegistry",
    "0x755f2dbb9caaa78eac77ff3115f92984bac37e52": "ConsentManagement",
}

async def sync_wallet_transactions_from_chain(db: AsyncSession, max_count: int = 50) -> int:
    """
    Directly query Alchemy and JSON-RPC for the user's wallet transactions
    and persist them into the BlockchainTransaction database table.
    Works without native C-extensions or local Web3 modules.
    """
    wallet_addr = (
        getattr(blockchain_settings, "MEDSYNC_WALLET_ADDRESS", None)
        or "0x6EC559064e5BfAE4a98d1879c717139aceE49822"
    ).lower()
    
    rpc_url = (
        getattr(blockchain_settings, "BLOCKCHAIN_RPC_URL", None)
        or "https://polygon-amoy.g.alchemy.com/v2/alch__Nw1xD-aIASoR5r0zqb1c"
    )

    transfers = []
    current_block = 0

    async with httpx.AsyncClient(timeout=15.0) as client:
        # 1. Fetch current block number
        try:
            r_block = await client.post(
                rpc_url,
                json={"jsonrpc": "2.0", "id": 1, "method": "eth_blockNumber", "params": []}
            )
            if r_block.status_code == 200:
                current_block = int(r_block.json().get("result", "0x0"), 16)
        except Exception as e:
            logger.warning(f"Could not fetch current block: {e}")

        # 2. Fetch Alchemy asset transfers in both directions
        try:
            for direction in ["fromAddress", "toAddress"]:
                payload = {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "alchemy_getAssetTransfers",
                    "params": [{
                        "fromBlock": "0x0",
                        "toBlock": "latest",
                        direction: wallet_addr,
                        "category": ["external", "erc20"],
                        "withMetadata": True,
                        "excludeZeroValue": False,
                        "order": "desc",
                        "maxCount": hex(max_count)
                    }]
                }
                res = await client.post(rpc_url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    transfers.extend(data.get("result", {}).get("transfers", []))
        except Exception as e:
            logger.error(f"Error querying Alchemy asset transfers: {e}")
            return 0

        hashes = list(dict.fromkeys([t.get("hash") for t in transfers if t.get("hash")]))
        if not hashes:
            return 0

        # Pre-fetch existing hashes in lowercase to avoid redundant RPC lookups
        try:
            existing_rows = await db.scalars(select(BlockchainTransaction.transaction_hash))
            existing_hashes = {h.lower() for h in existing_rows.all() if h}
        except Exception:
            existing_hashes = set()

        synced = 0
        for tx_hash in hashes:
            tx_hash_lower = tx_hash.lower()
            if tx_hash_lower in existing_hashes:
                continue

            try:
                # Fetch tx and receipt via standard JSON-RPC
                tx_res = await client.post(
                    rpc_url,
                    json={"jsonrpc": "2.0", "id": 1, "method": "eth_getTransactionByHash", "params": [tx_hash]}
                )
                rcpt_res = await client.post(
                    rpc_url,
                    json={"jsonrpc": "2.0", "id": 2, "method": "eth_getTransactionReceipt", "params": [tx_hash]}
                )

                if tx_res.status_code != 200 or rcpt_res.status_code != 200:
                    continue

                tx_data = tx_res.json().get("result")
                rcpt_data = rcpt_res.json().get("result")
                if not tx_data or not rcpt_data:
                    continue

                tx_block_num = int(tx_data.get("blockNumber", "0x0"), 16)
                gas_used = int(rcpt_data.get("gasUsed", "0x0"), 16)
                gas_price = str(int(tx_data.get("gasPrice", "0x0"), 16))
                
                to_addr = (tx_data.get("to") or "").lower()
                contract_addr = rcpt_data.get("contractAddress") or tx_data.get("to")
                contract_name = KNOWN_CONTRACTS.get(to_addr)
                if not contract_name and rcpt_data.get("contractAddress"):
                    contract_name = KNOWN_CONTRACTS.get(rcpt_data.get("contractAddress").lower())

                if not contract_name and not tx_data.get("to"):
                    contract_name = "Contract Deployment"
                elif not contract_name:
                    contract_name = "Polygon Transfer / Call"

                # Confirmations & status
                confirmations = max(1, current_block - tx_block_num) if current_block else 1
                status = "CONFIRMED" if rcpt_data.get("status") == "0x1" else "REVERTED"
                now = datetime.datetime.now(datetime.timezone.utc)

                val_dict = {
                    "transaction_hash": tx_hash,
                    "block_number": tx_block_num,
                    "block_timestamp": now,
                    "gas_used": gas_used,
                    "gas_price": gas_price,
                    "contract_address": contract_addr,
                    "contract_name": contract_name,
                    "contract_version": "1.0.0",
                    "network": "amoy",
                    "chain_id": 80002,
                    "confirmation_count": min(confirmations, 999999),
                    "status": status,
                    "wallet_address": tx_data.get("from") or wallet_addr,
                    "execution_time_ms": 1200
                }

                try:
                    # Atomic upsert via PostgreSQL dialect to eliminate concurrent duplicate key exceptions
                    from sqlalchemy.dialects.postgresql import insert as pg_insert
                    stmt = pg_insert(BlockchainTransaction).values(**val_dict).on_conflict_do_nothing(index_elements=['transaction_hash'])
                    await db.execute(stmt)
                    await db.commit()
                    synced += 1
                    existing_hashes.add(tx_hash_lower)
                except Exception:
                    await db.rollback()
                    try:
                        # Fallback for SQLite / generic DB in tests
                        await db.merge(BlockchainTransaction(**val_dict))
                        await db.commit()
                        synced += 1
                        existing_hashes.add(tx_hash_lower)
                    except Exception as inner_ex:
                        await db.rollback()
                        logger.debug(f"Could not persist tx {tx_hash}: {inner_ex}")

            except Exception as ex:
                logger.debug(f"Could not fetch details for tx {tx_hash}: {ex}")

        if synced > 0:
            logger.info(f"Successfully synced {synced} on-chain transactions for {wallet_addr}")

        return synced
