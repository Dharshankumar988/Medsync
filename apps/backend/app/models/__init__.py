from app.database.base_class import Base
from app.models.user import User, UserRole, UserStatus
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.admin import Admin
from app.models.hospital import Hospital
from app.models.pharmacy import Pharmacy
from app.models.appointment import Appointment, AppointmentStatus, DoctorAvailability, AppointmentStatusHistory
from app.models.prescription import Prescription
from app.models.prescription_transfer import PrescriptionTransfer
from app.models.record import MedicalRecord, MedicalRecordVersion, RecordPermission
from app.models.ai_chat import AIChatSession, AIChatMessage
from app.models.payment import Payment, PaymentStatus, PaymentMethod
from app.models.pharmacy_system import Medicine, MedicineInventory, MedicineOrder, MedicineOrderItem
from app.models.notification import Notification
from app.models.verification import VerificationRequest
from app.models.blockchain import BlockchainSyncTask, BlockchainTransaction, BlockchainAuditLog
from app.models.api_log import ApiRequestLog
from app.models.rag import KnowledgeDocument, KnowledgeChunk
# New models for role-function completion
from app.models.qr_token import QRAuthorizationToken, QRPurpose, QRTokenStatus
from app.models.consultation import Consultation
from app.models.doctor_location import DoctorLocation, LocationType, LocationVerificationStatus
from app.models.pharmacy_location import PharmacyLocation
from app.models.medical_history_share import MedicalHistoryShare
from app.models.audit_log import AuditLog
from app.models.security import PatientSecurityCredential, PatientBiometricProfile, PrescriptionDownloadAuthorization

__all__ = [
    "Base",
    "User",
    "UserRole",
    "UserStatus",
    "Patient",
    "Doctor",
    "Admin",
    "Hospital",
    "Pharmacy",
    "Appointment",
    "AppointmentStatus",
    "DoctorAvailability",
    "AppointmentStatusHistory",
    "Prescription",
    "PrescriptionTransfer",
    "MedicalRecord",
    "MedicalRecordVersion",
    "RecordPermission",
    "AIChatSession",
    "AIChatMessage",
    "Payment",
    "PaymentStatus",
    "PaymentMethod",
    "Medicine",
    "MedicineInventory",
    "MedicineOrder",
    "MedicineOrderItem",
    "Notification",
    "VerificationRequest",
    "BlockchainSyncTask",
    "BlockchainTransaction",
    "BlockchainAuditLog",
    "ApiRequestLog",
    "KnowledgeDocument",
    "KnowledgeChunk",
    "QRAuthorizationToken",
    "QRPurpose",
    "QRTokenStatus",
    "Consultation",
    "DoctorLocation",
    "LocationType",
    "LocationVerificationStatus",
    "PharmacyLocation",
    "MedicalHistoryShare",
    "AuditLog",
    "PatientSecurityCredential",
    "PatientBiometricProfile",
    "PrescriptionDownloadAuthorization",
]