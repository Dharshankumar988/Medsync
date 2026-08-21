import uuid
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models.qr_token import QRAuthorizationToken, QRTokenStatus, QRPurpose
from app.models.prescription import Prescription
from app.models.pharmacy_system import MedicineOrder
from app.models.user import User, UserStatus
from app.services.qr_pdf_service import QRPdfService


class QRAuthorizationService:
    """Server-side dynamic QR authorization with token storage, validation, and cleanup."""

    @staticmethod
    def _hash_token(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    @staticmethod
    async def generate_token(
        db: AsyncSession,
        purpose: str,
        patient_id: uuid.UUID,
        user_id: uuid.UUID,
        prescription_id: uuid.UUID | None = None,
        order_id: uuid.UUID | None = None,
        pharmacy_id: uuid.UUID | None = None,
        delivery_id: uuid.UUID | None = None,
        expires_in_minutes: int = 15,
        max_uses: int = 1,
        ip_address: str | None = None,
    ) -> dict:
        """Generate a fresh QR authorization token with server-side record."""
        resource_id = prescription_id or order_id or uuid.uuid4()

        # Generate short-lived JWT token
        jwt_token = QRPdfService.generate_dynamic_token(
            resource_id=resource_id,
            user_id=user_id,
            purpose=purpose,
            expires_in_minutes=expires_in_minutes,
        )

        token_hash = QRAuthorizationService._hash_token(jwt_token)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_in_minutes)

        # Create server-side token record
        token_record = QRAuthorizationToken(
            id=uuid.uuid4(),
            token_hash=token_hash,
            purpose=purpose,
            patient_id=patient_id,
            prescription_id=prescription_id,
            order_id=order_id,
            pharmacy_id=pharmacy_id,
            delivery_id=delivery_id,
            expires_at=expires_at,
            status=QRTokenStatus.ACTIVE,
            max_uses=max_uses,
            use_count=0,
            created_ip=ip_address,
        )
        db.add(token_record)
        await db.commit()
        await db.refresh(token_record)

        return {
            "token": jwt_token,
            "token_id": str(token_record.id),
            "expires_at": expires_at.isoformat(),
            "purpose": purpose,
            "qr_image_base64": None,  # Frontend can generate QR from token string
        }

    @staticmethod
    async def verify_token(
        db: AsyncSession,
        jwt_token: str,
        verifier_id: uuid.UUID,
        verifier_role: str,
        expected_purpose: str | None = None,
        expected_pharmacy_id: uuid.UUID | None = None,
    ) -> dict:
        """Full server-side verification of a QR token. Returns verification result."""
        from jose import jwt as jose_jwt, JWTError
        from app.core.config import settings

        # 1. Decode JWT
        try:
            payload = jose_jwt.decode(jwt_token, settings.SECRET_KEY, algorithms=["HS256"])
            purpose = payload.get("purpose", "PRESCRIPTION_ACCESS")
            resource_id = payload.get("sub")
            token_type = payload.get("type")

            if token_type not in ["rx_verify", "dynamic_qr"] or not resource_id:
                return {"valid": False, "error": "Invalid token payload"}
        except JWTError:
            return {"valid": False, "error": "Invalid or expired QR token"}

        # 2. Find server-side token record
        token_hash = QRAuthorizationService._hash_token(jwt_token)
        stmt = select(QRAuthorizationToken).where(
            QRAuthorizationToken.token_hash == token_hash
        )
        result = await db.execute(stmt)
        token_record = result.scalar_one_or_none()

        if not token_record:
            # Fallback: if token was generated before server-side storage existed (legacy)
            # Still verify via JWT only but log it
            return await QRAuthorizationService._legacy_verify(
                db, jwt_token, payload, purpose, resource_id, verifier_id
            )

        # 3. Server-side validation
        now = datetime.now(timezone.utc)

        if token_record.status == QRTokenStatus.REVOKED:
            return {"valid": False, "error": "QR token has been revoked"}

        if token_record.status == QRTokenStatus.USED:
            return {"valid": False, "error": "QR token has already been used"}

        if token_record.status == QRTokenStatus.EXPIRED:
            return {"valid": False, "error": "QR token has expired"}

        if now >= token_record.expires_at.replace(tzinfo=timezone.utc):
            token_record.status = QRTokenStatus.EXPIRED
            await db.commit()
            return {"valid": False, "error": "QR token has expired"}

        if token_record.revoked_at is not None:
            return {"valid": False, "error": "QR token has been revoked"}

        if token_record.use_count >= token_record.max_uses:
            token_record.status = QRTokenStatus.USED
            await db.commit()
            return {"valid": False, "error": "QR token usage limit reached"}

        if expected_purpose and token_record.purpose != expected_purpose:
            return {"valid": False, "error": f"Wrong QR purpose: expected {expected_purpose}"}

        # 4. Purpose-specific verification
        resource_uuid = uuid.UUID(resource_id)
        verification_data = {}

        if token_record.purpose == QRPurpose.PRESCRIPTION_ACCESS:
            verify_result = await QRAuthorizationService._verify_prescription(
                db, resource_uuid, expected_pharmacy_id
            )
            if not verify_result["valid"]:
                return verify_result
            verification_data = verify_result["data"]

        elif token_record.purpose == QRPurpose.IN_STORE_ORDER:
            verify_result = await QRAuthorizationService._verify_order(db, resource_uuid)
            if not verify_result["valid"]:
                return verify_result
            verification_data = verify_result["data"]

        # 5. Record verification
        token_record.use_count += 1
        token_record.verified_at = now
        if token_record.use_count >= token_record.max_uses:
            token_record.status = QRTokenStatus.USED
            token_record.used_at = now

        await db.commit()

        return {
            "valid": True,
            "purpose": token_record.purpose,
            "resource_id": resource_id,
            "data": verification_data,
            "token_created_at": token_record.created_at.isoformat() if token_record.created_at else None,
            "token_expires_at": token_record.expires_at.isoformat() if token_record.expires_at else None,
            "verified_at": now.isoformat(),
        }

    @staticmethod
    async def _verify_prescription(
        db: AsyncSession,
        prescription_id: uuid.UUID,
        pharmacy_id: uuid.UUID | None = None,
    ) -> dict:
        """Verify prescription exists, is valid, not expired, not revoked."""
        stmt = select(Prescription).where(Prescription.id == prescription_id)
        result = await db.execute(stmt)
        rx = result.scalar_one_or_none()

        if not rx:
            return {"valid": False, "error": "Prescription not found"}

        if rx.is_revoked:
            return {"valid": False, "error": "Prescription has been revoked"}

        if rx.expires_at:
            try:
                exp = rx.expires_at if isinstance(rx.expires_at, datetime) else datetime.fromisoformat(str(rx.expires_at).replace("Z", "+00:00"))
                if exp.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
                    return {"valid": False, "error": "Prescription has expired"}
            except (ValueError, TypeError):
                pass

        # Verify doctor is still active
        doc_stmt = select(User).where(User.id == rx.doctor_id)
        doc_result = await db.execute(doc_stmt)
        doctor = doc_result.scalar_one_or_none()
        if not doctor or doctor.status != UserStatus.ACTIVE:
            return {"valid": False, "error": "Prescribing doctor is no longer active"}

        # Get patient info
        patient_stmt = select(User).where(User.id == rx.patient_id)
        patient_result = await db.execute(patient_stmt)
        patient = patient_result.scalar_one_or_none()

        # Get doctor profile for name
        from app.models.doctor import Doctor
        from app.models.patient import Patient
        doc_profile_stmt = select(Doctor).where(Doctor.user_id == rx.doctor_id)
        doc_profile_result = await db.execute(doc_profile_stmt)
        doc_profile = doc_profile_result.scalar_one_or_none()

        patient_profile_stmt = select(Patient).where(Patient.user_id == rx.patient_id)
        patient_profile_result = await db.execute(patient_profile_stmt)
        patient_profile = patient_profile_result.scalar_one_or_none()

        return {
            "valid": True,
            "data": {
                "prescription_id": str(rx.id),
                "patient_id": str(rx.patient_id),
                "patient_name": patient_profile.full_name if patient_profile else "Unknown",
                "doctor_name": doc_profile.full_name if doc_profile else "Unknown",
                "doctor_specialization": doc_profile.specialization if doc_profile else None,
                "diagnosis": rx.diagnosis,
                "is_dispensed": rx.is_dispensed,
                "is_finalized": rx.is_finalized,
                "prescription_created_at": rx.created_at.isoformat() if rx.created_at else None,
                "prescription_expires_at": str(rx.expires_at) if rx.expires_at else None,
                "blockchain_status": rx.blockchain_status or "PENDING",
            },
        }

    @staticmethod
    async def _verify_order(db: AsyncSession, order_id: uuid.UUID) -> dict:
        stmt = select(MedicineOrder).where(MedicineOrder.id == order_id)
        result = await db.execute(stmt)
        order = result.scalar_one_or_none()
        if not order:
            return {"valid": False, "error": "Order not found"}
        return {
            "valid": True,
            "data": {
                "order_id": str(order.id),
                "status": order.status,
                "total_amount": order.total_amount,
            },
        }

    @staticmethod
    async def _legacy_verify(
        db: AsyncSession, jwt_token: str, payload: dict,
        purpose: str, resource_id: str, verifier_id: uuid.UUID
    ) -> dict:
        """Fallback verification for tokens generated before server-side storage."""
        resource_uuid = uuid.UUID(resource_id)
        if purpose == "PRESCRIPTION_ACCESS":
            result = await QRAuthorizationService._verify_prescription(db, resource_uuid)
            if result["valid"]:
                result["data"]["legacy_token"] = True
            return result
        return {"valid": True, "data": {"resource_id": resource_id, "legacy_token": True}}

    @staticmethod
    async def revoke_token(db: AsyncSession, token_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        stmt = select(QRAuthorizationToken).where(QRAuthorizationToken.id == token_id)
        result = await db.execute(stmt)
        token = result.scalar_one_or_none()
        if not token:
            return False
        if token.patient_id != user_id:
            return False
        token.status = QRTokenStatus.REVOKED
        token.revoked_at = datetime.now(timezone.utc)
        await db.commit()
        return True

    @staticmethod
    async def cleanup_expired_tokens(db: AsyncSession) -> int:
        """Delete expired or revoked QR authorization tokens older than 7 days past their expiry."""
        cutoff = datetime.now(timezone.utc) - timedelta(days=7)
        stmt = delete(QRAuthorizationToken).where(
            QRAuthorizationToken.expires_at < cutoff
        )
        result = await db.execute(stmt)
        await db.commit()
        return result.rowcount
