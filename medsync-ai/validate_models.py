import os
import torch
import torchvision
import torch.nn as nn
from torchvision import transforms
from ultralytics import YOLO
from PIL import Image
import numpy as np
import cv2

base_dir = r"C:\IMP PROJECTS\cgip Mini project\CGIP project\PULSE-PROTOTYPE"

models = {
    "bone": {
        "path": os.path.join(base_dir, "fracture_model.pt"),
        "type": "YOLO",
        "sample": os.path.join(base_dir, r"samples\sample_fracture.jpg")
    },
    "brain": {
        "path": os.path.join(base_dir, "brain_model.pt"),
        "type": "YOLO",
        "sample": os.path.join(base_dir, r"samples\sample_brain.jpg")
    },
    "kidney": {
        "path": os.path.join(base_dir, "kidney_model.pt"),
        "type": "YOLO",
        "sample": os.path.join(base_dir, r"samples\sample_kidney.png")
    },
    "skin": {
        "path": os.path.join(base_dir, "skin_model.pt"),
        "type": "EfficientNet",
        "sample": None
    }
}

SKIN_CLASSES = ["acne", "eczema", "fungal", "infection", "normal", "psoriasis", "tumor"]

print("================ VALIDATION REPORT ================")

for name, info in models.items():
    path = info["path"]
    mtype = info["type"]
    sample_path = info["sample"]
    
    print(f"\nMODEL: {name.upper()}")
    print(f"FILE: {os.path.basename(path)}")
    print(f"FULL PATH: {path}")
    print(f"FILE SIZE: {os.path.getsize(path)} bytes" if os.path.exists(path) else "FILE SIZE: NOT FOUND")
    
    if not os.path.exists(path):
        print("VALIDATION RESULT: FAILED (File does not exist)")
        continue
        
    print(f"FORMAT: {os.path.splitext(path)[1]}")
    print(f"EXPECTED ARCHITECTURE: {mtype}")
    
    can_load = False
    validation = "FAILED"
    
    if mtype == "YOLO":
        try:
            model = YOLO(path)
            can_load = True
            print(f"ARCHITECTURE DETECTED: YOLO ({model.task})")
            print(f"CLASSES: {model.names}")
            
            # Try inference
            if sample_path and os.path.exists(sample_path):
                img = cv2.imread(sample_path)
            else:
                img = np.zeros((224, 224, 3), dtype=np.uint8)
                
            res = model(img, verbose=False)
            print("INFERENCE TEST: SUCCESS")
            validation = "SUCCESS"
        except Exception as e:
            print(f"INFERENCE TEST: FAILED ({e})")
            
    elif mtype == "EfficientNet":
        try:
            device = torch.device("cpu")
            model = torchvision.models.efficientnet_b0(weights=None)
            model.classifier[1] = nn.Linear(model.classifier[1].in_features, 7)
            
            # Load state dict
            state_dict = torch.load(path, map_location=device)
            model.load_state_dict(state_dict)
            can_load = True
            
            print("ARCHITECTURE DETECTED: EfficientNet-B0")
            print("CLASSES CONFIGURED: 7 (matching expected skin classes)")
            
            model.eval()
            
            # Inference
            transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
            ])
            
            if sample_path and os.path.exists(sample_path):
                pil_img = Image.open(sample_path).convert("RGB")
            else:
                pil_img = Image.new("RGB", (224, 224), (128, 128, 128))
                
            tensor = transform(pil_img).unsqueeze(0).to(device)
            with torch.inference_mode():
                out = model(tensor)
                prob = torch.nn.functional.softmax(out, dim=1)[0]
                
            print("INFERENCE TEST: SUCCESS")
            validation = "SUCCESS"
            
        except Exception as e:
            print(f"INFERENCE TEST: FAILED ({e})")
            
    print(f"CAN IT BE LOADED: {can_load}")
    print(f"VALIDATION RESULT: {validation}")

print("\n===================================================")
