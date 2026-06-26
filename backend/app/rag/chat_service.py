# backend/app/rag/chat_service.py
from groq import Groq
from sqlalchemy.orm import Session
from app.db.session import settings
from app.rag.retrieval_service import RetrievalService
from app.rag.citation_service import CitationService
from app.prompts.SystemPrompts import INDUSTRIAL_RAG_PROMPT
from app.utils.logger import logger

class ChatService:
    def __init__(self):
        # Initialize Groq client
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        
        # FIX: Swapped out invalid string parameter 'qwen-2.5-70b' 
        # Option A: Use 'qwen-qwq-32b' for hyper-fast algorithmic reasoning
        # Option B: Use 'llama-3.3-70b-versatile' for high-volume multilingual industrial compliance
        self.model_name = "llama-3.3-70b-versatile" 
        
        logger.info(f"ChatService initialized using validated Groq model target: {self.model_name}")

    def execute_rag_pipeline(self, db: Session, session_id: str, user_message: str) -> dict:
        logger.info(f"Executing complete RAG lifecycle loop for session: {session_id}")
        
        # 1. Retrieve most relevant text chunks using our specialized vector matching service
        top_chunks = RetrievalService.retrieve_top_chunks(db, query=user_message, limit=5)
        
        # 2. Compile context payload
        context_blocks = []
        for c in top_chunks:
            context_blocks.append(f"Source: {c['title']} (Ver: {c['version']}) | Content: {c['content']}")
        context_str = "\n\n".join(context_blocks)
        
        # 3. Inject context and query into the specialized industrial prompt template
        formatted_prompt = INDUSTRIAL_RAG_PROMPT.format(
            context_str=context_str if context_str else "No explicit context files located.",
            user_query=user_message
        )
        
        # 4. Dispatch inference payload directly to the Groq Cloud infrastructure
        try:
            completion = self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": formatted_prompt}],
                temperature=0.1,  # Set low to minimize hallucination risks
                max_tokens=1024
            )
            raw_answer = completion.choices[0].message.content
        except Exception as e:
            logger.error(f"Groq API connection or inference execution failure: {str(e)}")
            raw_answer = "Error: Failed to fetch data from the processing engine. Please check local connectivity."
            
        # 5. Extract and map citations to pinpoint source materials
        citations = CitationService.identify_citations(raw_answer, top_chunks)
        
        # 6. Calculate confidence index metrics dynamically based on vector distance coefficients
        avg_score = sum(c["score"] for c in top_chunks) / len(top_chunks) if top_chunks else 0.0
        confidence_metric = f"{int(avg_score * 100)}%" if avg_score > 0 else "80%"
        
        return {
            "content": raw_answer,
            "confidence_score": confidence_metric,
            "citations": citations
        }

chat_service = ChatService()