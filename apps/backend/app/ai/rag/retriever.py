"""Shared medical-knowledge RAG with admin-only live platform context."""
import logging
import numpy as np
from typing import List, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.ai.rag.knowledge_base import load_documents, load_all_documents
from app.ai.rag.embeddings import embedding_service
from app.ai.core.config import ai_config

logger = logging.getLogger("medsync.ai.retriever")

class RAGRetriever:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RAGRetriever, cls).__new__(cls)
            cls._instance.corpus = []
            cls._instance.corpus_embeddings = None
            cls._instance.is_initialized = False
        return cls._instance

    def _initialize_corpus(self, documents: Optional[List[Dict]] = None):
        """Build the in-memory vector database."""
        corpus = documents if documents else load_documents()
        
        if not corpus:
            logger.warning("Empty corpus — RAG will return no context.")
            self.corpus = []
            self.corpus_embeddings = np.array([])
            return
        
        logger.info(f"Initializing RAG vector corpus with {len(corpus)} documents...")
        self.corpus = corpus
        
        # Extract content for embedding
        texts = [doc["content"] for doc in self.corpus]
        self.corpus_embeddings = embedding_service.embed_batch(texts)
        self.is_initialized = True

    def refresh_corpus(self, documents: List[Dict]):
        """Force refresh the corpus with new documents."""
        self.is_initialized = False
        self._initialize_corpus(documents)

    @staticmethod
    async def retrieve_context(
        query: str,
        role: Optional[str] = None,
        top_k: Optional[int] = None,
        db: Optional[AsyncSession] = None,
    ) -> str:
        """
        Retrieve contextual knowledge.
        
        All roles retrieve from the shared, non-patient-specific medical corpus.
        Aggregate live platform documents are loaded only for admins.
        """
        if not query or len(query.strip()) < 5:
            return ""

        top_k = top_k or ai_config.RAG_TOP_K
        retriever = RAGRetriever()

        # Platform metrics must never be placed in patient/doctor prompts.
        if db is not None and role == "admin":
            try:
                all_docs = await load_all_documents(db)
                retriever.refresh_corpus(all_docs)
            except Exception as e:
                logger.error(f"Failed to load database context for RAG: {e}")
                if not retriever.is_initialized:
                    retriever._initialize_corpus()
        else:
            if not retriever.is_initialized:
                retriever._initialize_corpus()
        
        if not retriever.corpus or retriever.corpus_embeddings is None or len(retriever.corpus_embeddings) == 0:
            return "No RAG context available."

        query_embedding = embedding_service.embed_text(query)
        
        try:
            from sklearn.metrics.pairwise import cosine_similarity
            q_vec = query_embedding.reshape(1, -1)
            c_vecs = retriever.corpus_embeddings
            
            similarities = cosine_similarity(q_vec, c_vecs)[0]
            
            # Get indices of top_k most similar
            top_indices = np.argsort(similarities)[-top_k:][::-1]
            
            results = []
            for idx in top_indices:
                score = similarities[idx]
                if score > ai_config.RAG_MIN_SIMILARITY:
                    doc = retriever.corpus[idx]
                    results.append(doc)
                    
            if not results:
                return "No highly relevant context found in the knowledge base."
                
            # Format with citations
            formatted_context = "SYSTEM STATUS & KNOWLEDGE CONTEXT:\n"
            for doc in results:
                formatted_context += f"- [{doc['source']}] {doc['title']}: {doc['content']}\n"
                
            return formatted_context
            
        except ImportError:
            logger.warning("scikit-learn not installed; RAG retrieval is unavailable.")
            return ""
        except Exception as e:
            logger.error(f"RAG Retrieval failed: {e}")
            return ""
