import hmac
import hashlib
import base64
import json
import time
import secrets
from typing import Optional, Tuple, Dict, Any
from app.core.config import settings

# In-memory store for consumed nonces to prevent token reuse
_consumed_nonces: set[str] = set()

def create_patient_reset_token(email: str, expire_minutes: int = 5) -> str:
    """
    Creates a cryptographically signed password reset token for a Patient account.
    Strictly expires in `expire_minutes` (default 5 minutes).
    """
    now = int(time.time())
    exp = now + (expire_minutes * 60)
    nonce = secrets.token_hex(16)
    
    payload: Dict[str, Any] = {
        "email": email.strip().lower(),
        "role": "PATIENT",
        "iat": now,
        "exp": exp,
        "nonce": nonce,
    }
    
    payload_json = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    payload_b64 = base64.urlsafe_b64encode(payload_json).decode('utf-8').rstrip('=')
    
    secret_key = (settings.SECRET_KEY or "medsync-patient-reset-secret-key-2026").encode('utf-8')
    signature = hmac.new(secret_key, payload_b64.encode('utf-8'), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode('utf-8').rstrip('=')
    
    return f"{payload_b64}.{sig_b64}"


def verify_patient_reset_token(token: str) -> Tuple[bool, Optional[str], Optional[str], int]:
    """
    Verifies that a reset token:
    1. Has a valid HMAC-SHA256 signature
    2. Was issued specifically for the PATIENT role
    3. Has not expired (5-minute window)
    4. Has not already been consumed/reused
    
    Returns: (is_valid, email, error_message, remaining_seconds)
    """
    if not token or "." not in token:
        return False, None, "Malformed or missing password reset token.", 0
        
    parts = token.split(".")
    if len(parts) != 2:
        return False, None, "Invalid reset token format.", 0
        
    payload_b64, sig_b64 = parts[0], parts[1]
    secret_key = (settings.SECRET_KEY or "medsync-patient-reset-secret-key-2026").encode('utf-8')
    
    # Verify signature
    expected_sig = hmac.new(secret_key, payload_b64.encode('utf-8'), hashlib.sha256).digest()
    expected_sig_b64 = base64.urlsafe_b64encode(expected_sig).decode('utf-8').rstrip('=')
    
    if not hmac.compare_digest(sig_b64, expected_sig_b64):
        return False, None, "Invalid token signature or token has been tampered with.", 0
        
    try:
        # Pad payload if needed
        padding = 4 - (len(payload_b64) % 4)
        if padding < 4:
            payload_b64 += "=" * padding
            
        payload_bytes = base64.urlsafe_b64decode(payload_b64.encode('utf-8'))
        payload = json.loads(payload_bytes.decode('utf-8'))
    except Exception:
        return False, None, "Failed to decode password reset token payload.", 0
        
    role = str(payload.get("role", "")).upper()
    if role != "PATIENT":
        return False, None, "Password reset is only authorized for Patient accounts.", 0
        
    now = int(time.time())
    exp = int(payload.get("exp", 0))
    
    if now > exp:
        return False, None, "Password reset link has expired after 5 minutes. Please request a new link.", 0
        
    nonce = payload.get("nonce", "")
    if nonce in _consumed_nonces:
        return False, None, "This password reset link has already been used.", 0
        
    email = payload.get("email")
    remaining_seconds = max(0, exp - now)
    return True, email, None, remaining_seconds


def consume_patient_reset_token(token: str) -> bool:
    """
    Marks a token nonce as consumed so it cannot be used a second time.
    """
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return False
            
        payload_b64 = parts[0]
        padding = 4 - (len(payload_b64) % 4)
        if padding < 4:
            payload_b64 += "=" * padding
            
        payload_bytes = base64.urlsafe_b64decode(payload_b64.encode('utf-8'))
        payload = json.loads(payload_bytes.decode('utf-8'))
        nonce = payload.get("nonce")
        if nonce:
            _consumed_nonces.add(nonce)
            return True
        return False
    except Exception:
        return False
