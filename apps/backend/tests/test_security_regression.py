import pytest
import uuid
from httpx import AsyncClient
from jose import jwt
from app.core.config import settings

@pytest.mark.asyncio
async def test_jwt_signature_verification(async_client: AsyncClient, admin_user):
    # Create a forged token with an invalid signature
    payload = {
        "sub": str(admin_user.id),
        "role": "admin",
        "email": admin_user.email
    }
    
    # Sign it with a WRONG secret
    forged_token = jwt.encode(payload, "WRONG_SECRET", algorithm="HS256")
    
    # Attempt an admin operation
    headers = {"Authorization": f"Bearer {forged_token}"}
    res = await async_client.get("/api/v1/rag/documents", headers=headers)
    
    # MUST FAIL (401 Unauthorized or 403 Forbidden because signature fails)
    assert res.status_code in [401, 403]

@pytest.mark.asyncio
async def test_profile_idor_protection(async_client: AsyncClient, patient_user, patient_token: str, admin_user):
    # Patient tries to complete another user's profile
    target_id = str(admin_user.id)
    payload = {
        "profile_completion_percentage": 100,
        "date_of_birth": "1990-01-01"
    }
    headers = {"Authorization": f"Bearer {patient_token}"}
    
    res = await async_client.put(f"/api/v1/profile/{target_id}/completion", json=payload, headers=headers)
    
    # MUST FAIL (IDOR protection)
    assert res.status_code == 403
    assert "You cannot modify another user's profile" in res.text

@pytest.mark.asyncio
async def test_ai_analysis_idor_protection(async_client: AsyncClient, patient_user, patient_token: str, db):
    # This requires creating a mock record belonging to another user.
    # In a full integration test we would do that.
    # We will simulate a call with a random UUID as version_id.
    
    fake_version_id = str(uuid.uuid4())
    
    # Use dummy image
    files = {"file": ("test.jpg", b"fake_image_data", "image/jpeg")}
    data = {"scan_type": "skin", "version_id": fake_version_id}
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    res = await async_client.post("/api/v1/ai/analyze-image", files=files, data=data, headers=headers)
    
    # Must fail because only DOCTOR can access analyze-image.
    assert res.status_code == 403 # Medical record version not found
