import uuid
import time
import logging
from typing import AsyncGenerator, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_chat import AIChatSession, AIChatMessage, AIChatRole
from app.repositories.ai_chat import chat_session_repo, chat_message_repo
from app.schemas.ai import ChatRequest
from app.ai.prompts.templates import PATIENT_SYSTEM_PROMPT
from app.ai.core.service_manager import ai_service_manager
from app.ai.rag.retriever import RAGRetriever
from app.ai.core.conversation import ConversationManager
from app.ai.core.config import ai_config

logger = logging.getLogger("medsync.ai.patient")

class PatientAIService:
    @staticmethod
    async def _get_or_create_session(db: AsyncSession, patient_id: uuid.UUID, session_id: uuid.UUID | None) -> AIChatSession:
        if session_id:
            session = await chat_session_repo.get(db, session_id)
            if not session or session.user_id != patient_id:
                raise ValueError("Invalid or unauthorized chat session.")
            return session
        
        new_session = AIChatSession(
            id=uuid.uuid4(),
            user_id=patient_id,
            title="Patient Support Chat",
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
        
        system_msg_content = PATIENT_SYSTEM_PROMPT.format(rag_context=rag_context)
        if specific_instruction:
            system_msg_content += f"\n\nCRITICAL INSTRUCTION FOR THIS REQUEST: {specific_instruction}"

        history = await ConversationManager.get_recent_messages(db, session_id)
        
        messages = [{"role": "system", "content": system_msg_content}]
        messages.extend(history)
        messages.append({"role": "user", "content": user_message})
        
        return messages

    @staticmethod
    async def handle_chat(db: AsyncSession, patient_id: uuid.UUID, req: ChatRequest) -> Dict[str, Any]:
        session = await PatientAIService._get_or_create_session(db, patient_id, req.session_id)
        await PatientAIService._save_message(db, session.id, AIChatRole.USER, req.message)
        
        messages = await PatientAIService._build_messages(db, session.id, req.message)
        
        start_time = time.time()
        client = ai_service_manager.get_llm_client()
        model_name = ai_config.GROQ_MODEL_PATIENT
        
        reply_content = await client.chat_completion(messages=messages, model=model_name, temperature=0.3)
        inference_time = int((time.time() - start_time) * 1000)
        
        await PatientAIService._save_message(db, session.id, AIChatRole.ASSISTANT, reply_content, model_name, inference_time)
        await db.commit()
        
        return {"session_id": session.id, "reply": reply_content}

    @staticmethod
    async def handle_chat_stream(db: AsyncSession, patient_id: uuid.UUID, req: ChatRequest) -> AsyncGenerator[str, None]:
        session = await PatientAIService._get_or_create_session(db, patient_id, req.session_id)
        await PatientAIService._save_message(db, session.id, AIChatRole.USER, req.message)
        await db.commit()
        
        messages = await PatientAIService._build_messages(db, session.id, req.message)
        
        client = ai_service_manager.get_llm_client()
        model_name = ai_config.GROQ_MODEL_PATIENT
        
        full_reply = ""
        start_time = time.time()
        
        stream = client.chat_stream(messages=messages, model=model_name, temperature=0.3)
        async for chunk in stream:
            full_reply += chunk
            yield chunk
            
        inference_time = int((time.time() - start_time) * 1000)
        await PatientAIService._save_message(db, session.id, AIChatRole.ASSISTANT, full_reply, model_name, inference_time)
        await db.commit()

    # Specialized Patient Capabilities
    @staticmethod
    async def guide_symptoms(db: AsyncSession, patient_id: uuid.UUID, session_id: uuid.UUID, symptoms: str) -> Dict[str, Any]:
        instruction = "Provide gentle guidance on these symptoms. Emphasize that you are NOT a doctor and cannot diagnose. Advise when to seek immediate emergency care vs scheduling a standard appointment."
        return await PatientAIService._execute_structured_task(db, patient_id, session_id, symptoms, instruction)

    @staticmethod
    async def remind_medications(db: AsyncSession, patient_id: uuid.UUID, session_id: uuid.UUID, context: str) -> Dict[str, Any]:
        instruction = "Remind the patient about their medication schedule. Explain the purpose of each medication simply. Do not alter dosages."
        return await PatientAIService._execute_structured_task(db, patient_id, session_id, context, instruction)

    @staticmethod
    async def educate_health(db: AsyncSession, patient_id: uuid.UUID, session_id: uuid.UUID, topic: str) -> Dict[str, Any]:
        instruction = "Provide a simple, 8th-grade reading level explanation of this health topic. Use analogies where helpful."
        return await PatientAIService._execute_structured_task(db, patient_id, session_id, topic, instruction)

    @staticmethod
    async def explain_medical_record(db: AsyncSession, patient_id: uuid.UUID, session_id: uuid.UUID, record_data: str) -> Dict[str, Any]:
        instruction = "Translate this medical record/report into plain English for the patient. Reassure them and advise them to discuss specifics with their doctor."
        return await PatientAIService._execute_structured_task(db, patient_id, session_id, record_data, instruction)

    @staticmethod
    async def guide_lifestyle(db: AsyncSession, patient_id: uuid.UUID, session_id: uuid.UUID, conditions: str) -> Dict[str, Any]:
        instruction = "Suggest general, safe lifestyle and dietary adjustments appropriate for someone with these conditions. Emphasize consulting a physician before making major changes."
        return await PatientAIService._execute_structured_task(db, patient_id, session_id, conditions, instruction)

    @staticmethod
    async def recommend_follow_up(db: AsyncSession, patient_id: uuid.UUID, session_id: uuid.UUID, context: str) -> Dict[str, Any]:
        instruction = "Provide a clear summary of next steps and follow-up recommendations based on the recent appointment or hospital visit context provided."
        return await PatientAIService._execute_structured_task(db, patient_id, session_id, context, instruction)

    @staticmethod
    async def _execute_structured_task(db: AsyncSession, patient_id: uuid.UUID, session_id: uuid.UUID, user_input: str, instruction: str) -> Dict[str, Any]:
        session = await PatientAIService._get_or_create_session(db, patient_id, session_id)
        await PatientAIService._save_message(db, session.id, AIChatRole.USER, user_input)
        
        messages = await PatientAIService._build_messages(db, session.id, user_input, specific_instruction=instruction)
        
        start_time = time.time()
        client = ai_service_manager.get_llm_client()
        model_name = ai_config.GROQ_MODEL_PATIENT
        
        reply_content = await client.chat_completion(messages=messages, model=model_name, temperature=0.2)
        inference_time = int((time.time() - start_time) * 1000)
        
        await PatientAIService._save_message(db, session.id, AIChatRole.ASSISTANT, reply_content, model_name, inference_time)
        await db.commit()
        return {"session_id": session.id, "reply": reply_content}
