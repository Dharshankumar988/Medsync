from app.ai.client import ai_client

class YOLOService:
    @staticmethod
    async def analyze_image(image_bytes: bytes, scan_type: str = "bone"):
        # Call external Hugging Face AI Service
        try:
            raw = await ai_client.predict(scan_type, image_bytes)
        except Exception:
            # Fallback graceful failure if AI is down
            return {
                "model_used": "yolo_v8_medical (fallback)",
                "findings": [],
                "inference_time_ms": 0,
                "error": "AI Microservice Unreachable"
            }
            
        # Map to preserve 100% frontend compatibility
        findings = []
        for box in raw.get("boxes", []):
            findings.append({
                "class": box.get("class", ""),
                "confidence": box.get("confidence", 0.0),
                "bbox": box.get("coordinates", [])
            })
            
        return {
            "model_used": "external_yolo_microservice",
            "findings": findings,
            "inference_time_ms": int(raw.get("processing_time", 0) * 1000),
            "raw_external": raw
        }
