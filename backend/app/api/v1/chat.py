from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.chat import ChatMessageRequest, ChatMessageResponse
from app.models.history import ChatHistory
from app.rag.chat_service import chat_service
import uuid

router = APIRouter()

@router.post("/", response_model=ChatMessageResponse)
def post_chat_message(payload: ChatMessageRequest, db: Session = Depends(get_db)):
    # 1. Log incoming user query to chat history
    user_msg = ChatHistory(
        session_id=payload.session_id,
        role="user",
        content=payload.message
    )
    db.add(user_msg)
    db.commit()

    try:
        # 2. Run query through the live RAG pipeline
        rag_output = chat_service.execute_rag_pipeline(db, payload.session_id, payload.message)
        
        # 3. Persist generated assistant response along with metadata and citations
        ai_msg = ChatHistory(
            session_id=payload.session_id,
            role="assistant",
            content=rag_output["content"],
            confidence_score=rag_output["confidence_score"],
            citations=rag_output["citations"]
        )
        db.add(ai_msg)
        db.commit()
        db.refresh(ai_msg)
        
        return ai_msg
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal processing failure: {str(e)}")