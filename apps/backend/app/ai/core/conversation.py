import uuid
from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.ai_chat import chat_message_repo
from app.ai.core.config import ai_config
from app.ai.services.groq_client import groq_client
import logging

logger = logging.getLogger("medsync.ai.conversation")

class ConversationManager:
    @staticmethod
    async def get_recent_messages(db: AsyncSession, session_id: uuid.UUID) -> List[Dict[str, str]]:
        """Retrieve recent conversation history and format for LLM"""
        try:
            # We fetch all messages for the session but only take the last N
            messages = await chat_message_repo.get_by_session(db, session_id)
            
            if len(messages) > ai_config.AI_MAX_CONVERSATION_MESSAGES:
                # We have too many messages, let's keep the recent ones
                recent = messages[-ai_config.AI_MAX_CONVERSATION_MESSAGES:]
                
                # We could implement a summarizer here for the dropped messages
                # For now, we just truncate and add a system note
                formatted = [{"role": "system", "content": f"[System Note: Earlier conversation history ({len(messages) - len(recent)} messages) has been truncated.]"}]
            else:
                recent = messages
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

    @staticmethod
    async def summarize_history(db: AsyncSession, session_id: uuid.UUID) -> str:
        """Generate a summary of the conversation history for context preservation."""
        messages = await chat_message_repo.get_by_session(db, session_id)
        if not messages:
            return ""
            
        history_text = "\n".join([f"{msg.role}: {msg.content}" for msg in messages])
        
        try:
            summary = await groq_client.generate_standard_response(
                system_prompt="You are an AI assistant. Summarize the following medical conversation history concisely.",
                user_message=f"Conversation History:\n{history_text}",
                max_tokens=256
            )
            return summary
        except Exception as e:
            logger.error(f"Failed to summarize conversation history: {e}")
            return ""
    @staticmethod
    async def get_patient_history_summary(db: AsyncSession, doctor_id: uuid.UUID, patient_id: uuid.UUID, current_session_id: uuid.UUID) -> str:
        """Retrieve and summarize previous authorized conversations for this patient"""
        try:
            from sqlalchemy import select
            from app.models.ai_chat import AIChatSession, AIChatMessage
            
            # Fetch all past sessions between this doctor and patient, excluding current
            stmt = (
                select(AIChatSession)
                .where(AIChatSession.user_id == doctor_id)
                .where(AIChatSession.patient_id == patient_id)
                .where(AIChatSession.id != current_session_id)
                .order_by(AIChatSession.created_at.desc())
                .limit(5)
            )
            result = await db.execute(stmt)
            past_sessions = result.scalars().all()
            
            if not past_sessions:
                return "No previous conversations found for this patient."
                
            history_chunks = []
            for s in past_sessions:
                messages = await chat_message_repo.get_by_session(db, s.id)
                history_text = "\n".join([f"{msg.role}: {msg.content}" for msg in messages[-4:]]) # Last 4 messages per session
                history_chunks.append(f"--- Session on {s.created_at.strftime('%Y-%m-%d')} ---\n{history_text}")
                
            combined_history = "\n\n".join(history_chunks)
            return combined_history
        except Exception as e:
            logger.error(f"Failed to fetch patient history summary: {e}")
            return "Error retrieving past history."
