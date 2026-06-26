import os
import torch
import torch.nn as nn
import torchvision
from torchvision import transforms
from typing import Dict, Any, Optional
from utils.logger import get_logger

logger = get_logger("skin_service")

SKIN_CLASSES = [
    "acne",
    "eczema",
    "fungal",
    "infection",
    "normal",
    "psoriasis",
    "tumor"
]

class SkinClassificationService:
    def __init__(self, model_path: str):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model: Optional[nn.Module] = None
        
        # Exact preprocessing requested by user
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.5], [0.5])
        ])
        
        self.load_model(model_path)

    def load_model(self, path: str):
        if not os.path.exists(path):
            logger.error(f"Skin model not found at {path}")
            return
        try:
            # Exact model architecture requested by user
            self.model = torchvision.models.efficientnet_b0(weights=None)
            self.model.classifier[1] = nn.Linear(self.model.classifier[1].in_features, 7)
            
            # Load state dict
            self.model.load_state_dict(torch.load(path, map_location=self.device))
            self.model.to(self.device)
            self.model.eval()
            
            logger.info("Skin model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load skin model: {str(e)}")
            self.model = None

    def predict(self, pil_image) -> Dict[str, Any]:
        if self.model is None:
            raise ValueError("Model not loaded")
            
        tensor = self.transform(pil_image).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            outputs = self.model(tensor)
            probabilities = torch.nn.functional.softmax(outputs, dim=1)[0]
            
        top_prob, top_idx = torch.max(probabilities, dim=0)
        
        # Get top predictions
        top3_prob, top3_idx = torch.topk(probabilities, k=min(3, len(SKIN_CLASSES)))
        
        top_predictions = []
        for i in range(len(top3_idx)):
            idx = top3_idx[i].item()
            prob = float(top3_prob[i].cpu().numpy())
            top_predictions.append({
                "class": SKIN_CLASSES[idx],
                "confidence": round(prob, 4)
            })

        return {
            "predicted_class": SKIN_CLASSES[top_idx.item()],
            "confidence": round(float(top_prob.cpu().numpy()), 4),
            "top_predictions": top_predictions
        }
