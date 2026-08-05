import uuid
import time
import logging
from typing import AsyncGenerator, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_chat import AIChatSession, AIChatMessage, AIChatRole
from app.repositories.ai_chat import chat_session_repo, chat_message_repo
from app.schemas.ai import ChatRequest
from app.ai.prompts.templates import PHARMACY_SYSTEM_PROMPT
from app.ai.core.service_manager import ai_service_manager
from app.ai.rag.retriever import RAGRetriever
from app.ai.core.conversation import ConversationManager
from app.ai.core.config import ai_config

logger = logging.getLogger("medsync.ai.pharmacy")

class PharmacyAIService:
    @staticmethod
    async def _get_or_create_session(db: AsyncSession, pharmacy_id: uuid.UUID, session_id: uuid.UUID | None) -> AIChatSession:
        if session_id:
            session = await chat_session_repo.get(db, session_id)
            if not session or session.user_id != pharmacy_id:
                raise ValueError("Invalid or unauthorized chat session.")
            return session
        
        new_session = AIChatSession(
            id=uuid.uuid4(),
            user_id=pharmacy_id,
            title="Pharmacy Support Chat",
            is_doctor_mode=False
        )
        db.add(new_session)
        await db.flush()
        return new_session

    @staticmethod
    async def _save_message(db: AsyncSession, session_id: uuid.UUID, role: AIChatRole, content: str, model_used: str = None, inference_time: int = None):
        msg = AIChatMessage(
            id=uuid.uuid4(),
            session_id=session_id,
            role=role,
            content=content,
            model_used=model_used,
            inference_time_ms=inference_time
        )
        db.add(msg)
        await db.flush()
        return msg

    @staticmethod
    async def _build_messages(db: AsyncSession, session_id: uuid.UUID, user_message: str, specific_instruction: str = None) -> List[Dict[str, str]]:
        rag_context = await RAGRetriever.retrieve_context(user_message)
        
        system_msg_content = PHARMACY_SYSTEM_PROMPT.format(rag_context=rag_context)
        if specific_instruction:
            system_msg_content += f"\n\nCRITICAL INSTRUCTION FOR THIS REQUEST: {specific_instruction}"

        history = await ConversationManager.get_recent_messages(db, session_id)
        
        messages = [{"role": "system", "content": system_msg_content}]
        messages.extend(history)
        messages.append({"role": "user", "content": user_message})
        
        return messages

    @staticmethod
    async def handle_chat(db: AsyncSession, pharmacy_id: uuid.UUID, req: ChatRequest) -> Dict[str, Any]:
        session = await PharmacyAIService._get_or_create_session(db, pharmacy_id, req.session_id)
        await PharmacyAIService._save_message(db, session.id, AIChatRole.USER, req.message)
        
        messages = await PharmacyAIService._build_messages(db, session.id, req.message)
        
        start_time = time.time()
        client = ai_service_manager.get_llm_client()
        model_name = ai_config.GROQ_MODEL_PHARMACY
        
        reply_content = await client.chat_completion(messages=messages, model=model_name, temperature=0.1)
        inference_time = int((time.time() - start_time) * 1000)
        
        await PharmacyAIService._save_message(db, session.id, AIChatRole.ASSISTANT, reply_content, model_name, inference_time)
        await db.commit()
        
        return {"session_id": session.id, "reply": reply_content}

    @staticmethod
    async def handle_chat_stream(db: AsyncSession, pharmacy_id: uuid.UUID, req: ChatRequest) -> AsyncGenerator[str, None]:
        session = await PharmacyAIService._get_or_create_session(db, pharmacy_id, req.session_id)
        await PharmacyAIService._save_message(db, session.id, AIChatRole.USER, req.message)
        await db.commit()
        
        messages = await PharmacyAIService._build_messages(db, session.id, req.message)
        
        client = ai_service_manager.get_llm_client()
        model_name = ai_config.GROQ_MODEL_PHARMACY
        
        full_reply = ""
        start_time = time.time()
        
        stream = client.chat_stream(messages=messages, model=model_name, temperature=0.1)
        async for chunk in stream:
            full_reply += chunk
            yield chunk
            
        inference_time = int((time.time() - start_time) * 1000)
        await PharmacyAIService._save_message(db, session.id, AIChatRole.ASSISTANT, full_reply, model_name, inference_time)
        await db.commit()

    # Specialized Pharmacy Capabilities
    @staticmethod
    async def interpret_prescription(db: AsyncSession, pharmacy_id: uuid.UUID, session_id: uuid.UUID, rx_data: str) -> Dict[str, Any]:
        instruction = "Interpret this prescription data. Clarify ambiguous dosing instructions, identify the drug class, and verify the indication. Include black box warnings and adverse effects."
        return await PharmacyAIService._execute_structured_task(db, pharmacy_id, session_id, rx_data, instruction)

    @staticmethod
    async def receive_prescription(db: AsyncSession, pharmacy_id: uuid.UUID, session_id: uuid.UUID, prescription_details: str, inventory_context: str) -> Dict[str, Any]:
        context = f"Prescription: {prescription_details}\nLocal Inventory: {inventory_context}"
        instruction = "Process this incoming prescription. Recommend generic/brand substitutes if out of stock based on the inventory context. Estimate refill timing for the patient, and identify any immediate counseling points."
        return await PharmacyAIService._execute_structured_task(db, pharmacy_id, session_id, context, instruction)

    @staticmethod
    async def warn_drug_interactions(db: AsyncSession, pharmacy_id: uuid.UUID, session_id: uuid.UUID, medications: str) -> Dict[str, Any]:
        instruction = "Check the provided medication list for drug-drug interactions, contraindications, and duplication of therapy. Use professional pharmacy terminology."
        return await PharmacyAIService._execute_structured_task(db, pharmacy_id, session_id, medications, instruction)

    @staticmethod
    async def guide_dosage(db: AsyncSession, pharmacy_id: uuid.UUID, session_id: uuid.UUID, context: str) -> Dict[str, Any]:
        instruction = "Provide evidence-based dosing guidance for the specified medication, including renal/hepatic adjustments if applicable."
        return await PharmacyAIService._execute_structured_task(db, pharmacy_id, session_id, context, instruction)

    @staticmethod
    async def suggest_alternatives(db: AsyncSession, pharmacy_id: uuid.UUID, session_id: uuid.UUID, medication: str) -> Dict[str, Any]:
        instruction = "Suggest pharmacologically equivalent or therapeutically similar alternative medications. List generic and common brand names."
        return await PharmacyAIService._execute_structured_task(db, pharmacy_id, session_id, medication, instruction)

    @staticmethod
    async def analyze_inventory(db: AsyncSession, pharmacy_id: uuid.UUID, session_id: uuid.UUID, stock_data: str) -> Dict[str, Any]:
        instruction = "Analyze this inventory data. Identify slow-moving stock, medications approaching expiry, and forecast potential stockouts based on common dispensing patterns."
        return await PharmacyAIService._execute_structured_task(db, pharmacy_id, session_id, stock_data, instruction)

    @staticmethod
    async def assist_dispensing(db: AsyncSession, pharmacy_id: uuid.UUID, session_id: uuid.UUID, context: str) -> Dict[str, Any]:
        instruction = "Provide dispensing assistance, including required patient counseling points (e.g., take with food, avoid alcohol) and specific storage requirements."
        return await PharmacyAIService._execute_structured_task(db, pharmacy_id, session_id, context, instruction)

    @staticmethod
    async def _execute_structured_task(db: AsyncSession, pharmacy_id: uuid.UUID, session_id: uuid.UUID, user_input: str, instruction: str) -> Dict[str, Any]:
        session = await PharmacyAIService._get_or_create_session(db, pharmacy_id, session_id)
        await PharmacyAIService._save_message(db, session.id, AIChatRole.USER, user_input)
        
        messages = await PharmacyAIService._build_messages(db, session.id, user_input, specific_instruction=instruction)
        
        start_time = time.time()
        client = ai_service_manager.get_llm_client()
        model_name = ai_config.GROQ_MODEL_PHARMACY
        
        reply_content = await client.chat_completion(messages=messages, model=model_name, temperature=0.1)
        inference_time = int((time.time() - start_time) * 1000)
        
        await PharmacyAIService._save_message(db, session.id, AIChatRole.ASSISTANT, reply_content, model_name, inference_time)
        await db.commit()
        return {"session_id": session.id, "reply": reply_content}
