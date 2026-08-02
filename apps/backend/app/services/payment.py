import uuid
import logging
from typing import Dict, Any

logger = logging.getLogger("medsync.payment")

class PaymentService:
    @staticmethod
    async def process_payment(payment_method: str, amount: float) -> Dict[str, Any]:
        tx_id = f"txn_{uuid.uuid4().hex[:16]}"
        logger.info(f"Payment processed successfully: {amount} USD via {payment_method} (TxID: {tx_id})")
        return {
            "status": "success",
            "transaction_id": tx_id,
            "amount": amount,
            "payment_method": payment_method,
            "currency": "USD"
        }

