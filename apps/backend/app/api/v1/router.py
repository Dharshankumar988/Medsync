from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, users, admin, records, appointments, prescriptions,
    pharmacy, orders, payments, notifications, health, internal,
    profile, hospitals, verify, inventory, rag, fhir,
    consultations, doctor_locations, pharmacy_locations, security,
)

api_router = APIRouter()
api_router.include_router(fhir.router, prefix="/fhir", tags=["FHIR"])
api_router.include_router(health.router, prefix="/health", tags=["System"])
api_router.include_router(internal.router, prefix="/internal", tags=["Internal"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(rag.router, prefix="/rag", tags=["RAG"])
api_router.include_router(records.router, prefix="/records", tags=["Medical Records"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["Appointments"])
api_router.include_router(prescriptions.router, prefix="/prescriptions", tags=["Prescriptions"])
api_router.include_router(pharmacy.router, prefix="/pharmacy", tags=["Pharmacy Inventory"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
api_router.include_router(orders.router, prefix="/orders", tags=["Medicine Orders"])
api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
try:
    from app.api.v1.endpoints import ai
    api_router.include_router(ai.router, prefix="/ai", tags=["Artificial Intelligence"])
except ImportError as e:
    import logging
    logging.error(f"Skipped ai router due to import error (AI dependencies missing): {e}")
try:
    from app.api.v1.endpoints import blockchain
    api_router.include_router(blockchain.router, prefix="/blockchain", tags=["Blockchain"])
except ImportError as e:
    import logging
    logging.error(f"Skipped blockchain router due to import error: {e}")
api_router.include_router(profile.router, prefix="/profile", tags=["Profile"])
api_router.include_router(hospitals.router, prefix="/hospitals", tags=["Hospitals"])
api_router.include_router(verify.router, prefix="/verify", tags=["Verification"])

# New routers for role-function completion
api_router.include_router(consultations.router, prefix="/consultations", tags=["Consultations"])
api_router.include_router(doctor_locations.router, prefix="/doctor-locations", tags=["Doctor Locations"])
api_router.include_router(pharmacy_locations.router, prefix="/pharmacy-locations", tags=["Pharmacy Locations"])
api_router.include_router(security.router, prefix="/security", tags=["Security"])

try:
    from app.api.v1.endpoints import blockchain_analytics
    api_router.include_router(blockchain_analytics.router, prefix="/blockchain", tags=["Blockchain Analytics"])
except ImportError:
    import logging
    logging.warning("Skipped blockchain_analytics router because web3 is not installed.")
