from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "MedSync Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://supabase_user:supabase_password@supabase-host.supabase.co:5432/postgres?ssl=require"
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_STORAGE_BUCKET: str = "medical-records"
    SUPABASE_STORAGE_MAX_UPLOAD_MB: int = 25
    
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
