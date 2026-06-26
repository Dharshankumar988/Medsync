from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "MedSync Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    JWT_SECRET: str = "super_secret_key_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://medsync:medsync@localhost:5432/medsync_dev"
    
    # AI & IPFS (Placeholders for now)
    GROQ_API_KEY: str = ""
    PINATA_API_KEY: str = ""
    PINATA_SECRET_API_KEY: str = ""
    
    # External AI Microservice
    AI_SERVICE_URL: str = "http://localhost:8080"
    AI_SERVICE_TOKEN: str = ""
    AI_TIMEOUT: int = 30
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
