import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import torch

class Settings(BaseSettings):
    # Application Config
    APP_NAME: str = "MedSync AI Inference Service"
    ENVIRONMENT: str = "production"
    
    # Model Paths & Hugging Face Config
    # Local development keeps the four approved weights in the repository root.
    # Deployments can override MODEL_DIR and keep the same filenames.
    MODEL_DIR: str = os.getenv(
        "MODEL_DIR",
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "models"),
    )
    BONE_MODEL_PATH: str = os.path.join(MODEL_DIR, "bone.pt")
    BRAIN_MODEL_PATH: str = os.path.join(MODEL_DIR, "brain.pt")
    KIDNEY_MODEL_PATH: str = os.path.join(MODEL_DIR, "kidney.pt")
    SKIN_MODEL_PATH: str = os.path.join(MODEL_DIR, "skin_model.pt")
    
    HF_TOKEN: Optional[str] = None
    HF_MODEL_REPO_ID: str = "Dharshankumar988/medsync-ai-weights" # Default placeholder repo
    MODEL_CACHE_DIR: str = os.path.join(MODEL_DIR, "cache")
    
    # Security
    AI_SERVICE_TOKEN: str = ""
    MAX_UPLOAD_SIZE_MB: int = 10
    
    # Hardware
    DEVICE: str = "cuda" if torch.cuda.is_available() else "cpu"
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
