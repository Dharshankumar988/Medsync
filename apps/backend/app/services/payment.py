class PaymentService:
    @staticmethod
    async def process_payment(payment_method: str, amount: float):
        print(f"PAYMENT: Processing {amount} via {payment_method}")
        return {"status": "success", "transaction_id": "txn_mock_123456"}
