import uuid
from sqlalchemy import Column, String, Text, DateTime, Integer, JSON
from sqlalchemy.sql import func
from app.db.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False, index=True)
    department = Column(String(100), nullable=False, index=True)
    version = Column(String(20), default="1.0")
    status = Column(String(50), default="Processing")  # Processing, Indexed, Failed
    uploaded_by = Column(String(100), default="Plant Operator")
    summary = Column(Text, nullable=True)
    keywords = Column(JSON, nullable=True)
    suggested_questions = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    # Storing embeddings as LONGTEXT JSON serialized array for standard MySQL processing
    embedding_vector = Column(Text, nullable=False) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())