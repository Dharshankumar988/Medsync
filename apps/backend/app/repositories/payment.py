from app.repositories.base import BaseRepository
from app.models.payment import Payment, Invoice

class PaymentRepository(BaseRepository[Payment, dict, dict]):
    pass

payment_repo = PaymentRepository(Payment)
