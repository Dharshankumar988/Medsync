import pytest
import uuid
from httpx import AsyncClient
from app.models.rag import KnowledgeDocument, KnowledgeChunk
from sqlalchemy.orm import Session
from unittest.mock import patch, MagicMock, AsyncMock

@pytest.fixture
def mock_embedding_model():
    with patch("app.services.rag_service.RAGService._get_embedding_model") as mock_getter:
        mock_model = MagicMock()
        mock_model.encode.return_value = [[0.1] * 384]
        mock_getter.return_value = mock_model
        yield mock_model

@pytest.fixture
def mock_groq_client():
    with patch("app.services.rag_service.RAGService._get_llm_client") as mock_getter:
        class MockMessage:
            content = "This is a grounded answer from the mock context."
        class MockChoice:
            message = MockMessage()
        class MockResponse:
            choices = [MockChoice()]
        
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = MockResponse()
        mock_getter.return_value = mock_client
        yield mock_client

@pytest.mark.asyncio
async def test_admin_only_query(async_client: AsyncClient, patient_token: str, doctor_token: str, admin_token: str):
    query_payload = {"query": "Test"}
    
    # 1. Patient querying RAG -> 403
    res = await async_client.post("/api/v1/rag/query", json=query_payload, headers={"Authorization": f"Bearer {patient_token}"})
    assert res.status_code == 403

    # 2. Doctor querying RAG -> 403
    res = await async_client.post("/api/v1/rag/query", json=query_payload, headers={"Authorization": f"Bearer {doctor_token}"})
    assert res.status_code == 403

    # 3. Admin querying RAG -> Pass
    with patch("app.services.rag_service.rag_service.query", return_value={"answer": "Insufficient information in the available knowledge base.", "sources": []}):
        res = await async_client.post("/api/v1/rag/query", json=query_payload, headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        assert "Insufficient information" in res.json()["answer"]

@pytest.mark.asyncio
async def test_admin_only_upload(async_client: AsyncClient, patient_token: str, admin_token: str):
    file_content = b"Mock PDF Content"
    files = {"file": ("test.pdf", file_content, "application/pdf")}
    
    res = await async_client.post("/api/v1/rag/documents", files=files, headers={"Authorization": f"Bearer {patient_token}"})
    assert res.status_code == 403

@pytest.mark.asyncio
async def test_rag_logic(
    async_client: AsyncClient, 
    admin_token: str, 
    mock_embedding_model, 
    mock_groq_client,
    admin_user
):
    expected_response = {
        "answer": "This is a grounded answer from the mock context.",
        "sources": [{"document_id": str(uuid.uuid4()), "title": "Test Doc", "chunk_id": str(uuid.uuid4()), "similarity": 0.9}]
    }
    with patch("app.services.rag_service.rag_service.query", return_value=expected_response):
        # Query
        res = await async_client.post("/api/v1/rag/query", json={"query": "Is MedSync great?"}, headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["answer"] == "This is a grounded answer from the mock context."
        assert len(data["sources"]) == 1
        assert data["sources"][0]["title"] == "Test Doc"
