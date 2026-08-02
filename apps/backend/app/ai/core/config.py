import os
from pydantic_settings import BaseSettings

class AIConfig(BaseSettings):
    # Groq Models Config
    GROQ_MODEL_DOCTOR: str = os.getenv("GROQ_MODEL_DOCTOR", "llama-3.3-70b-versatile")
    GROQ_MODEL_PATIENT: str = os.getenv("GROQ_MODEL_PATIENT", "llama-3.1-8b-instant")
    GROQ_MODEL_PHARMACY: str = os.getenv("GROQ_MODEL_PHARMACY", "llama-3.1-8b-instant")
    GROQ_MODEL_ADMIN: str = os.getenv("GROQ_MODEL_ADMIN", "llama-3.1-8b-instant")
    
    # Hugging Face Endpoints
    HF_TOKEN: str = os.getenv("HF_TOKEN", "")
    HF_UNIFIED_SPACE_URL: str = os.getenv("HF_UNIFIED_SPACE_URL", "http://localhost:8080")
    HF_BONE_SPACE_URL: str = os.getenv("HF_BONE_SPACE_URL", "")
    HF_BRAIN_SPACE_URL: str = os.getenv("HF_BRAIN_SPACE_URL", "")
    HF_KIDNEY_SPACE_URL: str = os.getenv("HF_KIDNEY_SPACE_URL", "")
    HF_SKIN_SPACE_URL: str = os.getenv("HF_SKIN_SPACE_URL", "")
    
    # RAG Config
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    
    # Operational Config
    AI_CONFIDENCE_THRESHOLD: float = float(os.getenv("AI_CONFIDENCE_THRESHOLD", "0.7"))
    AI_MAX_CONVERSATION_MESSAGES: int = int(os.getenv("AI_MAX_CONVERSATION_MESSAGES", "20"))
    
    class Config:
        env_file = ".env"
        extra = "ignore"

ai_config = AIConfig()
