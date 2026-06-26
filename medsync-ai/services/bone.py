import os
import torch
from ultralytics import YOLO
from typing import Dict, Any, Optional
from utils.logger import get_logger

logger = get_logger("bone_service")

class BoneDetectionService:
    def __init__(self, model_path: str):
        self.model: Optional[YOLO] = None
        self.load_model(model_path)

    def load_model(self, path: str):
        if not os.path.exists(path):
            logger.error(f"Bone model not found at {path}")
            return
        try:
            # We attempt to load the model. 
            # If the file is invalid/empty, this will throw an error.
            self.model = YOLO(path)
            logger.info("Bone model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load bone model: {str(e)}")
            self.model = None

    def predict(self, image_np) -> Dict[str, Any]:
        if self.model is None:
            raise ValueError("Model not loaded")
            
        results = self.model(image_np, verbose=False)
        result = results[0]
        
        boxes = []
        highest_conf = 0.0
        best_class = "No Fracture Detected"
        
        for box in result.boxes:
            conf = float(box.conf[0].cpu().numpy())
            cls_id = int(box.cls[0].cpu().numpy())
            class_name = result.names[cls_id]
            coords = box.xyxy[0].cpu().numpy().tolist()
            
            boxes.append({
                "class": class_name,
                "confidence": conf,
                "coordinates": [round(c, 2) for c in coords]
            })
            
            if conf > highest_conf:
                highest_conf = conf
                best_class = class_name

        return {
            "diagnosis": best_class,
            "confidence": round(highest_conf, 4),
            "boxes": boxes
        }
