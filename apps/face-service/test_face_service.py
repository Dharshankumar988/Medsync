import pytest
import io
import json
from fastapi.testclient import TestClient
from unittest.mock import patch
from main import app

client = TestClient(app)

class MockFace:
    def __init__(self, bbox, embedding):
        import numpy as np
        self.bbox = np.array(bbox)
        self.normed_embedding = np.array(embedding)

class MockFaceAnalysis:
    def __init__(self, num_faces=1):
        self.num_faces = num_faces
        
    def get(self, img):
        if self.num_faces == 0:
            return []
        faces = []
        for i in range(self.num_faces):
            faces.append(MockFace([10, 10, 100, 100], [0.1]*512))
        return faces

@pytest.fixture
def mock_get_face_analysis_one_face():
    with patch('main.get_face_analysis_app') as mock_app:
        mock_app.return_value = MockFaceAnalysis(num_faces=1)
        yield mock_app

@pytest.fixture
def mock_get_face_analysis_zero_faces():
    with patch('main.get_face_analysis_app') as mock_app:
        mock_app.return_value = MockFaceAnalysis(num_faces=0)
        yield mock_app

@pytest.fixture
def mock_get_face_analysis_multiple_faces():
    with patch('main.get_face_analysis_app') as mock_app:
        mock_app.return_value = MockFaceAnalysis(num_faces=2)
        yield mock_app


# Helper to create a dummy image
def create_valid_dummy_image():
    import cv2
    import numpy as np
    img = np.random.randint(0, 256, (100, 100, 3), dtype=np.uint8)
    _, encoded_image = cv2.imencode('.jpg', img)
    return encoded_image.tobytes()


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_detect_one_face(mock_get_face_analysis_one_face):
    response = client.post(
        "/detect",
        files={"image": ("test.jpg", create_valid_dummy_image(), "image/jpeg")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["faces_detected"] == 1
    assert len(data["faces"]) == 1
    assert data["faces"][0]["bbox"] == [10, 10, 100, 100]

def test_detect_zero_faces(mock_get_face_analysis_zero_faces):
    response = client.post(
        "/detect",
        files={"image": ("test.jpg", create_valid_dummy_image(), "image/jpeg")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["faces_detected"] == 0
    assert len(data["faces"]) == 0

def test_detect_multiple_faces(mock_get_face_analysis_multiple_faces):
    response = client.post(
        "/detect",
        files={"image": ("test.jpg", create_valid_dummy_image(), "image/jpeg")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["faces_detected"] == 2
    assert len(data["faces"]) == 2

def test_enroll_one_face(mock_get_face_analysis_one_face):
    response = client.post(
        "/enroll",
        files={"image": ("test.jpg", create_valid_dummy_image(), "image/jpeg")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["embedding"] is not None
    assert len(data["embedding"]) == 512
    assert data["error"] is None

def test_enroll_zero_faces(mock_get_face_analysis_zero_faces):
    response = client.post(
        "/enroll",
        files={"image": ("test.jpg", create_valid_dummy_image(), "image/jpeg")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["embedding"] is None
    assert data["error"] == "FACE_NOT_DETECTED"

def test_enroll_multiple_faces(mock_get_face_analysis_multiple_faces):
    response = client.post(
        "/enroll",
        files={"image": ("test.jpg", create_valid_dummy_image(), "image/jpeg")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["embedding"] is None
    assert data["error"] == "MULTIPLE_FACES"

def test_verify_match(mock_get_face_analysis_one_face):
    stored_embedding = [0.1] * 512
    response = client.post(
        "/verify",
        files={"image": ("test.jpg", create_valid_dummy_image(), "image/jpeg")},
        data={"registered_embedding": json.dumps(stored_embedding)}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["verified"] is True
    # Cosine similarity of identical vectors should be ~1.0
    assert data["score"] >= 0.99 
    assert data["error"] is None

def test_verify_mismatch(mock_get_face_analysis_one_face):
    # Stored embedding completely orthogonal
    stored_embedding = [-0.1] * 512
    response = client.post(
        "/verify",
        files={"image": ("test.jpg", create_valid_dummy_image(), "image/jpeg")},
        data={"registered_embedding": json.dumps(stored_embedding)}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["verified"] is False
    # Cosine similarity of opposing vectors should be -1.0
    assert data["score"] < 0.0 
    assert data["error"] is None
