from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.ai.prompts.templates import PATIENT_SYSTEM_PROMPT
from app.ai.services.groq_client import groq_client
from app.ai.rag.retriever import RAGRetriever
from app.schemas.ai import ChatRequest

class PatientAIService:
    @staticmethod
    async def handle_chat(db: AsyncSession, patient_id: uuid.UUID, req: ChatRequest):
        # Retrieve context
        rag_context = await RAGRetriever.retrieve_context(req.message)
        
        system_msg = PATIENT_SYSTEM_PROMPT.format(rag_context=rag_context)
        
        messages = [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": req.message}
        ]
        
        # Call Groq
        reply_content = await groq_client.chat_completion(messages)
        
        return {"session_id": req.session_id or uuid.uuid4(), "reply": reply_content}
