"""
AI Orchestrator — Central intelligence router that receives all AI requests,
detects user role, and routes to the correct service.
"""
import logging
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.ai.core.config import ai_config
from app.ai.core.prompt_manager import PromptManager
from app.ai.core.exceptions import AIPromptInjectionException

logger = logging.getLogger("medsync.ai.orchestrator")


class AIOrchestrator:
    """
    Central orchestrator that:
    - Validates and sanitizes input
    - Detects role from authentication
    - Routes to correct role-based AI service
    - Handles image analysis pipeline orchestration
    """

    ROLE_SERVICE_MAP = {
        "doctor": "DoctorAIService",
        "patient": "PatientAIService",
        "pharmacy": "PharmacyAIService",
        "admin": "AdminAIService",
    }

    @staticmethod
    def validate_request(message: str, role: str) -> str:
        """Validate and sanitize a chat request before routing."""
        if not message or not message.strip():
            raise ValueError("Message cannot be empty.")

        if role not in AIOrchestrator.ROLE_SERVICE_MAP:
            raise ValueError(f"Invalid role: {role}. Must be one of {list(AIOrchestrator.ROLE_SERVICE_MAP.keys())}")

        # Prompt injection check
        if PromptManager.detect_injection(message):
            logger.warning(f"Prompt injection attempt detected for role={role}")
            raise AIPromptInjectionException()

        # Emergency detection for patients
        if role == "patient" and PromptManager.detect_emergency(message):
            logger.info(f"Emergency keywords detected in patient message")
            # Don't block — let the AI handle it with appropriate urgency

        return PromptManager.sanitize_input(message)

    @staticmethod
    def get_model_for_role(role: str) -> str:
        """Return the configured Groq model for a given role."""
        model_map = {
            "doctor": ai_config.LLM_MODEL_DOCTOR,
            "patient": ai_config.LLM_MODEL_PATIENT,
            "pharmacy": ai_config.LLM_MODEL_PHARMACY,
            "admin": ai_config.LLM_MODEL_ADMIN,
        }
        return model_map.get(role, ai_config.LLM_MODEL_PATIENT)

    @staticmethod
    def validate_scan_type(scan_type: str) -> str:
        """Validate and normalize scan type for image analysis."""
        normalized = scan_type.lower().strip()
        if normalized not in ai_config.VALID_SCAN_TYPES:
            raise ValueError(f"Invalid scan_type: {scan_type}. Must be one of {ai_config.VALID_SCAN_TYPES}")
        return normalized

    @staticmethod
    def classify_admin_intent(message: str) -> str:
        """Classify admin queries into ANALYTICS, RAG, or COMBINED."""
        msg_lower = message.lower()
        analytics_keywords = ["count", "how many", "total", "stats", "statistics", "analytics", "dashboard", "metric", "activity", "trend", "kpi", "growth"]
        rag_keywords = ["policy", "procedure", "document", "guideline", "rule", "protocol", "manual", "say", "according to"]
        
        has_analytics = any(kw in msg_lower for kw in analytics_keywords)
        has_rag = any(kw in msg_lower for kw in rag_keywords)
        
        if has_analytics and has_rag:
            return "COMBINED"
        elif has_analytics:
            return "ANALYTICS"
        elif has_rag:
            return "RAG"
        else:
            return "RAG" # Default to RAG for general queries

    @staticmethod
    def filter_output(response: str, role: str) -> str:
        """
        Output Security Filter to sanitize the generated response.
        Ensures sensitive metadata or system instructions do not leak.
        """
        if not response:
            return response
            
        sensitive_patterns = [
            r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}", # JWT
            r"(?i)(password|secret|api[_-]?key)[\s:=]+[\"']?[A-Za-z0-9_*-]+[\"']?", # Keys/Passwords
            r"(?i)<system_instructions>.*?</system_instructions>", # System prompt
            r"(?i)<authorized_data>.*?</authorized_data>" # Raw RAG data
        ]
        
        filtered_response = response
        for pattern in sensitive_patterns:
            import re
            if re.search(pattern, filtered_response):
                logger.warning(f"Sensitive information prevented from leaking in role {role}.")
                filtered_response = re.sub(pattern, "[REDACTED BY SECURITY FILTER]", filtered_response)
                
        return filtered_response
