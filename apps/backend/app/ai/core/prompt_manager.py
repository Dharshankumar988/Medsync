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
    def is_conversational(text: str) -> bool:
        """Detect if a message is purely conversational small talk to bypass expensive operations."""
        if not text:
            return True
        lower = text.strip().lower()
        if len(lower.split()) > 10:
            return False
            
        conversational_phrases = {
            "hi", "hello", "hey", "greetings", 
            "thanks", "thank you", "thx", "tysm",
            "good morning", "good evening", "good afternoon",
            "how are you", "whats up", "ok", "okay", "bye", "goodbye", "cool"
        }
        
        import re
        clean_text = re.sub(r'[^\w\s]', '', lower).strip()
        return clean_text in conversational_phrases

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
            "skin": "Dermatological / Skin Lesion Classification",
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

        skin_special_guidance = ""
        if scan_type == "skin":
            skin_special_guidance = f"""
CRITICAL DERMATOLOGY CLINICAL CONTEXT:
- The preliminary machine learning model was trained on broad classification categories (e.g., acne, eczema, fungal, infection, normal, psoriasis, tumor).
- When the model outputs a low or modest confidence score (e.g. {confidence_pct}%), or when evaluating localized cutaneous lesions (such as a pigmented spot or mole):
  1. DO NOT simply echo '{diagnosis}' as a conclusive verdict.
  2. Explain what the lesion visually resembles: Note that discrete, pigmented spots are characteristic of Pigmented Cutaneous Lesions (such as a Melanocytic Nevus / Common Mole, Dysplastic Nevus, or Seborrheic Keratosis).
  3. Clearly articulate why a {confidence_pct}% '{diagnosis}' score represents a low-confidence classification and outline why classic infection signs (acute erythema, purulent exudate, heat, spreading margins) must be verified clinically.
  4. Evaluate under the clinical ABCDE criteria (Asymmetry, Border irregularity, Color variation, Diameter relative to 6mm, Evolution).
  5. Provide a realistic differential diagnosis (Melanocytic Nevus / Mole, Dysplastic Nevus, Seborrheic Keratosis, Dermatofibroma, vs Atypical/Infectious lesion).
"""

        if role == "doctor":
            return f"""SYSTEM INSTRUCTIONS
You are a clinical AI imaging and dermatology specialist. A medical image analysis model has processed a {scan_label} scan.
IMPORTANT:
- The ML model prediction is an AI-generated preliminary finding, not a definitive diagnosis.
- Do not claim absolute certainty.
- Clearly distinguish observed/model-derived flags from clinical interpretation and differential diagnoses.
- When model confidence is modest (< 70%), provide clinical context explaining the ambiguity and alternative differentials.
- Recommend professional in-person clinical evaluation with appropriate diagnostic tools (e.g., dermoscopy, biopsy) where indicated.
- Return ONLY a valid JSON object matching the requested schema. Do not wrap in markdown blocks.
{skin_special_guidance}
MODEL OUTPUT
- Diagnosis / Primary Flag: {diagnosis}
- Statistical Confidence: {confidence_pct}%
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
- The ML model prediction is an AI-generated preliminary check, not a definitive medical diagnosis.
- Do not claim certainty. Avoid alarming language. Be warm, reassuring, and informative.
- If the model flagged '{diagnosis}' with modest or low confidence ({confidence_pct}%), reassure the patient that skin marks and moles are very common and benign (such as everyday moles / nevi), and that a low-confidence flag does not automatically mean an infection or disease.
- Explain the visual appearance in simple terms (e.g. mole / pigmented spot) and encourage a routine in-person check by a doctor or dermatologist for peace of mind.
- Return ONLY a valid JSON object matching the requested schema. Do not wrap in markdown blocks.
{skin_special_guidance}
MODEL OUTPUT
- Finding: {diagnosis}
- Statistical Confidence: {confidence_pct}%
- Details: {prediction}

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
