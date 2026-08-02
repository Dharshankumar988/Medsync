import os
import logging
import cv2
import numpy as np
from typing import Dict, Any, Optional
from app.ai.services.groq_client import groq_client
import json

logger = logging.getLogger("medsync.ocr")

class OCRService:
    @staticmethod
    def _preprocess_image(image_bytes: bytes) -> np.ndarray:
        """Applies medical-grade image enhancement for OCR."""
        # Convert bytes to numpy array
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Noise reduction
        denoised = cv2.fastNlMeansDenoising(gray, h=30)
        
        # Adaptive Thresholding to handle shadows/uneven lighting in medical scans
        binary = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        return binary

    @staticmethod
    async def process_file(file_path: str, image_bytes: Optional[bytes] = None) -> Dict[str, Any]:
        """
        Production-grade OCR pipeline using Tesseract + Groq for structuring.
        Supports passing raw bytes to avoid disk IO if already in memory.
        """
        logger.info(f"Processing OCR extraction")
        
        try:
            import pytesseract
            
            if image_bytes is None:
                if not os.path.exists(file_path):
                    raise FileNotFoundError(f"Image not found at {file_path}")
                with open(file_path, "rb") as f:
                    image_bytes = f.read()

            # 1. Preprocess
            processed_img = OCRService._preprocess_image(image_bytes)
            
            # 2. Extract Text
            raw_text = pytesseract.image_to_string(processed_img, config='--psm 3')
            
            if not raw_text or len(raw_text.strip()) < 5:
                return {
                    "extracted_text": "",
                    "structured_data": None,
                    "confidence": 0.0,
                    "error": "No legible text found in image"
                }

            # 3. Structure with LLM (Groq)
            structuring_prompt = (
                "You are a medical OCR parser. Analyze the following raw OCR text and return a JSON object.\n"
                "Extract key fields like 'Patient Name', 'Date', 'Diagnosis', 'Medications', or 'Lab Results' if present.\n"
                "Text:\n" + raw_text + "\n"
                "Return ONLY valid JSON."
            )
            
            llm_response = await groq_client.generate_standard_response(
                system_prompt="Return only JSON.",
                user_message=structuring_prompt
            )
            
            structured_data = {}
            try:
                # Find JSON block
                json_str = llm_response
                if "```json" in json_str:
                    json_str = json_str.split("```json")[1].split("```")[0]
                structured_data = json.loads(json_str.strip())
            except:
                logger.warning("Failed to parse LLM structured OCR data.")

            return {
                "extracted_text": raw_text.strip(),
                "structured_data": structured_data,
                "confidence": 0.88, # Baseline confidence for Tesseract + LLM pass
                "engine": "pytesseract+groq"
            }

        except ImportError:
            logger.error("pytesseract or opencv not installed. Returning fallback.")
            return {
                "extracted_text": "OCR Engine Unavailable. Please install pytesseract and opencv-python.",
                "confidence": 0.0,
                "engine": "fallback"
            }
        except Exception as e:
            logger.error(f"OCR Pipeline failed: {e}", exc_info=True)
            return {
                "extracted_text": "",
                "confidence": 0.0,
                "error": str(e)
            }
