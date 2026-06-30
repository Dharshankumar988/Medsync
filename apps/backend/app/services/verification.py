import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.verification import VerificationRequest, VerificationStatus
from app.models.user import User, UserStatus
from app.core.exceptions import NotFoundException, BadRequestException

class VerificationService:
    @staticmethod
    async def approve_request(db: AsyncSession, request_id: uuid.UUID, admin_id: uuid.UUID) -> VerificationRequest:
        stmt = select(VerificationRequest).where(VerificationRequest.id == request_id)
        result = await db.execute(stmt)
        req = result.scalar_one_or_none()
        
        if not req:
            raise NotFoundException("Verification request not found")
        
        if req.status == VerificationStatus.APPROVED:
            raise BadRequestException("Request is already approved")
            
        # Update verification request
        req.status = VerificationStatus.APPROVED
        req.reviewer_id = admin_id
        req.approval_date = datetime.now(timezone.utc)
        
        # Update user status to active
        user_stmt = select(User).where(User.id == req.user_id)
        user_result = await db.execute(user_stmt)
        user = user_result.scalar_one_or_none()
        
        if user:
            user.status = UserStatus.ACTIVE
            
        await db.commit()
        await db.refresh(req)
        
        return req

    @staticmethod
    async def reject_request(db: AsyncSession, request_id: uuid.UUID, admin_id: uuid.UUID, reason: str) -> VerificationRequest:
        stmt = select(VerificationRequest).where(VerificationRequest.id == request_id)
        result = await db.execute(stmt)
        req = result.scalar_one_or_none()
        
        if not req:
            raise NotFoundException("Verification request not found")
            
        if req.status == VerificationStatus.REJECTED:
            raise BadRequestException("Request is already rejected")
            
        req.status = VerificationStatus.REJECTED
        req.reviewer_id = admin_id
        req.review_date = datetime.now(timezone.utc)
        req.rejection_reason = reason
        
        await db.commit()
        await db.refresh(req)
        
        return req
