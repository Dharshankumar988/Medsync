import hashlib
import json

def generate_prescription_hash(prescription_data: dict) -> str:
    """
    Generates a deterministic SHA-256 hash for a prescription object.
    sort_keys=True ensures that identical data always produces the same hash
    regardless of dictionary insertion order.
    """
    # Create a copy and remove any volatile fields (like registered_at)
    # before hashing if needed, though usually we hash the core data.
    clean_data = {
        "prescription_id": str(prescription_data.get("prescription_id")),
        "patient_id": str(prescription_data.get("patient_id")),
        "doctor_id": str(prescription_data.get("doctor_id")),
        "diagnosis": prescription_data.get("diagnosis"),
        "items": prescription_data.get("items", [])
    }
    
    json_data = json.dumps(clean_data, sort_keys=True).encode('utf-8')
    return hashlib.sha256(json_data).hexdigest()
