import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Application Config
    APP_NAME: str = "MedSync AI Inference Service"
    ENVIRONMENT: str = "production"
    
    # Model Paths
    MODEL_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
    BONE_MODEL_PATH: str = os.path.join(MODEL_DIR, "bone.pt")
    BRAIN_MODEL_PATH: str = os.path.join(MODEL_DIR, "brain.pt")
    KIDNEY_MODEL_PATH: str = os.path.join(MODEL_DIR, "kidney.pt")
    SKIN_MODEL_PATH: str = os.path.join(MODEL_DIR, "skin.pth")
    
    # Security
    AI_SERVICE_TOKEN: str = ""
    MAX_UPLOAD_SIZE_MB: int = 10
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
