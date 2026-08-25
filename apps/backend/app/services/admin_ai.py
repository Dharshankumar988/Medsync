import uuid
import time
import logging
from typing import AsyncGenerator, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_chat import AIChatSession, AIChatMessage, AIChatRole
from app.repositories.ai_chat import chat_session_repo, chat_message_repo
from app.schemas.ai import ChatRequest
from app.ai.prompts.templates import ADMIN_SYSTEM_PROMPT
from app.ai.core.service_manager import ai_service_manager
from app.services.rag_service import rag_service
from app.ai.core.conversation import ConversationManager
from app.ai.core.prompt_manager import PromptManager
from app.ai.core.config import ai_config

logger = logging.getLogger("medsync.ai.admin")

from sqlalchemy import select, func
from app.models.user import User, UserRole
from app.models.appointment import Appointment
from app.models.prescription import Prescription
from app.ai.core.orchestrator import AIOrchestrator
import json

class AdminAIService:
    @staticmethod
    async def _get_or_create_session(db: AsyncSession, admin_id: uuid.UUID, session_id: uuid.UUID | None) -> AIChatSession:
        if session_id:
            session = await chat_session_repo.get(db, session_id)
            if not session or session.user_id != admin_id:
                raise ValueError("Invalid or unauthorized chat session.")
            return session
        
        new_session = AIChatSession(
            id=uuid.uuid4(),
            user_id=admin_id,
            title="System Analytics Chat",
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
    async def _get_db_stats(db: AsyncSession) -> str:
        total_users = await db.scalar(select(func.count(User.id)))
        total_patients = await db.scalar(select(func.count(User.id)).where(User.role == UserRole.PATIENT))
        total_doctors = await db.scalar(select(func.count(User.id)).where(User.role == UserRole.DOCTOR))
        total_pharmacies = await db.scalar(select(func.count(User.id)).where(User.role == UserRole.PHARMACY))
        total_appointments = await db.scalar(select(func.count(Appointment.id)))
        total_prescriptions = await db.scalar(select(func.count(Prescription.id)))
        
        stats = {
            "users": {
                "total": total_users,
                "patients": total_patients,
                "doctors": total_doctors,
                "pharmacies": total_pharmacies
            },
            "operations": {
                "appointments": total_appointments,
                "prescriptions": total_prescriptions
            }
        }
        return json.dumps(stats, indent=2)

    @staticmethod
    async def _build_messages(db: AsyncSession, session_id: uuid.UUID, user_message: str, specific_instruction: str = None) -> List[Dict[str, str]]:
        intent = AIOrchestrator.classify_admin_intent(user_message)
        logger.info(f"Admin intent classified as: {intent}")
        
        context_parts = []
        
        if intent in ["RAG", "COMBINED"]:
            rag_context = await rag_service.retrieve_context(db=db, query=user_message, role="admin")
            if rag_context:
                context_parts.append(f"--- Document Context ---\n{rag_context}")
                
        if intent in ["ANALYTICS", "COMBINED"]:
            db_stats = await AdminAIService._get_db_stats(db)
            context_parts.append(f"--- Live Database Stats ---\n{db_stats}")
            
        final_context = "\n\n".join(context_parts) if context_parts else "No specific context retrieved."
        
        system_msg_content = ADMIN_SYSTEM_PROMPT.format(rag_context=final_context)

        history = await ConversationManager.get_recent_messages(db, session_id)
        
        return PromptManager.build_messages(
            system_prompt=system_msg_content,
            history=history,
            user_message=user_message,
            specific_instruction=specific_instruction,
        )

    @staticmethod
    async def handle_chat(db: AsyncSession, admin_id: uuid.UUID, req: ChatRequest) -> Dict[str, Any]:
        session = await AdminAIService._get_or_create_session(db, admin_id, req.session_id)
        await AdminAIService._save_message(db, session.id, AIChatRole.USER, req.message)
        
        messages = await AdminAIService._build_messages(db, session.id, req.message)
        
        start_time = time.time()
        client = ai_service_manager.get_llm_client()
        model_name = ai_config.LLM_MODEL_ADMIN
        
        from app.ai.tools.admin_tools import AdminAITools
        tools = AdminAITools.get_tool_definitions()
        
        reply_content = await client.chat_completion(messages=messages, model=model_name, temperature=0.1, tools=tools)
        
        if hasattr(reply_content, 'tool_calls') and reply_content.tool_calls:
            # Handle tool calls
            tool_call = reply_content.tool_calls[0]
            function_name = tool_call.function.name
            import json
            try:
                kwargs = json.loads(tool_call.function.arguments)
            except:
                kwargs = {}
                
            tool_result = await AdminAITools.execute_tool(db, admin_id, session.id, function_name, kwargs)
            
            # Send the tool result back to the model
            messages.append({"role": "assistant", "content": None, "tool_calls": [tool_call]})
            messages.append({"role": "tool", "tool_call_id": tool_call.id, "name": function_name, "content": tool_result})
            
            reply_content = await client.chat_completion(messages=messages, model=model_name, temperature=0.1)
        
        reply_content = AIOrchestrator.filter_output(reply_content, "admin")
        inference_time = int((time.time() - start_time) * 1000)
        
        await AdminAIService._save_message(db, session.id, AIChatRole.ASSISTANT, reply_content, model_name, inference_time)
        await db.commit()
        
        return {"session_id": session.id, "reply": reply_content}

    @staticmethod
    async def handle_chat_stream(db: AsyncSession, admin_id: uuid.UUID, req: ChatRequest) -> AsyncGenerator[str, None]:
        session = await AdminAIService._get_or_create_session(db, admin_id, req.session_id)
        await AdminAIService._save_message(db, session.id, AIChatRole.USER, req.message)
        await db.commit()
        
        messages = await AdminAIService._build_messages(db, session.id, req.message)
        
        client = ai_service_manager.get_llm_client()
        model_name = ai_config.LLM_MODEL_ADMIN
        
        full_reply = ""
        start_time = time.time()
        
        stream = client.chat_stream(messages=messages, model=model_name, temperature=0.1)
        async for chunk in stream:
            filtered_chunk = AIOrchestrator.filter_output(chunk, "admin")
            full_reply += filtered_chunk
            yield filtered_chunk
            
        inference_time = int((time.time() - start_time) * 1000)
        await AdminAIService._save_message(db, session.id, AIChatRole.ASSISTANT, full_reply, model_name, inference_time)
        await db.commit()

    # Specialized Admin Capabilities
    @staticmethod
    async def analyze_platform(db: AsyncSession, admin_id: uuid.UUID, session_id: uuid.UUID, metrics_data: str) -> Dict[str, Any]:
        instruction = "Analyze these platform metrics (user growth, engagement). Provide an executive summary with actionable operational insights."
        return await AdminAIService._execute_structured_task(db, admin_id, session_id, metrics_data, instruction)

    @staticmethod
    async def monitor_ai(db: AsyncSession, admin_id: uuid.UUID, session_id: uuid.UUID, ai_metrics: str) -> Dict[str, Any]:
        instruction = "Review these AI subsystem metrics (latency, token usage, error rates). Identify bottlenecks and suggest optimization strategies."
        return await AdminAIService._execute_structured_task(db, admin_id, session_id, ai_metrics, instruction)

    @staticmethod
    async def detect_fraud(db: AsyncSession, admin_id: uuid.UUID, session_id: uuid.UUID, log_data: str) -> Dict[str, Any]:
        instruction = "Analyze these system logs and transaction records for anomalous patterns indicative of fraud or abuse (e.g., suspicious prescription volumes, unusual login locations). Highlight severe risks."
        return await AdminAIService._execute_structured_task(db, admin_id, session_id, log_data, instruction)

    @staticmethod
    async def analyze_blockchain_stats(db: AsyncSession, admin_id: uuid.UUID, session_id: uuid.UUID, chain_data: str) -> Dict[str, Any]:
        instruction = "Review these blockchain statistics (transaction volume, gas fees, block times). Assess network health and sync reliability."
        return await AdminAIService._execute_structured_task(db, admin_id, session_id, chain_data, instruction)

    @staticmethod
    async def report_system_health(db: AsyncSession, admin_id: uuid.UUID, session_id: uuid.UUID, health_data: str) -> Dict[str, Any]:
        instruction = "Provide a comprehensive system health report based on this infrastructure data. Use markdown tables to organize component statuses."
        return await AdminAIService._execute_structured_task(db, admin_id, session_id, health_data, instruction)

    @staticmethod
    async def provide_operational_insights(db: AsyncSession, admin_id: uuid.UUID, session_id: uuid.UUID, operational_data: str) -> Dict[str, Any]:
        instruction = "Synthesize this operational data into strategic insights for platform scale and maintenance."
        return await AdminAIService._execute_structured_task(db, admin_id, session_id, operational_data, instruction)

    @staticmethod
    async def _execute_structured_task(db: AsyncSession, admin_id: uuid.UUID, session_id: uuid.UUID, user_input: str, instruction: str) -> Dict[str, Any]:
        session = await AdminAIService._get_or_create_session(db, admin_id, session_id)
        await AdminAIService._save_message(db, session.id, AIChatRole.USER, user_input)
        
        messages = await AdminAIService._build_messages(db, session.id, user_input, specific_instruction=instruction)
        
        start_time = time.time()
        client = ai_service_manager.get_llm_client()
        model_name = ai_config.LLM_MODEL_ADMIN
        
        reply_content = await client.chat_completion(messages=messages, model=model_name, temperature=0.1)
        reply_content = AIOrchestrator.filter_output(reply_content, "admin")
        inference_time = int((time.time() - start_time) * 1000)
        
        await AdminAIService._save_message(db, session.id, AIChatRole.ASSISTANT, reply_content, model_name, inference_time)
        await db.commit()
        return {"session_id": session.id, "reply": reply_content}
