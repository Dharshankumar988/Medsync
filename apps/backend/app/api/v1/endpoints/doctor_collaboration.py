import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import UserRole
from app.schemas.response import APIResponse
from app.schemas.session import AuthenticatedPrincipal
from app.schemas.collaboration import (
    RecordRequestCreate,
    RecordRequestResponse,
    DoctorReferralCreate,
    DoctorReferralResponse,
    DoctorDirectoryItem,
)
from app.services.doctor_collaboration_service import DoctorCollaborationService

router = APIRouter()
require_doctor = RoleChecker([UserRole.DOCTOR])


# ─── Record Requests ──────────────────────────────────────────────

@router.post(
    "/record-requests",
    response_model=APIResponse[RecordRequestResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_record_request(
    req: RecordRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor),
):
    result = await DoctorCollaborationService.create_record_request(db, current_user.id, req)
    return APIResponse(message="Record request submitted successfully", data=result)


@router.get(
    "/record-requests/incoming",
    response_model=APIResponse[List[RecordRequestResponse]],
)
async def list_incoming_record_requests(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor),
):
    results = await DoctorCollaborationService.list_incoming_record_requests(db, current_user.id)
    return APIResponse(message="Incoming record requests fetched", data=results)


@router.get(
    "/record-requests/outgoing",
    response_model=APIResponse[List[RecordRequestResponse]],
)
async def list_outgoing_record_requests(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor),
):
    results = await DoctorCollaborationService.list_outgoing_record_requests(db, current_user.id)
    return APIResponse(message="Outgoing record requests fetched", data=results)


@router.post(
    "/record-requests/{request_id}/approve",
    response_model=APIResponse[RecordRequestResponse],
)
async def approve_record_request(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor),
):
    result = await DoctorCollaborationService.approve_record_request(db, request_id, current_user.id)
    return APIResponse(message="Record request approved and access granted", data=result)


@router.post(
    "/record-requests/{request_id}/reject",
    response_model=APIResponse[RecordRequestResponse],
)
async def reject_record_request(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor),
):
    result = await DoctorCollaborationService.reject_record_request(db, request_id, current_user.id)
    return APIResponse(message="Record request declined", data=result)


# ─── Doctor Referrals ─────────────────────────────────────────────

@router.post(
    "/referrals",
    response_model=APIResponse[DoctorReferralResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_referral(
    req: DoctorReferralCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor),
):
    result = await DoctorCollaborationService.create_referral(db, current_user.id, req)
    return APIResponse(message="Referral submitted successfully", data=result)


@router.get(
    "/referrals/incoming",
    response_model=APIResponse[List[DoctorReferralResponse]],
)
async def list_incoming_referrals(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor),
):
    results = await DoctorCollaborationService.list_incoming_referrals(db, current_user.id)
    return APIResponse(message="Incoming referrals fetched", data=results)


@router.get(
    "/referrals/outgoing",
    response_model=APIResponse[List[DoctorReferralResponse]],
)
async def list_outgoing_referrals(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor),
):
    results = await DoctorCollaborationService.list_outgoing_referrals(db, current_user.id)
    return APIResponse(message="Outgoing referrals fetched", data=results)


@router.post(
    "/referrals/{referral_id}/accept",
    response_model=APIResponse[DoctorReferralResponse],
)
async def accept_referral(
    referral_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor),
):
    result = await DoctorCollaborationService.accept_referral(db, referral_id, current_user.id)
    return APIResponse(message="Referral accepted and patient records linked", data=result)


@router.post(
    "/referrals/{referral_id}/decline",
    response_model=APIResponse[DoctorReferralResponse],
)
async def decline_referral(
    referral_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor),
):
    result = await DoctorCollaborationService.decline_referral(db, referral_id, current_user.id)
    return APIResponse(message="Referral declined", data=result)


# ─── Doctor Directory ─────────────────────────────────────────────

@router.get(
    "/directory",
    response_model=APIResponse[List[DoctorDirectoryItem]],
)
async def list_doctor_directory(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(require_doctor),
):
    results = await DoctorCollaborationService.list_doctors_directory(db, exclude_user_id=current_user.id)
    return APIResponse(message="Doctor directory retrieved", data=results)
