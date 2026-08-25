import asyncio
import os
import sys
import uuid
from typing import Dict, Any, List

import numpy as np

# Mocking external dependencies before importing app modules
import sys
from unittest.mock import MagicMock

# Mock DeepFace
sys.modules["deepface"] = MagicMock()
sys.modules["deepface.DeepFace"] = MagicMock()

# Mock MediaPipe
mp_mock = MagicMock()
sys.modules["mediapipe"] = mp_mock

# Mock cv2
cv2_mock = MagicMock()
sys.modules["cv2"] = cv2_mock

# Set required environment variables
os.environ["BIOMETRIC_ENCRYPTION_KEY"] = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
os.environ["FACE_MATCH_THRESHOLD"] = "0.60"

# Now import the services
sys.path.append(os.path.join(os.path.dirname(__file__), "apps", "backend"))
from app.services.face_auth_service import FaceAuthenticationService
from app.services.security_service import validate_patient_pin, SecurityService
from app.models.security import PatientSecurityCredential
from passlib.context import CryptContext

# 1. FACE AUTH TEST & 3. ARCface VERIFICATION
def test_face_auth():
    print("\n--- Testing Face Auth & ArcFace ---")
    service = FaceAuthenticationService()
    
    # Mock the MediaPipe face mesh
    mock_results = MagicMock()
    mock_landmarks = MagicMock()
    
    # Create fake landmarks for SMILE and OPEN_MOUTH
    class LM:
        def __init__(self, x, y):
            self.x = x
            self.y = y
            
    # Default neutral face landmarks
    def create_lms(smile=False, open_mouth=False):
        lms = [LM(0.5, 0.5) for _ in range(478)]
        # width
        lms[234] = LM(0.1, 0.5)
        lms[454] = LM(0.9, 0.5) # width = 0.8
        # height
        lms[10] = LM(0.5, 0.1)
        lms[152] = LM(0.5, 0.9) # height = 0.8
        
        # mouth width
        if smile:
            lms[61] = LM(0.2, 0.7)
            lms[291] = LM(0.8, 0.7) # mouth width = 0.6 (ratio 0.6/0.8 = 0.75 > 0.40)
        else:
            lms[61] = LM(0.4, 0.7)
            lms[291] = LM(0.6, 0.7) # mouth width = 0.2 (ratio 0.25 < 0.40)
            
        # mouth height
        if open_mouth:
            lms[13] = LM(0.5, 0.6)
            lms[14] = LM(0.5, 0.7) # height = 0.1 (ratio 0.1/0.8 = 0.125 > 0.05)
        else:
            lms[13] = LM(0.5, 0.65)
            lms[14] = LM(0.5, 0.66) # height = 0.01
            
        return lms
        
    mock_landmarks.landmark = create_lms()
    mock_results.multi_face_landmarks = [mock_landmarks]
    service.face_mesh.process.return_value = mock_results
    
    # Mock image reading
    cv2_mock.imread.return_value = np.zeros((1000, 1000, 3), dtype=np.uint8)
    
    # Mock DeepFace model
    mock_model = MagicMock()
    # Enrolled embedding
    mock_model.predict.return_value = [np.random.rand(512).tolist()]
    service._insightface_model = mock_model
    
    # Test Enrollment
    enc_template = service.enroll_patient(["dummy.jpg"])
    print("Enrollment PASS. Template generated.")
    
    # Test Verification (Same Face)
    res = service.verify_patient(enc_template, "dummy.jpg")
    print(f"Verification (Same Face) PASS? {res}")
    
    # Test Verification (Different Face)
    mock_model.predict.return_value = [np.random.rand(512).tolist()] # different embedding
    res = service.verify_patient(enc_template, "dummy.jpg")
    print(f"Verification (Different Face) REJECTED? {not res}")
    
    # Test Multiple Faces
    mock_results.multi_face_landmarks = [mock_landmarks, mock_landmarks]
    try:
        service.verify_patient(enc_template, "dummy.jpg")
        print("Multiple faces test FAILED (did not raise).")
    except ValueError as e:
        print(f"Multiple faces test PASS. Raised: {e}")
        
    # Test No Face
    mock_results.multi_face_landmarks = None
    try:
        service.verify_patient(enc_template, "dummy.jpg")
        print("No face test FAILED (did not raise).")
    except ValueError as e:
        print(f"No face test PASS. Raised: {e}")
        
    # Test Smile Liveness
    mock_results.multi_face_landmarks = [mock_landmarks]
    mock_landmarks.landmark = create_lms(smile=False)
    try:
        service.verify_patient(enc_template, "dummy.jpg", {"type": "SMILE"})
        print("Smile Liveness test FAILED (accepted neutral).")
    except ValueError as e:
        print(f"Smile Liveness test PASS (rejected neutral). Raised: {e}")
        
    mock_landmarks.landmark = create_lms(smile=True)
    mock_model.predict.return_value = [np.random.rand(512).tolist()] # prevent distance match failure if possible, or just catch it
    # We only care if it passes the liveness check part
    try:
        service.verify_patient(enc_template, "dummy.jpg", {"type": "SMILE"})
        print("Smile Liveness test PASS (accepted smile).")
    except ValueError as e:
        if "LIVENESS_FAILED" in str(e):
            print(f"Smile Liveness test FAILED. Raised: {e}")
            
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
