import hashlib
import json
from typing import Dict, Any

def generate_canonical_hash(payload: Dict[str, Any]) -> str:
    """
    Generates a deterministic SHA-256 hash for a dictionary payload.
    sort_keys=True ensures that identical data always produces the same hash
    regardless of dictionary insertion order.
    """
    # separators removes whitespace to ensure consistent string representation
    json_data = json.dumps(payload, sort_keys=True, separators=(',', ':')).encode('utf-8')
    return hashlib.sha256(json_data).hexdigest()

def build_prescription_payload(doctor_id: str, patient_id: str, diagnosis: str, items: list) -> Dict[str, Any]:
    """
    Builds a deterministic canonical payload for an internal prescription.
    """
    # Deterministically order items by medicine_name to prevent reordering attacks
    sorted_items = sorted(items, key=lambda x: str(x.get('medicine_name', '')))
    
    clean_items = []
    for item in sorted_items:
        clean_items.append({
            "medicine_name": str(item.get("medicine_name", "")),
            "dosage": str(item.get("dosage", "")),
            "frequency": str(item.get("frequency", "")),
            "duration_days": int(item.get("duration_days", 0)),
        })
        
    return {
        "type": "INTERNAL",
        "doctor_id": str(doctor_id),
        "patient_id": str(patient_id),
        "diagnosis": str(diagnosis or ""),
        "items": clean_items
    }

def build_offline_prescription_payload(doctor_id: str, patient_id: str, original_file_hash: str) -> Dict[str, Any]:
    """
    Builds a deterministic canonical payload for an external/offline prescription.
    """
    return {
        "type": "EXTERNAL",
        "doctor_id": str(doctor_id),
        "patient_id": str(patient_id),
        "original_file_hash": str(original_file_hash)
    }
