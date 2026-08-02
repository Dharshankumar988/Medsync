import time
import logging
from typing import Dict, Any
from web3.exceptions import TimeExhausted
from app.blockchain.client import blockchain_client
from app.blockchain.config import blockchain_settings
from app.blockchain.transactions.nonce import nonce_manager
from app.blockchain.transactions.gas import gas_manager
from app.blockchain.types import TransactionReceiptResult
from app.blockchain.exceptions import TransactionReverted, ContractExecutionError

logger = logging.getLogger("blockchain.transactions.manager")

class TransactionManager:
    """
    Manages building, signing, broadcasting, and waiting for transactions.
    Includes exponential backoff retry logic for transient failures.
    """
    def send_transaction(self, contract_function) -> TransactionReceiptResult:
        retries = 0
        while retries <= blockchain_settings.MAX_RETRIES:
            try:
                # 1. Build Base Tx
                tx = contract_function.build_transaction({
                    'chainId': blockchain_client.get_chain_id(),
                    'from': blockchain_client.wallet_address
                })

                # 2. Get Nonce
                nonce = nonce_manager.get_next_nonce()
                tx['nonce'] = nonce

                # 3. Estimate Gas and Apply Fees
                tx['gas'] = gas_manager.estimate_gas_limit(tx)
                tx = gas_manager.apply_fees(tx)

                # 4. Sign Tx
                signed_tx = blockchain_client.account.sign_transaction(tx)

                # 5. Broadcast Tx
                tx_hash = blockchain_client.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
                hex_hash = blockchain_client.w3.to_hex(tx_hash)
                logger.info(f"Transaction broadcasted. Hash: {hex_hash}. Waiting for receipt...")

                # 6. Wait for Receipt
                receipt = blockchain_client.w3.eth.wait_for_transaction_receipt(
                    tx_hash, 
                    timeout=blockchain_settings.TX_TIMEOUT_SECONDS
                )

                if receipt.status != 1:
                    logger.error(f"Transaction {hex_hash} reverted by EVM.")
                    raise TransactionReverted(f"Transaction {hex_hash} reverted. Receipt: {receipt}")

                logger.info(f"Transaction {hex_hash} confirmed in block {receipt.blockNumber}")
                
                return {
                    "transactionHash": hex_hash,
                    "blockNumber": receipt.blockNumber,
                    "gasUsed": receipt.gasUsed,
                    "status": receipt.status,
                    "fromAddress": receipt['from'],
                    "toAddress": receipt.to,
                    "logs": list(receipt.logs)
                }

            except (TimeExhausted, ConnectionError, TimeoutError) as e:
                logger.warning(f"Transient error sending transaction: {e}. Retrying...")
                retries += 1
                nonce_manager.reset() # Reset nonce in case it was a network drop
                if retries > blockchain_settings.MAX_RETRIES:
                    raise ContractExecutionError(f"Max retries exceeded for transaction: {e}")
                time.sleep(blockchain_settings.RETRY_DELAY_SECONDS * (2 ** (retries - 1)))
            except Exception as e:
                # For contract reverts or severe errors, don't retry.
                logger.error(f"Fatal error during transaction execution: {e}")
                raise

transaction_manager = TransactionManager()
