from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.document import Document, DocumentChunk
from app.schemas.document import DocumentResponse
from app.rag.document_processor import DocumentProcessor
from app.utils.logger import logger
import json
from app.rag.embedding_service import embedding_service

router = APIRouter()

def process_document_pipeline_task(document_id: str, filename: str, file_bytes: bytes, department: str, title: str):
    """Asynchronous background processing worker function."""
    db: Session = next(get_db())
    try:
        logger.info(f"Starting asynchronous background document processing engine for ID: {document_id}")
        
        # 1. Parse content
        raw_text = DocumentProcessor.extract_text(filename, file_bytes)
        
        # 2. Chunk text
        chunks = DocumentProcessor.chunk_text(raw_text, chunk_size=1000, chunk_overlap=200)
        logger.info(f"Successfully broken file into {len(chunks)} structural windows.")
        
        # 3. Save chunks into the database (with real embedding vectors)
        for idx, chunk_content in enumerate(chunks):
            # generate embedding for each chunk and persist
            real_vector = embedding_service.generate_embedding(chunk_content)
            db_chunk = DocumentChunk(
                document_id=document_id,
                chunk_index=idx,
                content=chunk_content,
                embedding_vector=json.dumps(real_vector) # JSON string representation for MySQL LONGTEXT storage
            )
            db.add(db_chunk)
                    
        # 4. Run AI enrichment processing simulation
        enrichment = DocumentProcessor.run_ai_enrichment(title, department, raw_text[:2000])
        
        # 5. Commit mutations and flip index lifecycle flags
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = "Indexed"
            doc.summary = enrichment["summary"]
            doc.keywords = enrichment["keywords"]
            doc.suggested_questions = enrichment["suggested_questions"]
            db.commit()
            logger.info(f"Document ingestion pipeline executed successfully for ID: {document_id}")
            
    except Exception as e:
        logger.error(f"Ingestion worker pipeline failure across resource {document_id}: {str(e)}")
        db.rollback()
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = "Failed"
            db.commit()

def reindex_pipeline_task(document_id: str):
    """Asynchronous background processing for reindexing."""
    db: Session = next(get_db())
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            logger.info(f"Reindexing document: {document_id}")
            chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).all()
            raw_text = " ".join([c.content for c in chunks])
            enrichment = DocumentProcessor.run_ai_enrichment(doc.title, doc.department, raw_text[:2000])
            doc.status = "Indexed"
            doc.summary = enrichment["summary"]
            doc.keywords = enrichment["keywords"]
            doc.suggested_questions = enrichment["suggested_questions"]
            db.commit()
            logger.info(f"Reindexing complete for: {document_id}")
    except Exception as e:
        logger.error(f"Reindex task failure: {str(e)}")
        db.rollback()
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = "Failed"
            db.commit()

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    department: str = Form(...),
    version: str = Form("1.0"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(('.pdf', '.docx', '.txt')):
        raise HTTPException(status_code=400, detail="Invalid extension. Plant platform parses only PDF, DOCX, and TXT files.")
    
    file_bytes = await file.read()
    
    # Pre-register entry in MySQL with a "Processing" status badge
    new_doc = Document(
        title=title,
        department=department,
        version=version,
        status="Processing",
        uploaded_by="Plant Operator"
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    
    # Enqueue text parsing and extraction steps to background threads
    background_tasks.add_task(
        process_document_pipeline_task,
        document_id=new_doc.id,
        filename=file.filename,
        file_bytes=file_bytes,
        department=department,
        title=title
    )
    
    doc_res = DocumentResponse.from_orm(new_doc)
    doc_res.chunks = 0
    doc_res.pages = 1
    return doc_res

@router.get("/", response_model=list[DocumentResponse])
def list_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).all()
    results = []
    for doc in docs:
        chunks_count = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).count()
        pages_est = max(1, chunks_count // 2)
        doc_res = DocumentResponse.from_orm(doc)
        doc_res.chunks = chunks_count
        doc_res.pages = pages_est
        results.append(doc_res)
    return results

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document_details(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Requested plant item record matching key doesn't exist.")
    chunks_count = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).count()
    pages_est = max(1, chunks_count // 2)
    doc_res = DocumentResponse.from_orm(doc)
    doc_res.chunks = chunks_count
    doc_res.pages = pages_est
    return doc_res

@router.delete("/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete chunks and doc
    db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).delete()
    db.delete(doc)
    db.commit()
    return {"status": "success", "message": "Document and all its indexed chunks deleted."}

@router.post("/{document_id}/reindex", response_model=DocumentResponse)
def reindex_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc.status = "Processing"
    db.commit()
    
    background_tasks.add_task(reindex_pipeline_task, document_id)
    
    chunks_count = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).count()
    pages_est = max(1, chunks_count // 2)
    doc_res = DocumentResponse.from_orm(doc)
    doc_res.chunks = chunks_count
    doc_res.pages = pages_est
    return doc_res