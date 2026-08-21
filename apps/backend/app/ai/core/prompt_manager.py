"""
Prompt Manager — Centralized prompt construction, injection protection, and input validation.
"""
import re
import logging
from typing import Optional
from app.ai.core.config import ai_config

logger = logging.getLogger("medsync.ai.prompt_manager")


class PromptManager:
    """Centralized prompt construction with security guardrails."""

    @staticmethod
    def sanitize_input(text: str) -> str:
        """Remove potential prompt injection attempts from user input."""
        if not text:
            return ""
        sanitized = text.strip()
        lower = sanitized.lower()
        for pattern in ai_config.PROMPT_INJECTION_PATTERNS:
            if pattern.lower() in lower:
                logger.warning(f"Prompt injection pattern detected and stripped: '{pattern}'")
                sanitized = re.sub(re.escape(pattern), "[FILTERED]", sanitized, flags=re.IGNORECASE)
        return sanitized

    @staticmethod
    def detect_injection(text: str) -> bool:
        """Check if input contains prompt injection patterns."""
        if not text:
            return False
        lower = text.lower()
        for pattern in ai_config.PROMPT_INJECTION_PATTERNS:
            if pattern.lower() in lower:
                return True
        return False

    @staticmethod
    def detect_emergency(text: str) -> bool:
        """Detect if a patient message indicates a medical emergency."""
        emergency_keywords = [
            "chest pain", "can't breathe", "cannot breathe", "heart attack",
            "stroke", "seizure", "unconscious", "severe bleeding",
            "suicidal", "suicide", "overdose", "anaphylaxis",
            "choking", "not breathing", "unresponsive",
        ]
        lower = text.lower()
        return any(kw in lower for kw in emergency_keywords)

    @staticmethod
    def build_messages(
        system_prompt: str,
        history: list,
        user_message: str,
        specific_instruction: Optional[str] = None,
    ) -> list:
        """Build the message list for LLM inference."""
        content = system_prompt
        if specific_instruction:
            content += f"\n\nCRITICAL INSTRUCTION FOR THIS REQUEST: {specific_instruction}"

        messages = [{"role": "system", "content": content}]
        messages.extend(history)
        messages.append({"role": "user", "content": PromptManager.sanitize_input(user_message)})
        return messages

    @staticmethod
    def build_image_explanation_prompt(
        scan_type: str,
        prediction: dict,
        role: str = "doctor",
        patient_context: dict = None
    ) -> str:
        """Build a Groq prompt to explain an image prediction result in JSON format."""
        diagnosis = prediction.get("diagnosis", prediction.get("predicted_class", "Unknown"))
        confidence = prediction.get("confidence", 0.0)
        confidence_pct = round(confidence * 100, 1)

        scan_labels = {
            "bone": "X-Ray / Bone Fracture Analysis",
            "brain": "Brain MRI / Tumor Detection",
            "kidney": "Kidney CT / Stone Detection",
            "skin": "Dermatological / Skin Disease Classification",
        }
        scan_label = scan_labels.get(scan_type, "Medical Image Analysis")

        patient_context_str = "None provided."
        if patient_context:
            import json
            patient_context_str = PromptManager.sanitize_input(json.dumps(patient_context, indent=2))

        schema = """{
  "summary": "string",
  "model_interpretation": "string",
  "confidence_context": "string",
  "key_findings": ["string"],
  "possible_considerations": ["string"],
  "recommended_next_steps": ["string"],
  "questions_for_clinician": ["string"],
  "urgency": "routine|soon|urgent",
  "disclaimer": "string"
}"""

        if role == "doctor":
            return f"""SYSTEM INSTRUCTIONS
You are a clinical AI assistant. A medical image analysis model has processed a {scan_label} scan.
IMPORTANT:
- The ML model prediction is an AI-generated result.
- Do not claim certainty.
- Do not fabricate findings, patient history, test results, or medications.
- Do not contradict the underlying model result.
- Clearly distinguish observed/model-derived findings from interpretation.
- Recommend professional clinical evaluation where appropriate.
- If information is insufficient, say so.
- Return ONLY a valid JSON object matching the requested schema. Do not wrap in markdown blocks.

MODEL OUTPUT
- Diagnosis: {diagnosis}
- Confidence: {confidence_pct}%
- Raw Details: {prediction}

PATIENT CONTEXT
{patient_context_str}

Provide a structured clinical report in JSON format strictly adhering to this schema:
{schema}
"""

        else:  # patient-friendly
            return f"""SYSTEM INSTRUCTIONS
You are a caring healthcare assistant. A medical scan ({scan_label}) was analyzed by our AI system.
IMPORTANT:
- The ML model prediction is an AI-generated result.
- Do not claim certainty or provide a definitive diagnosis.
- Avoid alarming language. Be warm and supportive.
- Do not contradict the underlying model result.
- Return ONLY a valid JSON object matching the requested schema. Do not wrap in markdown blocks.

MODEL OUTPUT
- Finding: {diagnosis}
- Confidence: {confidence_pct}%

PATIENT CONTEXT
{patient_context_str}

Provide a structured explanation to the patient in JSON format strictly adhering to this schema:
{schema}
"""

    @staticmethod
    def add_medical_disclaimer(response: str, role: str) -> str:
        """Append appropriate medical disclaimer based on role."""
        if role == "patient":
            disclaimer = "\n\n---\n*⚕️ This information is for educational purposes only and does not constitute medical advice. Please consult your healthcare provider for personalized guidance.*"
            if disclaimer.strip("*\n- ⚕️") not in response:
                return response + disclaimer
        return response
