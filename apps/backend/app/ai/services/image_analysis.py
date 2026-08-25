"""
Image Analysis Service — Complete pipeline:
Upload → Route → HF Predict → Groq Explain → Structured Report
"""
import time
import logging
import asyncio
from typing import Dict, Any, Optional

from app.ai.core.inference_service import inference_service
from app.ai.services.groq_client import groq_client
from app.ai.core.exceptions import DiagnosticModelException
from app.ai.core.prompt_manager import PromptManager
from app.ai.core.response_formatter import ResponseFormatter
from app.ai.core.config import ai_config

logger = logging.getLogger("medsync.ai.image_analysis")


class ImageAnalysisService:
    """
    Complete image analysis pipeline:
    1. Accept image + scan_type
    2. Route to correct HF model
    3. Get prediction + confidence
    4. Pass prediction to Groq for explanation
    5. Return structured report
    """

    @staticmethod
    async def analyze(
        image_bytes: bytes,
        scan_type: str,
        user_role: str = "doctor",
        patient_context: Optional[dict] = None,
    ) -> Dict[str, Any]:
        """
        Full image analysis pipeline.

        Args:
            image_bytes: Raw image bytes
            scan_type: One of bone, brain, kidney, skin
            user_role: doctor or patient (determines explanation style)
            patient_context: Optional clinical context provided by the patient

        Returns:
            Structured analysis report
        """
        if scan_type not in ai_config.VALID_SCAN_TYPES:
            raise ValueError(f"Invalid scan_type: {scan_type}. Must be one of {ai_config.VALID_SCAN_TYPES}")

        start_time = time.time()

        # ── Step 1: Send to HF model for prediction ──
        logger.info(f"Starting image analysis: scan_type={scan_type}, role={user_role}")
        try:
            hf_result = await inference_service.predict(scan_type, image_bytes)
        except DiagnosticModelException:
            raise
        except Exception as e:
            logger.error(f"HF inference failed: {e}")
            raise DiagnosticModelException(f"Image analysis model unavailable: {str(e)}")

        prediction_time_ms = int((time.time() - start_time) * 1000)

        # ── Step 2: Extract prediction ──
        prediction = ImageAnalysisService._extract_prediction(hf_result, scan_type)
        confidence = prediction.get("confidence", 0.0)
        diagnosis = prediction.get("diagnosis", prediction.get("predicted_class", "Unknown"))

        logger.info(f"HF prediction: {diagnosis} ({confidence:.2%}) in {prediction_time_ms}ms")

        # ── Step 3: Generate Groq explanations (parallel) ──
        doctor_prompt = PromptManager.build_image_explanation_prompt(scan_type, prediction, role="doctor", patient_context=patient_context)
        patient_prompt = PromptManager.build_image_explanation_prompt(scan_type, prediction, role="patient", patient_context=patient_context)

        import json

        from app.schemas.ai import GroqClinicalSummary, GroqPatientExplanation
        clinical_summary = None
        patient_explanation = None
        explanation_error = None
        try:
            raw_clinical, raw_patient = await asyncio.gather(
                groq_client.chat_completion(
                    messages=[
                        {"role": "system", "content": "You are Doctor Pulse AI, a clinical imaging specialist. Provide structured, evidence-based analysis."},
                        {"role": "user", "content": doctor_prompt},
                    ],
                    model=ai_config.LLM_MODEL_DOCTOR,
                    temperature=0.1,
                    max_tokens=2048,
                    json_mode=True,
                ),
                groq_client.chat_completion(
                    messages=[
                        {"role": "system", "content": "You are Patient Pulse AI, a kind and reassuring healthcare guide. Explain medical findings in simple terms."},
                        {"role": "user", "content": patient_prompt},
                    ],
                    model=ai_config.LLM_MODEL_PATIENT,
                    temperature=0.1,
                    max_tokens=2048,
                    json_mode=True,
                ),
            )
            
            try:
                clinical_summary = GroqClinicalSummary.model_validate_json(raw_clinical).model_dump()
            except Exception as e:
                logger.error(f"Failed to validate Groq clinical response: {e}")
                explanation_error = "The LLM returned an invalid clinical explanation."
                
            try:
                patient_explanation = GroqPatientExplanation.model_validate_json(raw_patient).model_dump()
            except Exception as e:
                logger.error(f"Failed to validate Groq patient response: {e}")
                explanation_error = "The LLM returned an invalid patient explanation."
                
        except Exception as e:
            logger.error(f"Groq explanation generation failed: {e}")
            explanation_error = "The LLM explanation service is unavailable; the verified model finding is shown without an explanation."

        # Add disclaimer to patient explanation if missing
        if isinstance(patient_explanation, dict):
            if "disclaimer" not in patient_explanation or not patient_explanation["disclaimer"]:
                patient_explanation["disclaimer"] = "This information is for educational purposes only and does not constitute medical advice."

        total_time_ms = int((time.time() - start_time) * 1000)

        # ── Step 4: Format structured report ──
        report = ResponseFormatter.format_image_analysis(
            scan_type=scan_type,
            prediction=prediction,
            clinical_summary=clinical_summary,
            patient_explanation=patient_explanation,
            inference_time_ms=total_time_ms,
        )
        if explanation_error:
            report["metadata"]["explanation_error"] = explanation_error
        return report

    @staticmethod
    def _extract_prediction(hf_result: Dict[str, Any], scan_type: str) -> Dict[str, Any]:
        """Normalize HF model output into a consistent prediction structure with validation."""
        from app.schemas.ai import HFInferenceOutput
        
        try:
            validated_output = HFInferenceOutput.model_validate(hf_result)
        except Exception as e:
            logger.error(f"HF Inference validation failed: {e}")
            return {"diagnosis": "Validation Failed", "confidence": 0.0, "raw": hf_result}
            
        if not validated_output.success:
            return {"diagnosis": "Analysis Failed", "confidence": 0.0, "raw": hf_result}

        if scan_type == "skin":
            return {
                "diagnosis": validated_output.predicted_class or "Unknown",
                "predicted_class": validated_output.predicted_class or "Unknown",
                "confidence": validated_output.confidence,
                "top_predictions": validated_output.top_predictions or [],
            }
        else:
            return {
                "diagnosis": validated_output.diagnosis or "Unknown",
                "confidence": validated_output.confidence,
                "boxes": validated_output.boxes or [],
            }
