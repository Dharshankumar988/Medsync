from typing import Optional, Any
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

class GraphNodeEntityData(BaseModel):
    """Strongly-typed entity metadata payload attached to a graph node."""
    model_config = ConfigDict(extra="allow", use_enum_values=True)

    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    bloodGroup: Optional[str] = None
    specialization: Optional[str] = None
    licenseNumber: Optional[str] = None
    clinicName: Optional[str] = None
    clinicAddress: Optional[str] = None
    experience: Optional[int] = None
    consultationFee: Optional[int] = None
    operatingHours: Optional[str] = None
    is24x7: Optional[bool] = None
    type: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    isVerified: Optional[bool] = None
    googleMapsLink: Optional[str] = None

class GraphNode(BaseModel):
    """Schema for an individual node in the relationship graph."""
    model_config = ConfigDict(use_enum_values=True)

    id: str
    label: str
    type: str
    hasError: bool = False
    details: Optional[str] = None
    isCentral: bool = False
    entityData: Optional[GraphNodeEntityData] = None

class GraphEdge(BaseModel):
    """Schema for a directional relationship edge between two nodes."""
    model_config = ConfigDict(use_enum_values=True)

    source: str
    target: str
    type: str

class RelationshipGraphResponse(BaseModel):
    """Schema for the full relationship graph payload."""
    model_config = ConfigDict(use_enum_values=True)

    nodes: list[GraphNode] = Field(default_factory=list)
    links: list[GraphEdge] = Field(default_factory=list)

class PatientAdminListItem(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    id: str
    user_id: str
    full_name: str
    email: Optional[str] = None
    date_of_birth: Optional[str] = None
    blood_group: Optional[str] = None
    gender: Optional[str] = None
    created_at: str
    phone_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_number: Optional[str] = None
    allergies: Optional[str] = None
    chronic_diseases: Optional[str] = None
    medical_alerts: Optional[str] = None
    status: Optional[str] = "active"

class AdminUserListItem(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    user_id: str
    email: str
    status: str
    created_at: str

class AdminSettingsResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    maintenance_mode: bool = False
    strict_verification: bool = True
    active_backend_mode: str = "render"
    portable_tunnel_url: Optional[str] = "https://entangled-dealmaker-storable.ngrok-free.dev"
    rag_worker_url: Optional[str] = "https://entangled-dealmaker-storable.ngrok-free.dev"
    auto_failover: bool = True
    render_url: str = "https://medsync-backend-rktc.onrender.com"

class AdminSettingsUpdatePayload(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    maintenance_mode: Optional[bool] = None
    strict_verification: Optional[bool] = None
    active_backend_mode: Optional[str] = None
    portable_tunnel_url: Optional[str] = None
    rag_worker_url: Optional[str] = None
    auto_failover: Optional[bool] = None

class AdminContractDetail(BaseModel):
    name: str
    address: str
    health: str
    explorer_url: str

    model_config = ConfigDict(use_enum_values=True)

class AdminTxInfo(BaseModel):
    hash: str
    from_address: str = Field(alias="from")
    status: str
    network: str
    explorer_url: Optional[str] = None

    model_config = ConfigDict(use_enum_values=True, populate_by_name=True)

class AdminBlockchainOverview(BaseModel):
    status: str
    nodes: int
    latest_block: int
    chain_id: int
    wallet_address: str
    wallet_balance_eth: Optional[float] = None
    gas_price_gwei: Optional[float] = None
    network_name: str
    rpc_url: Optional[str] = None
    contracts: list[AdminContractDetail] = Field(default_factory=list)
    transactions: list[AdminTxInfo] = Field(default_factory=list)
    mismatches: int = 0
    explorer_base: str = "https://amoy.polygonscan.com"

    model_config = ConfigDict(use_enum_values=True)


class InlineFacilityCreate(BaseModel):
    """Payload for inline creation of a hospital or clinic while registering a doctor."""
    model_config = ConfigDict(use_enum_values=True)

    name: str
    type: str = "hospital"  # "hospital" or "clinic"
    address: str
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    google_maps_url: Optional[str] = None


class AdminDoctorCreate(BaseModel):
    """Payload for creating a verified doctor, optionally under an existing or new facility."""
    model_config = ConfigDict(use_enum_values=True)

    email: str
    password: str
    full_name: str
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    hospital_id: Optional[str] = None
    experience_years: Optional[int] = 0
    consultation_fee: Optional[int] = 0
    clinic_phone: Optional[str] = None
    new_facility: Optional[InlineFacilityCreate] = None


class AdminDoctorCreateResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    id: str
    user_id: str
    email: str
    full_name: str
    hospital_id: Optional[str] = None
    hospital_name: Optional[str] = None
    clinic_name: Optional[str] = None
    facility_type: Optional[str] = None


class AdminDoctorListItem(BaseModel):
    """Schema for doctor items returned in admin user management."""
    model_config = ConfigDict(use_enum_values=True)

    id: str
    user_id: str
    full_name: str
    email: Optional[str] = None
    license_number: Optional[str] = None
    specialization: Optional[str] = None
    experience_years: Optional[int] = 0
    consultation_fee: Optional[int] = 0
    hospital_id: Optional[str] = None
    hospital_name: Optional[str] = None
    clinic_name: Optional[str] = None
    facility_type: Optional[str] = None
    doctor_status: Optional[str] = None
    status: Optional[str] = "ACTIVE"
    is_verified: bool = True
    created_at: str


class AdminPharmacyCreate(BaseModel):
    """Payload for creating a verified pharmacy under an admin."""
    model_config = ConfigDict(use_enum_values=True)

    business_name: str
    license_number: str
    address: str
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    contact_number: Optional[str] = None
    email: str
    password: Optional[str] = "Pharmacy@123"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    hospital_id: Optional[str] = None
    clinic_name: Optional[str] = None


class AdminPharmacyCreateResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    pharmacy_id: str
    user_id: str


class AdminPharmacyListItem(BaseModel):
    """Schema for pharmacy items returned in admin user management."""
    model_config = ConfigDict(use_enum_values=True)

    id: str
    user_id: str
    business_name: str
    license_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None
    hospital_id: Optional[str] = None
    clinic_name: Optional[str] = None
    status: Optional[str] = "ACTIVE"
    is_verified: bool = True
    created_at: Optional[str] = None


class UpdateUserStatusRequest(BaseModel):
    """Payload to update/suspend/activate a user."""
    model_config = ConfigDict(use_enum_values=True)
    status: str

class UpdateUserStatusResponseData(BaseModel):
    """Response payload for user status updates."""
    model_config = ConfigDict(use_enum_values=True)
    user_id: str
    status: str

class AdminActionResponseData(BaseModel):
    """Generic typed response payload for admin mutations (approve, reject, delete, reset)."""
    model_config = ConfigDict(use_enum_values=True)
    success: bool = True
    message: Optional[str] = None
    id: Optional[str] = None


class PendingVerificationProfile(BaseModel):
    """Doctor or Pharmacy profile metadata in pending verification list."""
    model_config = ConfigDict(extra="allow", use_enum_values=True)

    full_name: Optional[str] = None
    specialization: Optional[str] = None
    experience_years: Optional[int] = None
    qualifications: Optional[str] = None
    license_number: Optional[str] = None
    gst_number: Optional[str] = None
    medical_council_reg_number: Optional[str] = None
    practice_type: Optional[str] = None
    clinic_info: Optional[dict] = None
    applied_hospital_info: Optional[dict] = None
    hospital_name: Optional[str] = None
    hospital_address: Optional[str] = None
    clinic_name: Optional[str] = None
    clinic_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    consultation_fee: Optional[int] = None
    clinic_phone: Optional[str] = None
    business_name: Optional[str] = None
    address: Optional[str] = None
    contact_number: Optional[str] = None


class PendingFacilityDetails(BaseModel):
    """Workplace practice facility metadata for doctor affiliation verifications."""
    model_config = ConfigDict(extra="allow", use_enum_values=True)

    id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None
    working_days: Optional[str] = None
    consultation_hours: Optional[str] = None
    is_primary: Optional[bool] = False


class PendingVerificationItem(BaseModel):
    """Item schema for all pending verifications (signups and doctor workplace affiliations)."""
    model_config = ConfigDict(extra="allow", use_enum_values=True)

    request_id: str
    user_id: str
    email: str
    role: str
    verification_type: str = "REGISTRATION"  # "REGISTRATION" | "WORKPLACE_AFFILIATION"
    created_at: str
    profile: Optional[PendingVerificationProfile] = None
    facility: Optional[PendingFacilityDetails] = None
    location_id: Optional[str] = None

