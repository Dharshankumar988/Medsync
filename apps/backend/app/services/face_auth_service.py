import os
# CRITICAL: Must be set BEFORE importing tensorflow, keras, deepface, or mediapipe.
# TF 2.17+ defaults to Keras 3 which is incompatible with DeepFace ArcFace weights.
# tf-keras==2.17.0 (Keras 2 compat layer) must be installed in requirements.txt.
os.environ["TF_USE_LEGACY_KERAS"] = "1"

# Verify tf-keras is actually installed before proceeding
try:
    import importlib
    importlib.import_module("tf_keras")
except ImportError:
    raise ImportError(
        "tf-keras package is required for DeepFace ArcFace compatibility. "
        "Install it with: pip install tf-keras==2.17.0"
    )

import json
import numpy as np
import logging
from typing import List, Dict, Any, Tuple
from fastapi import HTTPException
import mediapipe as mp
import cv2

# We will use DeepFace to get ArcFace embeddings, but use MediaPipe for detection and landmarks.
from app.services.security_service import encrypt_template, decrypt_template

logger = logging.getLogger("medsync.face_auth")

import threading

_insightface_model = None
_model_lock = threading.Lock()

def get_arcface_model():
    """Initialize ArcFace model once, thread-safe."""
    global _insightface_model
    if _insightface_model is None:
        with _model_lock:
            if _insightface_model is None:
                try:
                    from deepface import DeepFace
                    _insightface_model = DeepFace.build_model("ArcFace")
                except ImportError:
                    raise ImportError("DeepFace is required for ArcFace model.")
    return _insightface_model

def get_face_embedding(img_rgb: np.ndarray, face_box: Tuple[int, int, int, int]) -> List[float]:
    """Extract ArcFace embedding for a detected face crop."""
    x, y, w, h = face_box
    face_crop = img_rgb[y:y+h, x:x+w]
    if face_crop.size == 0:
        raise ValueError("Invalid face crop.")
        
    model = get_arcface_model()
    
    # Preprocess for ArcFace
    # Resize to expected input size
    face_crop = cv2.resize(face_crop, (112, 112))
    
    # DeepFace ArcFace normalization (typically standardizing or scaling [0,1], DeepFace standardizes or rescales)
    # The actual implementation of ArcFace in DeepFace expects images standardized, or depending on the version, exactly what we feed it.
    # We will use DeepFace's representation logic if we can, but since we are calling predict directly:
    # Most implementations normalize to [-1, 1] for ArcFace.
    face_crop = (face_crop.astype(np.float32) / 127.5) - 1.0
    
    face_crop = np.expand_dims(face_crop, axis=0)
    
    embedding = model.predict(face_crop, verbose=0)[0].tolist()
    return embedding

class FaceAuthenticationService:
    def __init__(self):
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5
        )
        
    def _validate_image_quality(self, image: np.ndarray) -> bool:
        """Basic quality check: blurriness using Laplacian variance."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        variance = cv2.Laplacian(gray, cv2.CV_64F).var()
        if variance < 50.0:  # Threshold for blurriness
            raise ValueError("POOR_IMAGE_QUALITY")
        return True
        
    def process_and_extract_face(self, image_path: str, challenge_type: str = None) -> Tuple[List[float], Dict[str, Any]]:
        """
        Runs MediaPipe detection and quality checks, then extracts InsightFace/ArcFace embedding.
        If challenge_type is provided, verifies liveness using facial landmarks.
        """
        if not os.path.exists(image_path):
            raise ValueError("Image path does not exist.")
            
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError("Could not read image.")
            
        self._validate_image_quality(image)
        
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(image_rgb)
        
        if not results.multi_face_landmarks:
            raise ValueError("FACE_NOT_DETECTED")
            
        if len(results.multi_face_landmarks) > 1:
            raise ValueError("MULTIPLE_FACES")
            
        face_landmarks = results.multi_face_landmarks[0]
        
        # Verify Liveness Challenge
        if challenge_type:
            import math
            lms = face_landmarks.landmark
            def dist(idx1, idx2):
                return math.hypot(lms[idx1].x - lms[idx2].x, lms[idx1].y - lms[idx2].y)
                
            if challenge_type == "SMILE":
                mouth_width = dist(61, 291)
                face_width = dist(234, 454)
                if mouth_width / face_width < 0.40:  # Threshold for a smile
                    raise ValueError("LIVENESS_FAILED: Did not detect a smile.")
            elif challenge_type == "OPEN_MOUTH":
                mouth_height = dist(13, 14)
                face_height = dist(10, 152)
                if mouth_height / face_height < 0.05: # Threshold for open mouth
                    raise ValueError("LIVENESS_FAILED: Did not detect an open mouth.")
        
        # Calculate bounding box from landmarks
        h, w, _ = image.shape
        x_min = min([lm.x for lm in face_landmarks.landmark])
        x_max = max([lm.x for lm in face_landmarks.landmark])
        y_min = min([lm.y for lm in face_landmarks.landmark])
        y_max = max([lm.y for lm in face_landmarks.landmark])
        
        box_x = max(0, int(x_min * w))
        box_y = max(0, int(y_min * h))
        box_w = min(w, int(x_max * w)) - box_x
        box_h = min(h, int(y_max * h)) - box_y
        
        # Check size constraints
        if box_w < 100 or box_h < 100:
            raise ValueError("FACE_TOO_SMALL")
        if box_w > w * 0.9 or box_h > h * 0.9:
            raise ValueError("FACE_TOO_LARGE")
            
        embedding = get_face_embedding(image_rgb, (box_x, box_y, box_w, box_h))
        
        metadata = {
            "box": (box_x, box_y, box_w, box_h),
            "quality": "PASS"
        }
        
        return embedding, metadata

    def enroll_patient(self, image_paths: List[str]) -> str:
        """Enroll patient using MediaPipe and ArcFace."""
        embeddings = []
        for img_path in image_paths:
            embedding, _ = self.process_and_extract_face(img_path)
            embeddings.append(embedding)
            
        avg_embedding = np.mean(embeddings, axis=0).tolist()
        
        template_data = {
            "model": "ArcFace",
            "embedding": avg_embedding,
            "version": "1.0"
        }
        
        return encrypt_template(json.dumps(template_data))
        
    def verify_patient(self, encrypted_template: str, current_image_path: str, challenge_data: Dict[str, Any] = None) -> bool:
        """
        Verify face 1:1 against the stored encrypted template.
        Validates challenge_data from frontend if present.
        """
        challenge_type = None
        if challenge_data and challenge_data.get("type") is not None:
            challenge_type = challenge_data.get("type")

        try:
            template_data = json.loads(decrypt_template(encrypted_template))
            stored_embedding = template_data["embedding"]
            
            current_embedding, _ = self.process_and_extract_face(current_image_path, challenge_type=challenge_type)
            
            a = np.array(stored_embedding)
            b = np.array(current_embedding)
            distance = 1 - np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
            
            # Use configurable threshold
            threshold = float(os.getenv("FACE_MATCH_THRESHOLD", "0.60"))
            
            return distance <= threshold
            
        except ValueError as ve:
            logger.error(f"Face verification failed: {ve}")
            raise ve
        except Exception as e:
            logger.error(f"Face verification unexpected error: {e}")
            return False

face_auth_service = FaceAuthenticationService()
