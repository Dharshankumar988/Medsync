from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "MedSync Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,https://medsync-web.vercel.app,https://medsync.vercel.app,https://entangled-dealmaker-storable.ngrok-free.dev"
    
    # Database
    DATABASE_URL: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_STORAGE_BUCKET: str = "medical-records"
    SUPABASE_STORAGE_MAX_UPLOAD_MB: int = 25
    
    # AI & Decentralized Storage Settings
    GROQ_API_KEY: str = ""
    PINATA_API_KEY: str = ""
    PINATA_SECRET_API_KEY: str = ""
    
    # External AI Microservice
    MEDSYNC_AI_URL: str = "https://dharshan8197-medsync-ai.hf.space"
    MEDSYNC_AI_TOKEN: str = ""
    AI_TIMEOUT: int = 30
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
