import logging
from app.ai.core.model_manager import model_manager
from app.ai.services.groq_client import groq_client
from app.ai.core.health import ai_health_monitor

logger = logging.getLogger("medsync.ai.service_manager")

class AIServiceManager:
    """Central entry point for AI backend services"""
    
    @staticmethod
    async def get_health_status():
        return await ai_health_monitor.check_all(groq_client, model_manager)

    @staticmethod
    def get_model_manager():
        return model_manager

    @staticmethod
    def get_llm_client():
        return groq_client

ai_service_manager = AIServiceManager()
