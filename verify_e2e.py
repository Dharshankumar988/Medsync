import asyncio
import os
import sys
import uuid
import json
from typing import Dict, Any, List

import numpy as np

# Mocking external dependencies before importing app modules
import sys
from unittest.mock import MagicMock, patch

# Set required environment variables
os.environ["BIOMETRIC_ENCRYPTION_KEY"] = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
os.environ["FACE_MATCH_THRESHOLD"] = "0.60"
os.environ["FACE_VERIFICATION_URL"] = "http://localhost:8080"
os.environ["FACE_VERIFICATION_AUTH_TOKEN"] = "dummy_token"

# Now import the services
sys.path.append(os.path.join(os.path.dirname(__file__), "apps", "backend"))
from app.services.face_auth_service import FaceAuthenticationService
from app.services.security_service import validate_patient_pin, SecurityService
from app.models.security import PatientSecurityCredential
from passlib.context import CryptContext

# 1. FACE AUTH TEST & 3. Remote VERIFICATION
def test_face_auth():
    print("\n--- Testing Face Auth via Remote Client ---")
    service = FaceAuthenticationService()
    
    with patch("app.services.face_auth_service.httpx.Client") as mock_client_class:
        mock_client = mock_client_class.return_value.__enter__.return_value
        
        # Test Enrollment
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"embedding": np.random.rand(512).tolist()}
        mock_client.post.return_value = mock_response
        
        # Write dummy file
        with open("dummy.jpg", "wb") as f:
            f.write(b"dummy image data")
            
        try:
            enc_template = service.enroll_patient(["dummy.jpg"])
            print("Enrollment PASS. Template generated.")
        except Exception as e:
            print(f"Enrollment FAILED: {e}")
            
        # Test Verification (Same Face)
        mock_response.json.return_value = {"verified": True, "score": 0.99, "threshold": 0.45}
        res = service.verify_patient(enc_template, "dummy.jpg")
        print(f"Verification (Same Face) PASS? {res}")
        
        # Test Verification (Different Face)
        mock_response.json.return_value = {"verified": False, "score": 0.20, "threshold": 0.45}
        res = service.verify_patient(enc_template, "dummy.jpg")
        print(f"Verification (Different Face) REJECTED? {not res}")
        
        # Test Fail-Closed (Service 500 Error)
        mock_response.status_code = 500
        mock_response.json.return_value = {"error": "INTERNAL_SERVER_ERROR"}
        res = service.verify_patient(enc_template, "dummy.jpg")
        print(f"Verification (Service 500) REJECTED (Fail Closed)? {not res}")
        
        # Test Fail-Closed (Multiple Faces)
        mock_response.status_code = 200
        mock_response.json.return_value = {"error": "MULTIPLE_FACES"}
        res = service.verify_patient(enc_template, "dummy.jpg")
        print(f"Verification (Multiple Faces) REJECTED (Fail Closed)? {not res}")
        
        # Clean up
        if os.path.exists("dummy.jpg"):
            os.remove("dummy.jpg")
            
# 4. PIN TEST
def test_pin():
    print("\n--- Testing PIN ---")
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    test_hash = pwd_context.hash("123456")
    
    cred = PatientSecurityCredential(
        id=uuid.uuid4(),
        patient_id=uuid.uuid4(),
        authorization_pin_hash=test_hash,
        failed_attempts=0,
        is_active=True
    )
    
    class MockResult:
        def scalar_one_or_none(self):
            return cred
            
    class MockDB:
        async def execute(self, stmt):
            return MockResult()
        async def commit(self):
            pass
            
    import asyncio
    async def run_pin_tests():
        db = MockDB()
        
        # Test Correct PIN
        res = await validate_patient_pin(db, cred.patient_id, "123456")
        print(f"Correct PIN PASS? {res}")
        
        # Test Incorrect PIN
        res = await validate_patient_pin(db, cred.patient_id, "654321")
        print(f"Incorrect PIN REJECTED? {not res}")
        
        # Lockout test
        cred.failed_attempts = 5
        res = await validate_patient_pin(db, cred.patient_id, "123456")
        print(f"Locked out PIN REJECTED? {not res}")
        
    asyncio.run(run_pin_tests())

if __name__ == "__main__":
    test_face_auth()
    test_pin()
    print("\nTests completed.")
