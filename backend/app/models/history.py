import uuid
from sqlalchemy import Column, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from app.db.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(100), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    citations = Column(JSON, nullable=True)
    confidence_score = Column(String(10), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())