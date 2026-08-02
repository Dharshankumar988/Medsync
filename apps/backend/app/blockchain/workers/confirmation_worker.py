import logging
from sqlalchemy import select
from web3.exceptions import TransactionNotFound
from app.database.session import AsyncSessionLocal
from app.models.blockchain import BlockchainTransaction, SyncStatus
from app.blockchain.client import blockchain_client
from app.blockchain.mock_gateway import MockBlockchainGateway
from app.blockchain.provider import blockchain_gateway
import time

logger = logging.getLogger("blockchain.workers.confirmation")

REQUIRED_CONFIRMATIONS = 12

async def poll_confirmations():
    """
    Checks the status of transactions that are in PENDING or CONFIRMING state.
    Monitors until they reach final confirmation (e.g. 12 blocks).
    """
    if isinstance(blockchain_gateway, MockBlockchainGateway):
        # Mock mode fast-forwards everything
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(BlockchainTransaction).where(BlockchainTransaction.status.in_(["PENDING", "CONFIRMING"])))
            txs = result.scalars().all()
            for tx in txs:
                tx.status = "CONFIRMED"
                tx.confirmation_count = REQUIRED_CONFIRMATIONS
            await db.commit()
        return

    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(BlockchainTransaction)
                .where(BlockchainTransaction.status.in_(["PENDING", "CONFIRMING"]))
            )
            transactions = result.scalars().all()
            
            if not transactions:
                return

            current_block = blockchain_client.w3.eth.block_number

            for tx in transactions:
                try:
                    receipt = blockchain_client.w3.eth.get_transaction_receipt(tx.transaction_hash)
                    
                    if receipt:
                        # Calculate confirmations
                        confirmations = (current_block - receipt.blockNumber) + 1
                        tx.confirmation_count = confirmations
                        tx.block_number = receipt.blockNumber
                        tx.gas_used = receipt.gasUsed
                        
                        if confirmations >= REQUIRED_CONFIRMATIONS:
                            if receipt.status == 1:
                                tx.status = "CONFIRMED"
                            else:
                                tx.status = "FAILED"
                                tx.failure_reason = "Transaction Reverted on chain"
                        else:
                            if receipt.status == 1:
                                tx.status = "CONFIRMING"
                            else:
                                tx.status = "FAILED"
                                tx.failure_reason = "Transaction Reverted on chain"
                        
                        # Set execution time if we just finalized it
                        if tx.status in ["CONFIRMED", "FAILED"] and tx.created_at:
                            tx.execution_time_ms = int((time.time() - tx.created_at.timestamp()) * 1000)
                            
                        logger.info(f"Tx {tx.transaction_hash} has {confirmations} confirmations. Status: {tx.status}")
                        
                except TransactionNotFound:
                    # Transaction might be dropped or still in mempool
                    # We can track how long it's been pending, and mark as FAILED if too long (e.g. 1 hour)
                    time_pending = time.time() - tx.created_at.timestamp()
                    if time_pending > 3600:
                        tx.status = "FAILED"
                        tx.failure_reason = "Dropped from mempool"
                        logger.warning(f"Tx {tx.transaction_hash} dropped (pending > 1hr).")
                except Exception as e:
                    logger.error(f"Error polling receipt for tx {tx.transaction_hash}: {e}")
            
            await db.commit()
                
        except Exception as e:
            logger.error(f"Error in confirmation polling worker: {e}")
