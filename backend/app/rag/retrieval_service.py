import json
import numpy as np
from sqlalchemy.orm import Session
from app.models.document import Document, DocumentChunk
from app.rag.embedding_service import embedding_service
from app.utils.logger import logger

class RetrievalService:
    @staticmethod
    def retrieve_top_chunks(db: Session, query: str, limit: int = 5, department_filter: str = None) -> list[dict]:
        """
        Executes a localized Python Vector Search using Cosine Similarity thresholds.
        Calculates similarity across database records stored in standard MySQL tables.
        """
        logger.info(f"Initiating vector search sequence for query: '{query}'")
        query_vector = np.array(embedding_service.generate_embedding(query))

        # Query chunks from database
        chunks_query = db.query(DocumentChunk)
        
        # Apply relational joint filter if department restriction is specified
        if department_filter:
            chunks_query = chunks_query.join(Document, Document.id == DocumentChunk.document_id)\
                                       .filter(Document.department == department_filter)
            
        all_chunks = chunks_query.all()
        if not all_chunks:
            return []

        results = []
        for chunk in all_chunks:
            # De-serialize vector from JSON string array
            chunk_vec = np.array(json.loads(chunk.embedding_vector))
            
            # Compute Cosine Similarity metrics natively via NumPy arrays
            dot_product = np.dot(query_vector, chunk_vec)
            norm_q = np.linalg.norm(query_vector)
            norm_c = np.linalg.norm(chunk_vec)
            
            similarity_score = dot_product / (norm_q * norm_c) if (norm_q * norm_c) > 0 else 0.0
            
            # Fetch relational parent document attributes to map metadata details
            parent_doc = db.query(Document).filter(Document.id == chunk.document_id).first()
            
            results.append({
                "document_id": chunk.document_id,
                "title": parent_doc.title if parent_doc else "Unknown SOP",
                "department": parent_doc.department if parent_doc else "General Operations",
                "version": parent_doc.version if parent_doc else "1.0",
                "chunk_index": chunk.chunk_index,
                "content": chunk.content,
                "score": float(similarity_score)
            })

        # Sort based on similarity and slice top hits
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:limit]