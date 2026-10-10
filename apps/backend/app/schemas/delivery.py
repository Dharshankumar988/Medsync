from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class WaypointLocation(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    lat: float
    lon: float
    cumulative_time: Optional[float] = None

class ActiveDeliveryItem(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    dispensing_log_id: str
    prescription_id: str
    pharmacy_id: str
    pharmacy_name: str
    delivery_status: str
    delivery_started_at: Optional[str] = None
    estimated_delivery_minutes: int = 10
    progress: int = 0
    route: Optional[Dict[str, Any]] = None
    current_location: Optional[Dict[str, Any]] = None

class DeliveryDetailData(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    dispensing_log_id: str
    prescription_id: str
    delivery_status: str
    delivery_started_at: Optional[str] = None
    delivery_completed_at: Optional[str] = None
    estimated_delivery_minutes: int = 10
    route: Optional[Dict[str, Any]] = None
    current_location: Optional[Dict[str, Any]] = None
