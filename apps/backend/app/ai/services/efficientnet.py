from app.ai.client import ai_client

class EfficientNetService:
    @staticmethod
    async def classify_image(image_bytes: bytes):
        try:
            raw = await ai_client.predict("skin", image_bytes)
        except Exception:
            return {
                "model_used": "efficientnet_b4_medical (fallback)",
                "top_predictions": [],
                "inference_time_ms": 0,
                "error": "AI Microservice Unreachable"
            }
            
        top_predictions = []
        for pred in raw.get("top_predictions", []):
            top_predictions.append({
                "label": pred.get("class", ""),
                "probability": pred.get("confidence", 0.0)
            })
            
        return {
            "model_used": "external_efficientnet_microservice",
            "top_predictions": top_predictions,
            "inference_time_ms": int(raw.get("processing_time", 0) * 1000),
            "raw_external": raw
        }
