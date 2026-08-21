"""
Groq Client — Central LLM reasoning engine for MedSync.
Handles chat completion, streaming, image explanations, and structured output.
"""
import os
import logging
from typing import List, Dict, Optional, AsyncGenerator
from app.ai.core.config import ai_config
from app.ai.core.exceptions import AITimeoutException, AIRateLimitException

logger = logging.getLogger("medsync.ai.groq")


class GroqClient:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._init_done = False
        return cls._instance

    def __init__(self):
        if self._init_done:
            return
        self.api_key = os.getenv("GROQ_API_KEY", "")
        self.client = None
        self._healthy = False
        if self.api_key and self.api_key != "mock_key":
            try:
                from groq import AsyncGroq
                self.client = AsyncGroq(api_key=self.api_key, max_retries=3, timeout=30.0)
                self._healthy = True
                logger.info("Groq AsyncClient initialized successfully.")
            except Exception as e:
                logger.warning(f"Failed to initialize AsyncGroq client: {e}")
                self.client = None
        else:
            logger.warning("No GROQ_API_KEY configured. Fallback engine will be used.")
        self._init_done = True

    @property
    def is_healthy(self) -> bool:
        return self._healthy and self.client is not None

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "llama-3.3-70b-versatile",
        temperature: float = 0.2,
        max_tokens: int = 1024,
        json_mode: bool = False,
    ) -> str:
        """Standard chat completion with Groq."""
        if not self.client:
            raise Exception("AI Provider is not configured (Missing GROQ_API_KEY).")

        try:
            params = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            if json_mode:
                params["response_format"] = {"type": "json_object"}

            response = await self.client.chat.completions.create(**params)

            usage = response.usage
            logger.info(
                f"Groq Usage: model={model} prompt={usage.prompt_tokens} "
                f"completion={usage.completion_tokens} total={usage.total_tokens}"
            )

            if response.choices and len(response.choices) > 0:
                return response.choices[0].message.content or ""
            return ""

        except Exception as e:
            error_str = str(e).lower()
            if "rate limit" in error_str or "429" in error_str:
                logger.error("Groq Rate Limit Exceeded.")
                raise AIRateLimitException()
            if "timeout" in error_str:
                logger.error("Groq API Timeout.")
                raise AITimeoutException()
            logger.error(f"Groq API call failed: {e}")
            raise Exception("AI Provider is temporarily unavailable.")

    async def generate_standard_response(
        self,
        system_prompt: str,
        user_message: str,
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> str:
        """Convenience method: build messages from system + user and call chat_completion."""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]
        return await self.chat_completion(
            messages=messages,
            model=model or ai_config.GROQ_MODEL_DOCTOR,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    async def generate_structured_response(
        self,
        system_prompt: str,
        user_message: str,
        model: Optional[str] = None,
    ) -> str:
        """Generate a JSON-mode response for structured outputs."""
        return await self.generate_standard_response(
            system_prompt=system_prompt,
            user_message=user_message,
            model=model,
            temperature=0.1,
            max_tokens=2048,
        )

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        model: str = "llama-3.3-70b-versatile",
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> AsyncGenerator[str, None]:
        """Streaming chat completion with Groq."""
        if not self.client:
            raise RuntimeError("AI Provider is not configured (Missing GROQ_API_KEY).")

        try:
            stream = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
            return
        except Exception as e:
            logger.error(f"Groq Streaming failed: {e}")
            raise RuntimeError("AI Provider is temporarily unavailable.") from e

# Singleton instance
groq_client = GroqClient()
