from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.ai.prompts.templates import DOCTOR_SYSTEM_PROMPT
from app.ai.services.groq_client import groq_client
from app.ai.rag.retriever import RAGRetriever
from app.repositories.ai_chat import chat_session_repo, chat_message_repo
from app.schemas.ai import ChatRequest

class DoctorAIService:
    @staticmethod
    async def handle_chat(db: AsyncSession, doctor_id: uuid.UUID, req: ChatRequest):
        # Retrieve context
        rag_context = await RAGRetriever.retrieve_context(req.message)
        
        system_msg = DOCTOR_SYSTEM_PROMPT.format(history="No specific patient history provided.", rag_context=rag_context)
        
        messages = [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": req.message}
        ]
        
        # Call Groq
        reply_content = await groq_client.chat_completion(messages)
        
        return {"session_id": req.session_id or uuid.uuid4(), "reply": reply_content}
