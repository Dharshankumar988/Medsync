import logging
import datetime
import requests
import urllib3
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.blockchain import BlockchainTransaction
from app.blockchain.client import blockchain_client
from app.blockchain.config import blockchain_settings

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
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
    Directly query Alchemy and Web3 RPC for the user's wallet transactions
    and persist them into BlockchainTransaction.
    """
    w3 = blockchain_client.w3
    if not w3 or not w3.is_connected():
        logger.warning("Web3 not connected, skipping chain transaction sync.")
        return 0

    wallet_addr = blockchain_client.wallet_address or "0x6EC559064e5BfAE4a98d1879c717139aceE49822"
    rpc_url = blockchain_settings.BLOCKCHAIN_RPC_URL or "https://polygon-amoy.g.alchemy.com/v2/alch__Nw1xD-aIASoR5r0zqb1c"

    # Query asset transfers
    transfers = []
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
                    "category": ["external"],
                    "withMetadata": True,
                    "excludeZeroValue": False,
                    "maxCount": hex(max_count)
                }]
            }
            res = requests.post(rpc_url, json=payload, verify=False, timeout=10)
            if res.status_code == 200:
                data = res.json()
                transfers.extend(data.get("result", {}).get("transfers", []))
    except Exception as e:
        logger.error(f"Error querying Alchemy asset transfers: {e}")
        return 0

    hashes = list(set([t.get("hash") for t in transfers if t.get("hash")]))
    if not hashes:
        return 0

    current_block = w3.eth.block_number
    synced = 0

    for tx_hash in hashes:
        try:
            existing = await db.execute(
                select(BlockchainTransaction).where(BlockchainTransaction.transaction_hash == tx_hash)
            )
            if existing.scalar_one_or_none():
                continue

            tx = w3.eth.get_transaction(tx_hash)
            receipt = w3.eth.get_transaction_receipt(tx_hash)
            block = w3.eth.get_block(tx.blockNumber)

            to_addr = tx.to.lower() if tx.to else None
            contract_addr = receipt.contractAddress if receipt.contractAddress else tx.to
            contract_name = KNOWN_CONTRACTS.get(to_addr)
            if not contract_name and receipt.contractAddress:
                contract_name = KNOWN_CONTRACTS.get(receipt.contractAddress.lower())

            if not contract_name and not tx.to:
                contract_name = "Contract Deployment"
            elif not contract_name:
                contract_name = "Polygon Transfer / Call"

            block_time = datetime.datetime.fromtimestamp(block.timestamp, tz=datetime.timezone.utc)
            confirmations = max(1, current_block - tx.blockNumber)

            record = BlockchainTransaction(
                transaction_hash=tx_hash,
                block_number=tx.blockNumber,
                block_timestamp=block_time,
                gas_used=receipt.gasUsed,
                gas_price=str(tx.gasPrice),
                contract_address=contract_addr,
                contract_name=contract_name,
                contract_version="1.0.0",
                network="amoy",
                chain_id=80002,
                confirmation_count=min(confirmations, 999999),
                status="CONFIRMED" if receipt.status == 1 else "REVERTED",
                wallet_address=tx["from"],
                execution_time_ms=1200
            )
            db.add(record)
            synced += 1
        except Exception as ex:
            logger.debug(f"Could not fetch tx {tx_hash}: {ex}")

    if synced > 0:
        await db.commit()
        logger.info(f"Synced {synced} new on-chain transactions for {wallet_addr}")

    return synced
