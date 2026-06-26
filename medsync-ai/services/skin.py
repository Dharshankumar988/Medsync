import os
import torch
import torch.nn as nn
from torchvision import transforms
from typing import Dict, Any, Optional
from utils.logger import get_logger

logger = get_logger("skin_service")

# Note: In a real scenario, this would load the exact class names used during training.
SKIN_CLASSES = ["Melanoma", "Nevus", "Seborrheic Keratosis", "Basal Cell Carcinoma", "Healthy"]

class SkinClassificationService:
    def __init__(self, model_path: str):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model: Optional[nn.Module] = None
        
        # Standard ImageNet transforms for timm models
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        
        self.load_model(model_path)

    def load_model(self, path: str):
        if not os.path.exists(path):
            logger.error(f"Skin model not found at {path}")
            return
        try:
            # We attempt to load the state dict.
            # Using timm (assuming the user trained an efficientnet_b0)
            import timm
            self.model = timm.create_model('efficientnet_b0', pretrained=False, num_classes=len(SKIN_CLASSES))
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
        
        # Get top 3 predictions
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
