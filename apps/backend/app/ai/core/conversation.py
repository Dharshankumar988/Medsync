import uuid
from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.ai_chat import chat_message_repo
from app.ai.core.config import ai_config
import logging

logger = logging.getLogger("medsync.ai.conversation")

class ConversationManager:
    @staticmethod
    async def get_recent_messages(db: AsyncSession, session_id: uuid.UUID) -> List[Dict[str, str]]:
        """Retrieve recent conversation history and format for LLM"""
        try:
            # We fetch all messages for the session but only take the last N
            messages = await chat_message_repo.get_by_session(db, session_id)
            
            # Limit to configured max context window
            recent = messages[-ai_config.AI_MAX_CONVERSATION_MESSAGES:] if len(messages) > ai_config.AI_MAX_CONVERSATION_MESSAGES else messages
            
            formatted = []
            for msg in recent:
                formatted.append({
                    "role": getattr(msg.role, "value", msg.role),
                    "content": msg.content
                })
            return formatted
        except Exception as e:
            logger.error(f"Failed to fetch conversation memory for session {session_id}: {e}")
            return []
