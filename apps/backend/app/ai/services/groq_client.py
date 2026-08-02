import os
import logging
from typing import List, Dict, Optional, AsyncGenerator
from app.ai.core.config import ai_config
from app.ai.core.exceptions import AITimeoutException, AIRateLimitException

logger = logging.getLogger("medsync.ai.groq")

class GroqClient:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY", "")
        self.client = None
        if self.api_key and self.api_key != "mock_key":
            try:
                from groq import AsyncGroq
                self.client = AsyncGroq(api_key=self.api_key, max_retries=3, timeout=30.0)
            except Exception as e:
                logger.warning(f"Failed to initialize AsyncGroq client: {e}")
                self.client = None

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "llama3-70b-8192",
        temperature: float = 0.2,
        max_tokens: int = 1024,
        json_mode: bool = False
    ) -> str:
        if self.client:
            try:
                params = {
                    "model": model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens
                }
                
                if json_mode:
                    params["response_format"] = {"type": "json_object"}
                    
                response = await self.client.chat.completions.create(**params)
                
                # Token counting & logging
                usage = response.usage
                logger.info(f"Groq Inference Usage: Prompt={usage.prompt_tokens}, Completion={usage.completion_tokens}, Total={usage.total_tokens}")
                
                if response.choices and len(response.choices) > 0:
                    return response.choices[0].message.content or ""
                    
            except Exception as e:
                error_str = str(e).lower()
                if "rate limit" in error_str or "429" in error_str:
                    logger.error("Groq Rate Limit Exceeded.")
                    raise AIRateLimitException()
                if "timeout" in error_str:
                    logger.error("Groq API Timeout.")
                    raise AITimeoutException()
                
                logger.error(f"Groq API call failed: {e}. Falling back to clinical guidance engine.")

        return self._fallback_engine(messages)

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        model: str = "llama3-70b-8192",
        temperature: float = 0.2,
        max_tokens: int = 1024
    ) -> AsyncGenerator[str, None]:
        if self.client:
            try:
                stream = await self.client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=True
                )
                async for chunk in stream:
                    if chunk.choices and chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
                return
            except Exception as e:
                logger.error(f"Groq Streaming failed: {e}. Falling back to blocking fallback engine.")
        
        # Fallback for streaming is just yielding the whole string at once or chunking manually
        fallback_text = self._fallback_engine(messages)
        words = fallback_text.split(" ")
        for word in words:
            yield word + " "

    def _fallback_engine(self, messages: List[Dict[str, str]]) -> str:
        """Medical guidance fallback engine for development / offline / unconfigured API key"""
        last_user_msg = ""
        system_msg = ""
        for m in reversed(messages):
            if m.get("role") == "user" and not last_user_msg:
                last_user_msg = m.get("content", "").lower()
            if m.get("role") == "system" and not system_msg:
                system_msg = m.get("content", "").lower()

        if "pharmacy" in system_msg:
            return "Pharmacy Fallback: Please manually verify the prescription or interaction against local pharmacology references."
            
        if "admin" in system_msg:
            return "Admin Fallback: AI Analytics engine is currently offline. Please refer to standard database dashboards."

        if "symptom" in last_user_msg or "pain" in last_user_msg or "headache" in last_user_msg or "fever" in last_user_msg:
            return (
                "Based on the clinical symptoms described, please monitor your vital signs (temperature, blood pressure). "
                "Ensure adequate hydration and rest. If symptoms persist for more than 48 hours or worsen with severe discomfort, "
                "please schedule an immediate consultation with a registered physician via MedSync."
            )
        elif "prescription" in last_user_msg or "medication" in last_user_msg or "dosage" in last_user_msg:
            return (
                "Regarding medication instructions: Always adhere strictly to the prescribed dosage, timing, and administration guidelines "
                "provided by your licensed healthcare provider. Do not alter doses without clinical supervision."
            )
        else:
            return (
                "MedSync Clinical Assistant: Your query has been logged. Please consult your physician for personalized medical advice. "
                "For emergencies, contact local emergency healthcare services immediately."
            )

groq_client = GroqClient()
