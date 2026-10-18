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

