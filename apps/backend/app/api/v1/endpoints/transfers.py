import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, RoleChecker
from app.models.user import UserRole, User
from app.models.prescription_transfer import PrescriptionTransfer
from app.schemas.response import APIResponse
from pydantic import BaseModel

router = APIRouter()

class TransferSyncRequest(BaseModel):
    transfer_requests: List[Dict[str, Any]]
    
class TransferSyncResponse(BaseModel):
    synced_count: int
    failed_count: int
    errors: List[Dict[str, str]]

@router.post("/sync-transfers", response_model=APIResponse[TransferSyncResponse])
async def sync_transfers(
    req: TransferSyncRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Offline synchronization endpoint for prescription transfers.
    Provides idempotency guarantees.
    """
    if current_user.role.upper() not in [UserRole.PATIENT.value.upper(), UserRole.PHARMACY.value.upper()]:
        raise HTTPException(status_code=403, detail="Unauthorized role for sync-transfers.")
        
    from app.services.prescription_transfer_service import prescription_transfer_service
    
    synced_count = 0
    failed_count = 0
    errors = []
    
    for item in req.transfer_requests:
        try:
            action = item.get("action")
            transfer_id = item.get("transfer_id")
            transfer_request_id = item.get("transfer_request_id")
            
            if action == "CREATE":
                await prescription_transfer_service.create_transfer(
                    db=db,
                    patient_id=current_user.id if current_user.role.upper() == UserRole.PATIENT.value.upper() else uuid.UUID(item["patient_id"]),
                    pharmacy_id=uuid.UUID(item["pharmacy_id"]),
                    prescription_id=uuid.UUID(item["prescription_id"]),
                    transfer_request_id=transfer_request_id
                )
            elif action == "AUTHORIZE":
                if current_user.role.upper() != UserRole.PATIENT.value.upper():
                    raise ValueError("Only patients can authorize transfers.")
                    
                await prescription_transfer_service.authorize_transfer(
                    db=db,
                    transfer_id=uuid.UUID(transfer_id),
                    patient_id=current_user.id,
                    authorization_reference=item["authorization_reference"]
                )
            elif action == "COMPLETE":
                if current_user.role.upper() != UserRole.PHARMACY.value.upper():
                    raise ValueError("Only pharmacies can complete transfers.")
                    
                await prescription_transfer_service.complete_transfer(
                    db=db,
                    transfer_id=uuid.UUID(transfer_id),
                    pharmacy_id=current_user.id
                )
            else:
                raise ValueError(f"Unknown action: {action}")
                
            synced_count += 1
            
        except Exception as e:
            failed_count += 1
            errors.append({
                "transfer_request_id": item.get("transfer_request_id", "unknown"),
                "error": str(e)
            })
            
    return APIResponse(
        message="Sync completed", 
        data=TransferSyncResponse(
            synced_count=synced_count, 
            failed_count=failed_count, 
            errors=errors
        )
    )
