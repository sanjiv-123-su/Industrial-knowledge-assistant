from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class SearchRequest(BaseModel):
    query: str
    department_filter: Optional[str] = None
    doc_type_filter: Optional[str] = None

class SearchResultItem(BaseModel):
    document_id: str
    title: str
    department: str
    version: str
    snippet: str
    score: float

class SearchResponse(BaseModel):
    query: str
    results: List[SearchResultItem]
    execution_time_ms: int