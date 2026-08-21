import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.schemas.session import AuthenticatedPrincipal
from app.services.fhir_service import FHIRService
from app.schemas.fhir import (
    Patient, Practitioner, Organization, Appointment,
    Medication, MedicationRequest, MedicationDispense,
    DocumentReference, Bundle
)
from app.core.exceptions import NotFoundException, ForbiddenException

router = APIRouter()

def get_fhir_service(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedPrincipal = Depends(get_current_user)
) -> FHIRService:
    return FHIRService(db=db, current_user=current_user)

@router.get("/Patient/{patient_id}", response_model=Patient, response_model_exclude_none=True)
async def get_patient(
    patient_id: uuid.UUID,
    service: FHIRService = Depends(get_fhir_service)
):
    try:
        return await service.get_patient(patient_id)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ForbiddenException as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.get("/Practitioner/{practitioner_id}", response_model=Practitioner, response_model_exclude_none=True)
async def get_practitioner(
    practitioner_id: uuid.UUID,
    service: FHIRService = Depends(get_fhir_service)
):
    try:
        return await service.get_practitioner(practitioner_id)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/Organization/{org_id}", response_model=Organization, response_model_exclude_none=True)
async def get_organization(
    org_id: uuid.UUID,
    service: FHIRService = Depends(get_fhir_service)
):
    try:
        return await service.get_organization(org_id)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/Appointment/{appointment_id}", response_model=Appointment, response_model_exclude_none=True)
async def get_appointment(
    appointment_id: uuid.UUID,
    service: FHIRService = Depends(get_fhir_service)
):
    try:
        return await service.get_appointment(appointment_id)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ForbiddenException as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.get("/Medication/{medication_id}", response_model=Medication, response_model_exclude_none=True)
async def get_medication(
    medication_id: uuid.UUID,
    service: FHIRService = Depends(get_fhir_service)
):
    try:
        return await service.get_medication(medication_id)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/MedicationRequest/{request_id}", response_model=MedicationRequest, response_model_exclude_none=True)
async def get_medication_request(
    request_id: uuid.UUID,
    service: FHIRService = Depends(get_fhir_service)
):
    try:
        return await service.get_medication_request(request_id)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ForbiddenException as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.get("/MedicationDispense/{dispense_id}", response_model=MedicationDispense, response_model_exclude_none=True)
async def get_medication_dispense(
    dispense_id: uuid.UUID,
    service: FHIRService = Depends(get_fhir_service)
):
    try:
        return await service.get_medication_dispense(dispense_id)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ForbiddenException as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.get("/DocumentReference/{document_id}", response_model=DocumentReference, response_model_exclude_none=True)
async def get_document_reference(
    document_id: uuid.UUID,
    service: FHIRService = Depends(get_fhir_service)
):
    try:
        return await service.get_document_reference(document_id)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ForbiddenException as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.get("/Bundle", response_model=Bundle, response_model_exclude_none=True)
async def get_patient_bundle(
    patient: uuid.UUID,
    service: FHIRService = Depends(get_fhir_service)
):
    try:
        return await service.get_patient_bundle(patient)
    except ForbiddenException as e:
        raise HTTPException(status_code=403, detail=str(e))
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
