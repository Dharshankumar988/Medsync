import asyncio
import json
import sys
sys.path.append(".")
from fastapi.testclient import TestClient
from app.main import app
from app.dependencies.auth import require_admin
from app.schemas.session import AuthenticatedPrincipal
import uuid

# Mock the admin authentication dependency
def mock_require_admin():
    return AuthenticatedPrincipal(
        user_id=uuid.uuid4(),
        role="ADMIN",
        email="admin@medsync.com",
        is_verified=True
    )

app.dependency_overrides[require_admin] = mock_require_admin

client = TestClient(app)

endpoints = [
    "/api/v1/admin/dashboard",
    "/api/v1/admin/operations",
    "/api/v1/admin/security",
    "/api/v1/admin/ai",
    "/api/v1/admin/blockchain"
]

def test_all():
    print("Testing with mocked Admin auth...")
    for ep in endpoints:
        response = client.get(ep)
        if response.status_code == 200:
            print(f"PASS: {ep} - 200 OK")
            print(f"Data: {json.dumps(response.json(), indent=2)[:500]}...\n")
        else:
            print(f"FAIL: {ep} - {response.status_code} {response.text}\n")
            
    print("Testing unauthorized (auth removed)...")
    app.dependency_overrides = {}
    for ep in endpoints:
        response = client.get(ep)
        if response.status_code in (401, 403):
            print(f"PASS (Rejected): {ep} - {response.status_code}")
        else:
            print(f"FAIL (Did not reject): {ep} - {response.status_code}\n")

if __name__ == "__main__":
    test_all()
