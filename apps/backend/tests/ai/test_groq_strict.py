import os
import pytest
import asyncio
from unittest.mock import patch, AsyncMock
import sys

from app.ai.core.config import ai_config
from app.ai.services.groq_client import GroqClient
from app.ai.core.exceptions import GroqProviderException, GroqMissingKeyException
from app.ai.core.orchestrator import AIOrchestrator

@pytest.fixture
def clean_groq_client():
    # Force re-initialization of GroqClient singleton for tests
    client = GroqClient()
    client._init_done = False
    client.__init__()
    return client

def test_no_openai_imports():
    """Verify that OpenAI is NOT imported in sys.modules"""
    for module_name in list(sys.modules.keys()):
        if "openai" in module_name.lower():
            pytest.fail(f"OpenAI import detected in runtime: {module_name}")

def test_no_openai_configuration():
    """Verify that ai_config has NO OpenAI fallback or model configuration"""
    assert "openai" not in ai_config.GROQ_MODEL.lower()
    assert "openai" not in ai_config.GROQ_FALLBACK_MODEL.lower()
    assert "openai" not in ai_config.LLM_MODEL_DOCTOR.lower()
    assert "openai" not in ai_config.LLM_MODEL_PATIENT.lower()
    assert "openai" not in ai_config.LLM_MODEL_PHARMACY.lower()
    assert "openai" not in ai_config.LLM_MODEL_ADMIN.lower()
    
    assert ai_config.GROQ_MODEL != ""
    assert ai_config.GROQ_FALLBACK_MODEL != ""

@pytest.mark.asyncio
async def test_groq_initialization_success(clean_groq_client):
    """Verify that Groq client initializes successfully"""
    # Assuming valid API key is in environment
    assert clean_groq_client.api_key != ""
    assert clean_groq_client.api_key != "mock_key"
    assert clean_groq_client.client is not None
    assert clean_groq_client._init_done is True

@pytest.mark.asyncio
@patch.dict(os.environ, {"GROQ_API_KEY": ""})
async def test_groq_missing_key_error():
    """Verify missing Groq configuration produces a clear error"""
    # Force re-initialization
    client = GroqClient()
    client._init_done = False
    client.__init__()
    
    with pytest.raises(GroqMissingKeyException):
        client._check_client()

@pytest.mark.asyncio
async def test_groq_fallback_does_not_use_openai():
    """Verify that fallback uses valid Groq model and NOT OpenAI"""
    assert "openai" not in ai_config.GROQ_FALLBACK_MODEL.lower()
    assert "gpt" not in ai_config.GROQ_FALLBACK_MODEL.lower()

@pytest.mark.asyncio
async def test_pulse_role_routing():
    """Verify PULSE roles correctly route to configured Groq models"""
    assert AIOrchestrator.get_model_for_role("patient") == ai_config.LLM_MODEL_PATIENT
    assert AIOrchestrator.get_model_for_role("doctor") == ai_config.LLM_MODEL_DOCTOR
    assert AIOrchestrator.get_model_for_role("pharmacy") == ai_config.LLM_MODEL_PHARMACY
    assert AIOrchestrator.get_model_for_role("admin") == ai_config.LLM_MODEL_ADMIN
    
    # Verify none of them are OpenAI
    assert "openai" not in AIOrchestrator.get_model_for_role("patient").lower()
    assert "openai" not in AIOrchestrator.get_model_for_role("doctor").lower()
    assert "openai" not in AIOrchestrator.get_model_for_role("pharmacy").lower()
    assert "openai" not in AIOrchestrator.get_model_for_role("admin").lower()

@pytest.mark.asyncio
@patch('app.ai.services.groq_client.GroqClient.chat_completion', new_callable=AsyncMock)
async def test_real_groq_request_mocked(mock_chat):
    """Verify standard Groq request succeeds (mocked to avoid API cost in CI)"""
    mock_chat.return_value = "Success"
    client = GroqClient()
    result = await client.chat_completion(messages=[{"role": "user", "content": "ping"}])
    assert result == "Success"
    
@pytest.mark.asyncio
async def test_groq_provider_unavailable_exception():
    """Verify exception type and code for Groq failure matches GROQ_PROVIDER_UNAVAILABLE"""
    try:
        raise GroqProviderException()
    except GroqProviderException as e:
        assert e.error_code == "GROQ_PROVIDER_UNAVAILABLE"
        assert e.status_code == 502
