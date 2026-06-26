from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, admin, records, appointments, prescriptions, pharmacy, orders, payments, notifications, ai, blockchain, health, internal, blockchain_analytics

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["System"])
api_router.include_router(internal.router, prefix="/internal", tags=["Internal"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(records.router, prefix="/records", tags=["Medical Records"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["Appointments"])
api_router.include_router(prescriptions.router, prefix="/prescriptions", tags=["Prescriptions"])
api_router.include_router(pharmacy.router, prefix="/pharmacy", tags=["Pharmacy Inventory"])
api_router.include_router(orders.router, prefix="/orders", tags=["Medicine Orders"])
api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(ai.router, prefix="/ai", tags=["Artificial Intelligence"])
api_router.include_router(blockchain.router, prefix="/blockchain", tags=["Blockchain"])
api_router.include_router(blockchain_analytics.router, prefix="/blockchain", tags=["Blockchain Analytics"])

