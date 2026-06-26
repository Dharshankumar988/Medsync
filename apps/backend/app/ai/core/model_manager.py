import os

class ModelManager:
    _instance = None
    _models = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
        return cls._instance

    def load_model(self, model_name: str, model_type: str):
        if model_name not in self._models:
            print(f"MODEL_MANAGER: Loading {model_type} model '{model_name}'...")
            # Lazy load actual weights here
            self._models[model_name] = f"Loaded {model_name}"
        return self._models[model_name]

    def get_yolo(self):
        return self.load_model("yolo_v8_medical", "YOLO")

    def get_efficientnet(self):
        return self.load_model("efficientnet_b4_medical", "EfficientNet")

model_manager = ModelManager()
