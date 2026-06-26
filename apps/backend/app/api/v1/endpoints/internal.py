from fastapi import APIRouter
from app.ai.client import ai_client

router = APIRouter()

@router.get("/ai-health")
async def check_ai_health():
    """
    Ping the external Hugging Face AI microservice to check its status,
    memory usage, and which models are currently loaded.
    """
    return await ai_client.check_health()
