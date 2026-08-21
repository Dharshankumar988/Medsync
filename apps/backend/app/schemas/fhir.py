from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

class FHIRResource(BaseModel):
    id: str
    resourceType: str
    
class Identifier(BaseModel):
    system: Optional[str] = None
    value: Optional[str] = None
    
class CodeableConcept(BaseModel):
    text: Optional[str] = None
    coding: Optional[List[Dict[str, Any]]] = None

class Reference(BaseModel):
    reference: Optional[str] = None
    display: Optional[str] = None

class HumanName(BaseModel):
    text: Optional[str] = None
    family: Optional[str] = None
    given: Optional[List[str]] = None

class ContactPoint(BaseModel):
    system: Optional[str] = None
    value: Optional[str] = None
    use: Optional[str] = None

class Address(BaseModel):
    text: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postalCode: Optional[str] = None
    country: Optional[str] = None

class Patient(FHIRResource):
    resourceType: str = "Patient"
    identifier: Optional[List[Identifier]] = None
    name: Optional[List[HumanName]] = None
    telecom: Optional[List[ContactPoint]] = None
    gender: Optional[str] = None
    birthDate: Optional[str] = None
    address: Optional[List[Address]] = None

class Practitioner(FHIRResource):
    resourceType: str = "Practitioner"
    identifier: Optional[List[Identifier]] = None
    name: Optional[List[HumanName]] = None
    telecom: Optional[List[ContactPoint]] = None
    address: Optional[List[Address]] = None
    qualification: Optional[List[Dict[str, Any]]] = None

class Organization(FHIRResource):
    resourceType: str = "Organization"
    identifier: Optional[List[Identifier]] = None
    name: Optional[str] = None
    telecom: Optional[List[ContactPoint]] = None
    address: Optional[List[Address]] = None

class Location(FHIRResource):
    resourceType: str = "Location"
    name: Optional[str] = None
    address: Optional[Address] = None

class Appointment(FHIRResource):
    resourceType: str = "Appointment"
    status: str
    description: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None
    participant: List[Dict[str, Any]]

class Encounter(FHIRResource):
    resourceType: str = "Encounter"
    status: str
    class_: Optional[CodeableConcept] = Field(None, alias="class")
    subject: Optional[Reference] = None
    participant: Optional[List[Dict[str, Any]]] = None
    period: Optional[Dict[str, str]] = None
    reasonCode: Optional[List[CodeableConcept]] = None

class Condition(FHIRResource):
    resourceType: str = "Condition"
    clinicalStatus: Optional[CodeableConcept] = None
    verificationStatus: Optional[CodeableConcept] = None
    code: Optional[CodeableConcept] = None
    subject: Reference
    encounter: Optional[Reference] = None
    recordedDate: Optional[str] = None
    recorder: Optional[Reference] = None

class Observation(FHIRResource):
    resourceType: str = "Observation"
    status: str
    code: CodeableConcept
    subject: Reference
    encounter: Optional[Reference] = None
    effectiveDateTime: Optional[str] = None
    performer: Optional[List[Reference]] = None
    valueQuantity: Optional[Dict[str, Any]] = None
    valueString: Optional[str] = None

class DiagnosticReport(FHIRResource):
    resourceType: str = "DiagnosticReport"
    status: str
    code: CodeableConcept
    subject: Reference
    encounter: Optional[Reference] = None
    effectiveDateTime: Optional[str] = None
    issued: Optional[str] = None
    performer: Optional[List[Reference]] = None
    result: Optional[List[Reference]] = None
    conclusion: Optional[str] = None

class ImagingStudy(FHIRResource):
    resourceType: str = "ImagingStudy"
    status: str
    subject: Reference
    encounter: Optional[Reference] = None
    started: Optional[str] = None
    numberOfSeries: Optional[int] = None
    numberOfInstances: Optional[int] = None
    description: Optional[str] = None

class AllergyIntolerance(FHIRResource):
    resourceType: str = "AllergyIntolerance"
    clinicalStatus: Optional[CodeableConcept] = None
    verificationStatus: Optional[CodeableConcept] = None
    code: Optional[CodeableConcept] = None
    patient: Reference
    encounter: Optional[Reference] = None
    recordedDate: Optional[str] = None
    recorder: Optional[Reference] = None
    reaction: Optional[List[Dict[str, Any]]] = None

class Procedure(FHIRResource):
    resourceType: str = "Procedure"
    status: str
    code: Optional[CodeableConcept] = None
    subject: Reference
    encounter: Optional[Reference] = None
    performedDateTime: Optional[str] = None
    performer: Optional[List[Dict[str, Any]]] = None

class Medication(FHIRResource):
    resourceType: str = "Medication"
    code: Optional[CodeableConcept] = None
    form: Optional[CodeableConcept] = None
    ingredient: Optional[List[Dict[str, Any]]] = None
    batch: Optional[Dict[str, str]] = None

class MedicationRequest(FHIRResource):
    resourceType: str = "MedicationRequest"
    status: str
    intent: str
    medicationReference: Optional[Reference] = None
    medicationCodeableConcept: Optional[CodeableConcept] = None
    subject: Reference
    encounter: Optional[Reference] = None
    authoredOn: Optional[str] = None
    requester: Optional[Reference] = None
    dosageInstruction: Optional[List[Dict[str, Any]]] = None
    dispenseRequest: Optional[Dict[str, Any]] = None

class MedicationDispense(FHIRResource):
    resourceType: str = "MedicationDispense"
    status: str
    medicationReference: Optional[Reference] = None
    medicationCodeableConcept: Optional[CodeableConcept] = None
    subject: Optional[Reference] = None
    performer: Optional[List[Dict[str, Any]]] = None
    authorizingPrescription: Optional[List[Reference]] = None
    quantity: Optional[Dict[str, Any]] = None
    daysSupply: Optional[Dict[str, Any]] = None
    whenPrepared: Optional[str] = None
    whenHandedOver: Optional[str] = None

class Consent(FHIRResource):
    resourceType: str = "Consent"
    status: str
    scope: CodeableConcept
    category: List[CodeableConcept]
    patient: Optional[Reference] = None
    dateTime: Optional[str] = None
    performer: Optional[List[Reference]] = None
    organization: Optional[List[Reference]] = None
    policy: Optional[List[Dict[str, Any]]] = None
    provision: Optional[Dict[str, Any]] = None

class Provenance(FHIRResource):
    resourceType: str = "Provenance"
    target: List[Reference]
    recorded: str
    activity: Optional[CodeableConcept] = None
    agent: List[Dict[str, Any]]

class AuditEvent(FHIRResource):
    resourceType: str = "AuditEvent"
    type: CodeableConcept
    action: Optional[str] = None
    recorded: str
    outcome: Optional[str] = None
    outcomeDesc: Optional[str] = None
    agent: List[Dict[str, Any]]
    source: Dict[str, Any]
    entity: Optional[List[Dict[str, Any]]] = None

class DocumentReference(FHIRResource):
    resourceType: str = "DocumentReference"
    status: str
    type: Optional[CodeableConcept] = None
    category: Optional[List[CodeableConcept]] = None
    subject: Optional[Reference] = None
    date: Optional[str] = None
    author: Optional[List[Reference]] = None
    authenticator: Optional[Reference] = None
    content: List[Dict[str, Any]]

class BundleEntry(BaseModel):
    fullUrl: Optional[str] = None
    resource: Any

class Bundle(FHIRResource):
    resourceType: str = "Bundle"
    type: str = "collection"
    entry: Optional[List[BundleEntry]] = None
