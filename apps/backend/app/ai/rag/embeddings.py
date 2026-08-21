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
                logger.error("sentence-transformers not installed. RAG is unavailable.")
                raise Exception("RAG service is unavailable (missing dependencies).")
            except Exception as e:
                logger.error(f"Failed to load embedding model: {e}")
                raise Exception(f"Failed to load embedding model: {e}")

    def embed_text(self, text: str) -> np.ndarray:
        """Generate embeddings with a simple memory cache."""
        if text in self.cache:
            return self.cache[text]
            
        self._load_model()
            
        # Real embedding generation
        embedding = self.model.encode(text, convert_to_numpy=True)
        self.cache[text] = embedding
        
        # Prevent cache from growing indefinitely
        max_cache = 4096
        if len(self.cache) >= max_cache:
            # Remove oldest entries
            keys_to_remove = list(self.cache.keys())[:max_cache // 4]
            for k in keys_to_remove:
                del self.cache[k]
            
        return embedding

    def embed_batch(self, texts: List[str]) -> np.ndarray:
        """Batch embedding generation for the knowledge base."""
        self._load_model()
        return self.model.encode(texts, convert_to_numpy=True)

    def clear_cache(self):
        """Clear the embedding cache (useful when corpus refreshes)."""
        self.cache.clear()
        logger.info("Embedding cache cleared.")

embedding_service = EmbeddingService()
