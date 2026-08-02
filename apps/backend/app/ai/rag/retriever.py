import logging
import numpy as np
from typing import List, Dict, Optional
from app.ai.rag.knowledge_base import load_documents
from app.ai.rag.embeddings import embedding_service

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

    def _initialize_corpus(self):
        """Build the in-memory vector database."""
        if self.is_initialized:
            return
            
        logger.info("Initializing RAG vector corpus...")
        self.corpus = load_documents()
        
        # Extract content for embedding
        texts = [doc["content"] for doc in self.corpus]
        self.corpus_embeddings = embedding_service.embed_batch(texts)
        self.is_initialized = True

    @staticmethod
    async def retrieve_context(query: str, role: Optional[str] = None, top_k: int = 2) -> str:
        """
        Retrieve clinical context.
        INTEGRATION RULE: This will ONLY execute for the 'doctor' role.
        Other roles (patient, pharmacy, admin) will bypass retrieval to preserve their existing behaviors.
        """
        if role != "doctor":
            return "" # Skip RAG for non-doctor roles per requirements
            
        if not query or len(query.strip()) < 5:
            return ""

        retriever = RAGRetriever()
        retriever._initialize_corpus()
        
        query_embedding = embedding_service.embed_text(query)
        
        try:
            from sklearn.metrics.pairwise import cosine_similarity
            # Reshape for sklearn
            q_vec = query_embedding.reshape(1, -1)
            c_vecs = retriever.corpus_embeddings
            
            similarities = cosine_similarity(q_vec, c_vecs)[0]
            
            # Get indices of top_k most similar
            top_indices = np.argsort(similarities)[-top_k:][::-1]
            
            results = []
            for idx in top_indices:
                score = similarities[idx]
                if score > 0.2: # Minimum relevance threshold
                    doc = retriever.corpus[idx]
                    results.append(doc)
                    
            if not results:
                return "No highly relevant clinical guidelines found in context."
                
            # Formatting with Citations
            formatted_context = "CLINICAL GUIDELINES & PROTOCOLS:\n"
            for doc in results:
                formatted_context += f"- [{doc['source']}] {doc['title']}: {doc['content']}\n"
                
            return formatted_context
            
        except ImportError:
            logger.warning("scikit-learn not installed. Returning static fallback context.")
            return "Fallback Context: Evaluate standard clinical guidelines."
        except Exception as e:
            logger.error(f"RAG Retrieval failed: {e}")
            return ""
