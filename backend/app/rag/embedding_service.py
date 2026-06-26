from sentence_transformers import SentenceTransformer
from app.utils.logger import logger
import json

class EmbeddingService:
    def __init__(self):
        logger.info("Initializing BAAI/bge-small-en-v1.5 Local Transformer Model...")
        # Local cache deployment path. Uses CPU/GPU execution based on local setup architecture
        self.model = SentenceTransformer('BAAI/bge-small-en-v1.5')
        logger.info("Embedding Service model loaded successfully.")

    def generate_embedding(self, text: str) -> list[float]:
        """Generates a dense vector representation of 384 dimensions from raw text."""
        try:
            # BGE Small v1.5 outputs an array matching the 384 dimension standard
            embedding = self.model.encode(text, normalize_embeddings=True)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Failed to generate vector embedding via BGE: {str(e)}")
            raise e

# Global single initialization to prevent reloading model into memory on every request
embedding_service = EmbeddingService()