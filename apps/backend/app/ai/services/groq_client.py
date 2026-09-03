"""
Groq Client — Central LLM reasoning engine for MedSync.
Handles chat completion, streaming, image explanations, and structured output.

PHI/HIPAA COMPLIANCE NOTICE:
  groq/compound and groq/compound-mini are NOT currently HIPAA-compliant.
  If this system processes Protected Health Information (PHI), ensure data is
  de-identified or routed through a BAA-covered pipeline before production use.
  See: https://groq.com/trust-center/
"""
import os
import logging
import asyncio
from typing import List, Dict, Optional, AsyncGenerator, Any

# Ensure .env is loaded before reading env vars
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from app.ai.core.config import ai_config
from app.ai.core.exceptions import (
    GroqMissingKeyException,
    GroqRateLimitException,
    GroqTimeoutException,
    GroqNetworkException,
    GroqProviderException
)

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
        self._active_model = ai_config.GROQ_MODEL
        
        if not self.api_key or self.api_key == "mock_key":
            logger.error("GROQ_API_KEY is missing or invalid.")
        else:
            try:
                from groq import AsyncGroq
                self.client = AsyncGroq(api_key=self.api_key, max_retries=3, timeout=30.0)
            except Exception as e:
                logger.warning(f"Failed to initialize AsyncGroq client: {e}")
                self.client = None
        self._init_done = True

    @property
    def is_healthy(self) -> bool:
        return self._healthy and self.client is not None

    async def verify_health(self) -> bool:
        if not self.client:
            self._healthy = False
            return False
            
        models_to_test = [ai_config.GROQ_MODEL, ai_config.GROQ_FALLBACK_MODEL]
        
        for model in models_to_test:
            try:
                # Test with actual chat completion
                response = await self.client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": "ping"}],
                    max_tokens=5,
                    temperature=0.1
                )
                if response.choices and len(response.choices) > 0:
                    self._active_model = model
                    self._healthy = True
                    logger.info(f"Groq is healthy using model: {model}")
                    return True
            except Exception as e:
                logger.warning(f"Failed to verify Groq model {model}: {e}")
                
        self._healthy = False
        logger.error("All Groq models failed verification.")
        return False

    def _check_client(self):
        if not self.api_key or self.api_key == "mock_key":
            raise GroqMissingKeyException()
        if not self.client:
            raise GroqProviderException("AI Provider is not configured (Initialization failed).")

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
        json_mode: bool = False,
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> Any:
        """Standard chat completion with Groq."""
        self._check_client()
        if not self._healthy:
            await self.verify_health()
            if not self._healthy:
                raise GroqProviderException("Groq models are unavailable or unauthorized.")

        used_model = model or self._active_model

        try:
            params = {
                "model": used_model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            if json_mode:
                params["response_format"] = {"type": "json_object"}
            if tools:
                params["tools"] = tools
                params["tool_choice"] = "auto"

            response = await self.client.chat.completions.create(**params)

            usage = response.usage
            logger.info(
                f"Groq Usage: model={used_model} prompt={usage.prompt_tokens} "
                f"completion={usage.completion_tokens} total={usage.total_tokens}"
            )

            if response.choices and len(response.choices) > 0:
                message = response.choices[0].message
                if hasattr(message, 'tool_calls') and message.tool_calls:
                    return message
                return message.content or ""
            return ""

        except Exception as e:
            error_str = str(e).lower()
            if "rate limit" in error_str or "429" in error_str:
                logger.error("Groq Rate Limit Exceeded.")
                raise GroqRateLimitException()
            if "timeout" in error_str:
                logger.error("Groq API Timeout.")
                raise GroqTimeoutException()
            if "connect" in error_str or "network" in error_str:
                logger.error("Groq Network Error.")
                raise GroqNetworkException()
            if "not_found" in error_str or "forbidden" in error_str:
                if used_model == ai_config.GROQ_MODEL and self._active_model != ai_config.GROQ_FALLBACK_MODEL:
                    logger.warning("Primary model failed with not_found/forbidden. Attempting fallback.")
                    self._active_model = ai_config.GROQ_FALLBACK_MODEL
                    return await self.chat_completion(
                        messages=messages,
                        model=ai_config.GROQ_FALLBACK_MODEL,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        json_mode=json_mode,
                        tools=tools
                    )
            logger.error(f"Groq API call failed: {e}")
            raise GroqProviderException(str(e))

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
            model=model,
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
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> AsyncGenerator[str, None]:
        """Streaming chat completion with Groq."""
        self._check_client()
        if not self._healthy:
            await self.verify_health()
            if not self._healthy:
                raise GroqProviderException("Groq models are unavailable or unauthorized.")

        used_model = model or self._active_model

        try:
            stream = await self.client.chat.completions.create(
                model=used_model,
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
            error_str = str(e).lower()
            if "rate limit" in error_str or "429" in error_str:
                raise GroqRateLimitException()
            if "timeout" in error_str:
                raise GroqTimeoutException()
            if "connect" in error_str or "network" in error_str:
                raise GroqNetworkException()
            if "not_found" in error_str or "forbidden" in error_str:
                if used_model == ai_config.GROQ_MODEL and self._active_model != ai_config.GROQ_FALLBACK_MODEL:
                    self._active_model = ai_config.GROQ_FALLBACK_MODEL
                    async for chunk in self.chat_stream(
                        messages=messages,
                        model=self._active_model,
                        temperature=temperature,
                        max_tokens=max_tokens
                    ):
                        yield chunk
                    return
            logger.error(f"Groq Streaming failed: {e}")
            raise GroqProviderException(str(e))

# Singleton instance
groq_client = GroqClient()

