import uuid
import time
import logging
from typing import AsyncGenerator, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_chat import AIChatSession, AIChatMessage, AIChatRole
from app.repositories.ai_chat import chat_session_repo, chat_message_repo
from app.schemas.ai import ChatRequest
from app.ai.prompts.templates import DOCTOR_SYSTEM_PROMPT
from app.ai.core.service_manager import ai_service_manager
from app.ai.rag.retriever import RAGRetriever
from app.ai.core.conversation import ConversationManager
from app.ai.core.config import ai_config

logger = logging.getLogger("medsync.ai.doctor")

class DoctorAIService:
    @staticmethod
    async def _get_or_create_session(db: AsyncSession, doctor_id: uuid.UUID, session_id: uuid.UUID | None) -> AIChatSession:
        if session_id:
            session = await chat_session_repo.get(db, session_id)
            if not session or session.user_id != doctor_id:
                raise ValueError("Invalid or unauthorized chat session.")
            return session
        
        new_session = AIChatSession(
            id=uuid.uuid4(),
            user_id=doctor_id,
            title="Doctor Consultation",
            is_doctor_mode=True
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
        # Retrieve context from RAG (Only Doctor AI triggers this)
        rag_context = await RAGRetriever.retrieve_context(user_message, role="doctor")
        
        system_msg_content = DOCTOR_SYSTEM_PROMPT.format(history="Context gathered from RAG", rag_context=rag_context)
        if specific_instruction:
            system_msg_content += f"\n\nCRITICAL INSTRUCTION FOR THIS REQUEST: {specific_instruction}"

        # Get conversation history
        history = await ConversationManager.get_recent_messages(db, session_id)
        
        messages = [{"role": "system", "content": system_msg_content}]
        messages.extend(history)
        messages.append({"role": "user", "content": user_message})
        
        return messages

    @staticmethod
    async def handle_chat(db: AsyncSession, doctor_id: uuid.UUID, req: ChatRequest) -> Dict[str, Any]:
        session = await DoctorAIService._get_or_create_session(db, doctor_id, req.session_id)
        
        # Save user message
        await DoctorAIService._save_message(db, session.id, AIChatRole.USER, req.message)
        
        messages = await DoctorAIService._build_messages(db, session.id, req.message)
        
        start_time = time.time()
        client = ai_service_manager.get_llm_client()
        model_name = ai_config.GROQ_MODEL_DOCTOR
        
        reply_content = await client.chat_completion(
            messages=messages,
            model=model_name,
            temperature=0.2
        )
        
        inference_time = int((time.time() - start_time) * 1000)
        
        # Save AI reply
        await DoctorAIService._save_message(db, session.id, AIChatRole.ASSISTANT, reply_content, model_name, inference_time)
        await db.commit()
        
        return {"session_id": session.id, "reply": reply_content}

    @staticmethod
    async def handle_chat_stream(db: AsyncSession, doctor_id: uuid.UUID, req: ChatRequest) -> AsyncGenerator[str, None]:
        session = await DoctorAIService._get_or_create_session(db, doctor_id, req.session_id)
        
        # Save user message
        await DoctorAIService._save_message(db, session.id, AIChatRole.USER, req.message)
        await db.commit() # Commit user message before streaming starts
        
        messages = await DoctorAIService._build_messages(db, session.id, req.message)
        
        client = ai_service_manager.get_llm_client()
        model_name = ai_config.GROQ_MODEL_DOCTOR
        
        full_reply = ""
        start_time = time.time()
        
        stream = client.chat_stream(messages=messages, model=model_name, temperature=0.2)
        async for chunk in stream:
            full_reply += chunk
            yield chunk
            
        inference_time = int((time.time() - start_time) * 1000)
        
        # Save complete AI reply after streaming finishes
        await DoctorAIService._save_message(db, session.id, AIChatRole.ASSISTANT, full_reply, model_name, inference_time)
        await db.commit()

    @staticmethod
    async def generate_soap_note(db: AsyncSession, doctor_id: uuid.UUID, session_id: uuid.UUID, clinical_notes: str) -> Dict[str, Any]:
        instruction = "Generate a strictly formatted SOAP (Subjective, Objective, Assessment, Plan) note based on the provided clinical notes. Use markdown headers."
        return await DoctorAIService._execute_structured_task(db, doctor_id, session_id, clinical_notes, instruction)

    @staticmethod
    async def analyze_drug_interaction(db: AsyncSession, doctor_id: uuid.UUID, session_id: uuid.UUID, medications: List[str]) -> Dict[str, Any]:
        meds_str = ", ".join(medications)
        instruction = "Analyze the following medication list for drug-drug interactions, contraindications, and warnings. Return structured JSON."
        return await DoctorAIService._execute_structured_task(db, doctor_id, session_id, meds_str, instruction, json_mode=True)

    @staticmethod
    async def interpret_lab_results(db: AsyncSession, doctor_id: uuid.UUID, session_id: uuid.UUID, lab_data: str) -> Dict[str, Any]:
        instruction = "Interpret these laboratory results. Highlight any abnormal values, suggest potential clinical correlations, and recommend follow-up tests."
        return await DoctorAIService._execute_structured_task(db, doctor_id, session_id, lab_data, instruction)

    @staticmethod
    async def generate_differential_diagnosis(db: AsyncSession, doctor_id: uuid.UUID, session_id: uuid.UUID, symptoms: str) -> Dict[str, Any]:
        instruction = "Based on the symptoms, provide a ranked list of differential diagnoses (most to least likely). Include \"must-not-miss\" critical conditions."
        return await DoctorAIService._execute_structured_task(db, doctor_id, session_id, symptoms, instruction)

    @staticmethod
    async def interpret_medical_image(db: AsyncSession, doctor_id: uuid.UUID, session_id: uuid.UUID, image_analysis_results: dict) -> Dict[str, Any]:
        data_str = str(image_analysis_results)
        instruction = "Analyze these raw computer vision detection results (bounding boxes, confidence scores) and formulate a cohesive, professional clinical imaging report."
        return await DoctorAIService._execute_structured_task(db, doctor_id, session_id, data_str, instruction)
        
    @staticmethod
    async def assist_prescription(db: AsyncSession, doctor_id: uuid.UUID, session_id: uuid.UUID, condition: str) -> Dict[str, Any]:
        instruction = "Provide evidence-based pharmacological treatment options, including first-line and second-line therapies with standard adult dosages for the condition."
        return await DoctorAIService._execute_structured_task(db, doctor_id, session_id, condition, instruction)

    @staticmethod
    async def _execute_structured_task(db: AsyncSession, doctor_id: uuid.UUID, session_id: uuid.UUID, user_input: str, instruction: str, json_mode: bool = False) -> Dict[str, Any]:
        session = await DoctorAIService._get_or_create_session(db, doctor_id, session_id)
        await DoctorAIService._save_message(db, session.id, AIChatRole.USER, user_input)
        
        messages = await DoctorAIService._build_messages(db, session.id, user_input, specific_instruction=instruction)
        
        start_time = time.time()
        client = ai_service_manager.get_llm_client()
        model_name = ai_config.GROQ_MODEL_DOCTOR
        
        reply_content = await client.chat_completion(
            messages=messages,
            model=model_name,
            temperature=0.1, # Lower temperature for structured clinical tasks
            json_mode=json_mode
        )
        
        inference_time = int((time.time() - start_time) * 1000)
        await DoctorAIService._save_message(db, session.id, AIChatRole.ASSISTANT, reply_content, model_name, inference_time)
        await db.commit()
        
        return {"session_id": session.id, "reply": reply_content}
