from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.search import SearchRequest, SearchResponse
from app.models.analytics import SearchLog
from app.rag.retrieval_service import RetrievalService
import time
import json

router = APIRouter()

@router.post("/", response_model=SearchResponse)
def execute_knowledge_search(payload: SearchRequest, db: Session = Depends(get_db)):
    start_time = time.time()
    
    # 1. Execute vector search across MySQL text chunks via Python engine
    retrieved_items = RetrievalService.retrieve_top_chunks(
        db=db, 
        query=payload.query, 
        limit=5, 
        department_filter=payload.department_filter
    )
    
    # 2. Format search results for client mapping
    search_results = []
    for item in retrieved_items:
        search_results.append({
            "document_id": item["document_id"],
            "title": item["title"],
            "department": item["department"],
            "version": item["version"],
            "snippet": item["content"][:300] + "...",
            "score": item["score"]
        })
        
    execution_duration_ms = int((time.time() - start_time) * 1000)
    
    # 3. Log query execution data asynchronously to the database for dashboard metrics
    filters_dict = {
        "department_filter": payload.department_filter,
        "doc_type_filter": payload.doc_type_filter
    }
    
    log_entry = SearchLog(
        query=payload.query,
        filters_applied=json.dumps(filters_dict),
        results_count=len(search_results),
        execution_time_ms=execution_duration_ms
    )
    db.add(log_entry)
    db.commit()
    
    return SearchResponse(
        query=payload.query,
        results=search_results,
        execution_time_ms=execution_duration_ms
    )