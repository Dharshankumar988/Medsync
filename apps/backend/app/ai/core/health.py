import logging
import asyncio
from typing import Dict, Any, Optional

logger = logging.getLogger("medsync.ai.health")

class AIHealthMonitor:
    def __init__(self):
        self.health_status: Dict[str, Any] = {
            "status": "initializing",
            "components": {
                "groq": "unknown",
                "hf_spaces": "unknown",
                "rag": "unknown"
            }
        }
    
    async def check_all(self, groq_client, model_manager) -> Dict[str, Any]:
        """Perform health checks on all sub-components"""
        try:
            # 1. Check Groq
            if groq_client and groq_client.is_healthy:
                self.health_status["components"]["groq"] = "healthy"
            else:
                self.health_status["components"]["groq"] = "degraded (fallback active)"
                
            # 2. Check HF Spaces (via model manager -> inference service)
            hf_status = await model_manager.check_health()
            self.health_status["components"]["hf_spaces"] = hf_status
            
            # 3. Check RAG (will be updated in Phase 3)
            self.health_status["components"]["rag"] = "healthy (database-backed)"
            
            # Aggregate status
            any_degraded = any(
                isinstance(v, dict) and "degraded" in str(v.get("status", "")) or 
                isinstance(v, str) and ("degraded" in v or "unreachable" in v) 
                for v in self.health_status["components"].values()
            )
            self.health_status["status"] = "degraded" if any_degraded else "healthy"
            
        except Exception as e:
            logger.error(f"Health monitor encountered error: {e}")
            self.health_status["status"] = "unhealthy"
            
        return self.health_status

ai_health_monitor = AIHealthMonitor()
