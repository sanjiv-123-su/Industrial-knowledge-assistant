from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class DocumentBase(BaseModel):
    title: str
    department: str
    version: Optional[str] = "1.0"

class DocumentCreate(DocumentBase):
    pass

class DocumentResponse(DocumentBase):
    id: str
    status: str
    uploaded_by: str
    summary: Optional[str] = None
    keywords: Optional[List[str]] = None
    suggested_questions: Optional[List[str]] = None
    created_at: datetime
    chunks: Optional[int] = 0
    pages: Optional[int] = 0

    class Config:
        from_attributes = True