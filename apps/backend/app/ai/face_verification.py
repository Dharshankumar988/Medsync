import os
import tempfile
import json
from typing import List, Dict, Any, Tuple
from fastapi import HTTPException
from app.services.security_service import encrypt_template, decrypt_template

# Lazy loading DeepFace to prevent immediate high memory consumption on startup
_deepface = None

def get_deepface():
    global _deepface
    if _deepface is None:
        try:
            from deepface import DeepFace
            _deepface = DeepFace
        except ImportError:
            raise ImportError("DeepFace is not installed.")
    return _deepface

MODEL_NAME = "ArcFace"
DETECTOR_BACKEND = "opencv"

def enroll_face(image_paths: List[str]) -> str:
    """
    Enrolls a face from multiple image paths, generating a robust embedding.
    Returns the encrypted template.
    """
    DeepFace = get_deepface()
    embeddings = []
    
    for img_path in image_paths:
        try:
            # We enforce anti-spoofing if supported. DeepFace supports anti-spoofing via `anti_spoofing=True` parameter in recent versions.
            # Using enforce_detection=True to ensure a face is actually found
            result = DeepFace.represent(
                img_path=img_path, 
                model_name=MODEL_NAME, 
                detector_backend=DETECTOR_BACKEND, 
                enforce_detection=True,
                anti_spoofing=True # This requires fasnet or similar internally, depends on DeepFace version. Let's try it.
            )
            
            # represent returns a list of dictionaries (one for each face found). We only want one face.
            if len(result) != 1:
                raise ValueError("Exactly one face must be present in the enrollment image.")
            
            # If anti_spoofing is enabled, it returns 'is_real'. Let's check it.
            if 'is_real' in result[0] and not result[0]['is_real']:
                raise ValueError("Anti-spoofing failed. Face appears to be fake.")
                
            embeddings.append(result[0]['embedding'])
            
        except ValueError as e:
            if "Face could not be detected" in str(e):
                raise ValueError("No face detected in one of the images. Please ensure good lighting and clear view.")
            raise e
        except Exception as e:
            raise ValueError(f"Face processing error: {str(e)}")

    if not embeddings:
        raise ValueError("Failed to generate any embeddings.")

    # We average the embeddings from multiple samples to create a robust template
    import numpy as np
    avg_embedding = np.mean(embeddings, axis=0).tolist()
    
    template_data = {
        "model": MODEL_NAME,
        "embedding": avg_embedding,
        "detector": DETECTOR_BACKEND
    }
    
    return encrypt_template(json.dumps(template_data))

def verify_face(image_path: str, encrypted_template: str) -> bool:
    """
    Verifies a face image against an encrypted template.
    Returns True if verified, False otherwise.
    """
    DeepFace = get_deepface()
    
    try:
        template_data = json.loads(decrypt_template(encrypted_template))
        if template_data.get("model") != MODEL_NAME:
            # If model changed, we might need a re-enrollment in the future.
            # For now, let's try to verify with the stored model
            pass
            
        stored_embedding = template_data["embedding"]
        
        # Get embedding of the new image
        result = DeepFace.represent(
            img_path=image_path, 
            model_name=MODEL_NAME, 
            detector_backend=DETECTOR_BACKEND, 
            enforce_detection=True,
            anti_spoofing=True
        )
        
        if len(result) != 1:
            return False
            
        if 'is_real' in result[0] and not result[0]['is_real']:
            return False
            
        current_embedding = result[0]['embedding']
        
        # Calculate cosine distance
        import numpy as np
        a = np.array(stored_embedding)
        b = np.array(current_embedding)
        distance = 1 - np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
        
        # ArcFace default threshold for cosine distance is usually ~0.68
        # We can be slightly stricter for medical data, e.g., 0.60
        threshold = 0.60
        
        return distance <= threshold

    except Exception as e:
        print(f"Verification error: {e}")
        return False
