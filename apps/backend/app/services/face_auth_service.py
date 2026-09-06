import os
import json
import logging
from typing import List, Dict, Any, Tuple
import httpx
from fastapi import HTTPException
from app.services.security_service import encrypt_template, decrypt_template

logger = logging.getLogger("medsync.face_auth")

class RemoteFaceVerificationProvider:
    """Client for the external Face Verification Service."""
    def __init__(self):
        self.base_url = os.getenv("FACE_VERIFICATION_URL", "http://localhost:8080").rstrip("/")
        self.auth_token = os.getenv("FACE_VERIFICATION_AUTH_TOKEN", "")
        
    def _get_headers(self) -> Dict[str, str]:
        headers = {}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        return headers

    def enroll(self, image_bytes: bytes) -> List[float]:
        try:
            files = {"image": ("face.jpg", image_bytes, "image/jpeg")}
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{self.base_url}/enroll",
                    headers=self._get_headers(),
                    files=files
                )
            
            if response.status_code != 200:
                logger.error(f"Face service enroll failed with status {response.status_code}")
                raise ValueError("FACE_SERVICE_ERROR")
                
            data = response.json()
            if data.get("error"):
                raise ValueError(data["error"])
                
            return data["embedding"]
            
        except httpx.RequestError as e:
            logger.error(f"Face service request failed: {e}")
            raise ValueError("FACE_SERVICE_UNAVAILABLE")

    def verify(self, image_bytes: bytes, registered_embedding: List[float], challenge_type: str = None) -> Dict[str, Any]:
        result = {
            "verified": False,
            "score": 0.0,
            "threshold": 0.45,
            "source": "cloud",
            "service_error": False
        }
        try:
            files = {"image": ("face.jpg", image_bytes, "image/jpeg")}
            data = {
                "registered_embedding": json.dumps(registered_embedding)
            }
            if challenge_type:
                data["challenge_type"] = challenge_type
                
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{self.base_url}/verify",
                    headers=self._get_headers(),
                    data=data,
                    files=files
                )
            
            if response.status_code != 200:
                logger.error(f"Face service verify failed with status {response.status_code}")
                result["service_error"] = True
                return result
                
            resp_data = response.json()
            if resp_data.get("error"):
                logger.error(f"Face service returned error: {resp_data['error']}")
                # A domain error inside a 200 OK could be bad image quality or missing face
                result["service_error"] = True
                return result
                
            if "verified" not in resp_data:
                logger.error("Face service returned malformed response (missing 'verified')")
                result["service_error"] = True
                return result

            result["verified"] = resp_data.get("verified", False)
            result["score"] = resp_data.get("score", 0.0)
            result["threshold"] = resp_data.get("threshold", 0.45)
            return result
            
        except httpx.RequestError as e:
            logger.error(f"Face service request failed: {e}")
            result["service_error"] = True
            return result
        except Exception as e:
            logger.error(f"Face service unexpected failure: {e}")
            result["service_error"] = True
            return result



class FaceAuthenticationService:
    """Orchestrates face enrollment and verification via the remote Face Service."""
    def __init__(self):
        self.remote_provider = RemoteFaceVerificationProvider()

    def enroll_patient(self, image_paths: List[str]) -> str:
        """Enroll patient using the remote Face Service."""
        embeddings = []
        for img_path in image_paths:
            if not os.path.exists(img_path):
                raise ValueError("Image path does not exist.")
            with open(img_path, "rb") as f:
                image_bytes = f.read()
            embedding = self.remote_provider.enroll(image_bytes)
            embeddings.append(embedding)

        import numpy as np
        avg_embedding = np.mean(embeddings, axis=0).tolist()

        template_data = {
            "model": "buffalo_l",
            "embedding": avg_embedding,
            "version": "1.0"
        }

        return encrypt_template(json.dumps(template_data))

    def verify_patient(self, encrypted_template: str, current_image_path: str, challenge_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Verify face 1:1 against the stored encrypted template using the remote Face Service.
        The remote service is the sole provider — no local fallback.
        """
        try:
            if not os.path.exists(current_image_path):
                raise ValueError("Current image path does not exist.")

            with open(current_image_path, "rb") as f:
                image_bytes = f.read()

            template_data = json.loads(decrypt_template(encrypted_template))
            stored_embedding = template_data["embedding"]

            result = self.remote_provider.verify(image_bytes, stored_embedding)

            if result["service_error"]:
                logger.error("Remote Face Service returned a service error.")
                raise ValueError("FACE_SERVICE_UNAVAILABLE")

            return result

        except ValueError as ve:
            logger.error(f"Face verification failed: {ve}")
            raise ve
        except Exception as e:
            logger.error(f"Face verification unexpected error: {e}")
            return {
                "verified": False,
                "score": 0.0,
                "threshold": 0.45,
                "source": "cloud",
                "service_error": True
            }

face_auth_service = FaceAuthenticationService()
