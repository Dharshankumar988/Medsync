"""
Response Formatter — Standardize all AI responses into consistent structures.
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger("medsync.ai.response_formatter")


class ResponseFormatter:
    """Standardizes AI output into consistent response structures."""

    @staticmethod
    def format_image_analysis(
        scan_type: str,
        prediction: Dict[str, Any],
        clinical_summary: Any,
        patient_explanation: Any,
        inference_time_ms: int,
    ) -> Dict[str, Any]:
        """Format a complete image analysis response."""
        diagnosis = prediction.get("diagnosis", prediction.get("predicted_class", "Unknown"))
        confidence = prediction.get("confidence", 0.0)

        return {
            "scan_type": scan_type,
            "prediction": {
                "diagnosis": diagnosis,
                "confidence": round(confidence, 4),
                "confidence_percent": round(confidence * 100, 1),
                "details": prediction,
            },
            "clinical_summary": clinical_summary,
            "patient_explanation": patient_explanation,
            "metadata": {
                "inference_time_ms": inference_time_ms,
                "analyzed_at": datetime.utcnow().isoformat(),
                "model_source": "huggingface_space",
            },
        }

    @staticmethod
    def format_chat_response(
        session_id: str,
        reply: str,
        model_used: Optional[str] = None,
        inference_time_ms: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Format a standard chat response."""
        return {
            "session_id": str(session_id),
            "reply": reply,
            "metadata": {
                "model_used": model_used,
                "inference_time_ms": inference_time_ms,
            },
        }

    @staticmethod
    def format_error(message: str, code: str = "ai_error") -> Dict[str, Any]:
        """Format an error response."""
        return {
            "error": True,
            "code": code,
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
        }
