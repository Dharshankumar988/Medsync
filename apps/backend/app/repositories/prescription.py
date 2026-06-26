from app.repositories.base import BaseRepository
from app.models.prescription import Prescription, PrescriptionItem

class PrescriptionRepository(BaseRepository[Prescription, dict, dict]):
    pass

prescription_repo = PrescriptionRepository(Prescription)

class PrescriptionItemRepository(BaseRepository[PrescriptionItem, dict, dict]):
    pass

prescription_item_repo = PrescriptionItemRepository(PrescriptionItem)
