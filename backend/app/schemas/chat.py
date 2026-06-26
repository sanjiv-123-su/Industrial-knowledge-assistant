from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class ChatMessageRequest(BaseModel):
    session_id: str
    message: str

class CitationSchema(BaseModel):
    document_title: str
    chunk_index: int
    snippet: str

class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    citations: Optional[List[CitationSchema]] = []
    confidence_score: Optional[str] = "100%"
    created_at: datetime

    class Config:
        from_attributes = True