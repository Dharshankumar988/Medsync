import logging
from typing import List
import numpy as np
from app.ai.core.config import ai_config

logger = logging.getLogger("medsync.ai.embeddings")

class EmbeddingService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmbeddingService, cls).__new__(cls)
            cls._instance.model = None
            cls._instance.cache = {}
        return cls._instance

    def _load_model(self):
        """Lazy load the sentence transformer model to optimize startup time and memory."""
        if self.model is None:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info(f"Loading embedding model: {ai_config.EMBEDDING_MODEL}")
                self.model = SentenceTransformer(ai_config.EMBEDDING_MODEL)
            except ImportError:
                logger.error("sentence-transformers not installed. RAG will fallback to mock embeddings.")
                self.model = "mock"
            except Exception as e:
                logger.error(f"Failed to load embedding model: {e}")
                self.model = "mock"

    def embed_text(self, text: str) -> np.ndarray:
        """Generate embeddings with a simple memory cache."""
        if text in self.cache:
            return self.cache[text]
            
        self._load_model()
        
        if self.model == "mock":
            # Deterministic pseudo-embedding for fallback/testing if library is missing
            vec = np.zeros(384)
            vec[hash(text) % 384] = 1.0
            return vec
            
        # Real embedding generation
        embedding = self.model.encode(text, convert_to_numpy=True)
        self.cache[text] = embedding
        
        # Prevent cache from growing indefinitely
        if len(self.cache) >= 2048:
            self.cache.pop(next(iter(self.cache)))
            
        return embedding

    def embed_batch(self, texts: List[str]) -> np.ndarray:
        """Batch embedding generation for the knowledge base."""
        self._load_model()
        if self.model == "mock":
            return np.array([self.embed_text(t) for t in texts])
            
        return self.model.encode(texts, convert_to_numpy=True)

embedding_service = EmbeddingService()
