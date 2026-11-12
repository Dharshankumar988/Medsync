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

        # ── Step 2: Extract prediction & region-of-interest boxes ──
        prediction = ImageAnalysisService._extract_prediction(hf_result, scan_type, image_bytes)
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
                        {"role": "system", "content": "You are Doctor Pulse AI, a clinical imaging and dermatology specialist. Provide evidence-based, thorough differential diagnostic analysis."},
                        {"role": "user", "content": doctor_prompt},
                    ],
                    model=ai_config.LLM_MODEL_DOCTOR,
                    temperature=0.1,
                    max_tokens=2048,
                    json_mode=True,
                ),
                groq_client.chat_completion(
                    messages=[
                        {"role": "system", "content": "You are Patient Pulse AI, a kind and reassuring healthcare guide. Explain medical findings and skin marks in simple, clear terms without alarming the patient."},
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
    def _detect_skin_lesion_box(image_bytes: bytes, diagnosis: str, confidence: float) -> list:
        """
        Extract normalized bounding box [x1, y1, x2, y2] for skin lesion ROI
        using saliency and color contrast on skin background.
        """
        import io
        import numpy as np
        from PIL import Image

        try:
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            w, h = pil_img.size
            if w < 10 or h < 10:
                return []

            max_dim = 300
            scale = min(1.0, max_dim / max(w, h))
            proc_w = max(10, int(w * scale))
            proc_h = max(10, int(h * scale))
            thumb = pil_img.resize((proc_w, proc_h), Image.Resampling.BILINEAR)
            arr = np.array(thumb, dtype=np.float32)

            # Luminance / Grayscale: 0.299 R + 0.587 G + 0.114 B
            gray = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
            med_lum = np.median(gray)
            diff_dark = med_lum - gray

            # Erythema (red excess: R - G)
            erythema = arr[:, :, 0] - arr[:, :, 1]
            med_erythema = np.median(erythema)
            diff_red = erythema - med_erythema

            # Exclude outer 6% margin to avoid vignetting or image borders
            border_margin_x = max(1, int(proc_w * 0.06))
            border_margin_y = max(1, int(proc_h * 0.06))
            core_mask = np.zeros_like(gray, dtype=bool)
            core_mask[border_margin_y : proc_h - border_margin_y, border_margin_x : proc_w - border_margin_x] = True

            thresh_dark = np.percentile(diff_dark[core_mask], 96) if np.any(core_mask) else 30.0
            thresh_red = np.percentile(diff_red[core_mask], 96) if np.any(core_mask) else 30.0

            cand_dark = (diff_dark > max(20.0, thresh_dark)) & core_mask
            cand_red = (diff_red > max(20.0, thresh_red)) & core_mask

            if np.sum(cand_dark) >= 15:
                lesion_mask = cand_dark
            elif np.sum(cand_red) >= 15:
                lesion_mask = cand_red
            else:
                return [{
                    "class": diagnosis or "Detected Lesion",
                    "confidence": confidence,
                    "coordinates": [0.25, 0.25, 0.75, 0.75]
                }]

            y_idxs, x_idxs = np.where(lesion_mask)
            if len(x_idxs) == 0:
                return []

            x_min = float(np.percentile(x_idxs, 2)) / proc_w
            x_max = float(np.percentile(x_idxs, 98)) / proc_w
            y_min = float(np.percentile(y_idxs, 2)) / proc_h
            y_max = float(np.percentile(y_idxs, 98)) / proc_h

            pad_x = (x_max - x_min) * 0.08 + 0.02
            pad_y = (y_max - y_min) * 0.08 + 0.02

            box_x1 = max(0.02, round(x_min - pad_x, 4))
            box_y1 = max(0.02, round(y_min - pad_y, 4))
            box_x2 = min(0.98, round(x_max + pad_x, 4))
            box_y2 = min(0.98, round(y_max + pad_y, 4))

            return [{
                "class": diagnosis or "Detected Lesion",
                "confidence": confidence,
                "coordinates": [box_x1, box_y1, box_x2, box_y2]
            }]
        except Exception as e:
            logger.warning(f"Skin lesion localization fallback error: {e}")
            return []

    @staticmethod
    def _normalize_boxes(boxes: list, image_bytes: Optional[bytes]) -> list:
        """
        Normalize bounding boxes to [0.0, 1.0] [x1, y1, x2, y2] using original image dimensions.
        Prevents pixel-coordinate boxes from rendering off-screen or at wrong scale on clients.
        """
        if not boxes:
            return []

        img_w, img_h = None, None
        if image_bytes:
            try:
                import io
                from PIL import Image, ImageOps

                pil_img = ImageOps.exif_transpose(Image.open(io.BytesIO(image_bytes)))
                img_w, img_h = pil_img.size
            except Exception as e:
                logger.warning(f"Could not read image dimensions for box normalization: {e}")

        normalized = []
        for raw_box in boxes:
            if isinstance(raw_box, (list, tuple)) and len(raw_box) >= 4:
                coords = list(raw_box[:4])
                box_obj: Dict[str, Any] = {"coordinates": coords}
            elif isinstance(raw_box, dict):
                coords = list(raw_box.get("coordinates") or raw_box.get("bbox") or [])
                if len(coords) < 4:
                    continue
                box_obj = dict(raw_box)
            else:
                continue

            try:
                x1, y1, x2, y2 = float(coords[0]), float(coords[1]), float(coords[2]), float(coords[3])
            except (TypeError, ValueError):
                continue

            max_val = max(x1, y1, x2, y2)
            # If coordinates are in pixels (> 1.05), scale down to [0.0, 1.0]
            if max_val > 1.05:
                ref_w = float(img_w) if img_w and img_w > 0 else max(640.0, x1, x2)
                ref_h = float(img_h) if img_h and img_h > 0 else max(640.0, y1, y2)
                # Guard against boxes slightly exceeding image size
                denom_w = max(ref_w, x1, x2)
                denom_h = max(ref_h, y1, y2)
                x1, x2 = x1 / denom_w, x2 / denom_w
                y1, y2 = y1 / denom_h, y2 / denom_h

            # Clamp to [0.0, 1.0] and enforce x1 < x2, y1 < y2
            nx1 = max(0.0, min(1.0, min(x1, x2)))
            nx2 = max(0.0, min(1.0, max(x1, x2)))
            ny1 = max(0.0, min(1.0, min(y1, y2)))
            ny2 = max(0.0, min(1.0, max(y1, y2)))

            if nx2 - nx1 <= 0.001 or ny2 - ny1 <= 0.001:
                continue

            norm_coords = [round(nx1, 4), round(ny1, 4), round(nx2, 4), round(ny2, 4)]
            box_obj["coordinates"] = norm_coords
            if "bbox" in box_obj:
                box_obj["bbox"] = norm_coords
            normalized.append(box_obj)

        return normalized

    @staticmethod
    def _extract_prediction(hf_result: Dict[str, Any], scan_type: str, image_bytes: Optional[bytes] = None) -> Dict[str, Any]:
        """Normalize HF model output into a consistent prediction structure with validation."""
        from app.schemas.ai import HFInferenceOutput
        
        try:
            validated_output = HFInferenceOutput.model_validate(hf_result)
        except Exception as e:
            logger.error(f"HF Inference validation failed: {e}")
            return {"diagnosis": "Validation Failed", "confidence": 0.0, "raw": hf_result}
            
        if not validated_output.success:
            return {"diagnosis": "Analysis Failed", "confidence": 0.0, "raw": hf_result}

        normalized_boxes = ImageAnalysisService._normalize_boxes(validated_output.boxes or [], image_bytes)

        if scan_type == "skin":
            boxes = normalized_boxes
            if not boxes and image_bytes:
                boxes = ImageAnalysisService._detect_skin_lesion_box(
                    image_bytes=image_bytes,
                    diagnosis=validated_output.predicted_class or "Skin Lesion",
                    confidence=validated_output.confidence,
                )

            # Clinical differential context for skin lesions
            skin_differentials = [
                "Melanocytic Nevus (Common Mole)",
                "Dysplastic / Atypical Nevus",
                "Seborrheic Keratosis",
                "Dermatofibroma",
                "Inflammatory / Cutaneous Dermatosis"
            ]

            return {
                "diagnosis": validated_output.predicted_class or "Unknown",
                "predicted_class": validated_output.predicted_class or "Unknown",
                "confidence": validated_output.confidence,
                "top_predictions": validated_output.top_predictions or [],
                "boxes": boxes,
                "lesion_category": "Pigmented Cutaneous Lesion / Nevus",
                "differential_diagnoses": skin_differentials,
                "abcde_criteria_indicated": True,
            }
        else:
            return {
                "diagnosis": validated_output.diagnosis or "Unknown",
                "confidence": validated_output.confidence,
                "boxes": normalized_boxes,
            }
