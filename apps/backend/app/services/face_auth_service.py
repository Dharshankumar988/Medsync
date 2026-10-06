import logging
from typing import Dict, Any

logger = logging.getLogger("medsync.face_auth")

class FaceAuthenticationService:
    """
    Face authentication is disabled.
    MedSync now uses PIN-based authentication only.
    """
    def __init__(self):
        pass

    def enroll_patient(self, *args, **kwargs):
        """Face enrollment disabled."""
        raise ValueError("FACE_AUTHENTICATION_DISABLED")

    def verify_patient(self, *args, **kwargs):
        """Face verification disabled."""
        raise ValueError("FACE_AUTHENTICATION_DISABLED")

face_auth_service = FaceAuthenticationService()
