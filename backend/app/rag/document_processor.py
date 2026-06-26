import io
import re
from typing import List, Dict, Any
from pypdf import PdfReader
import docx2txt
from app.utils.logger import logger

class DocumentProcessor:
    @staticmethod
    def extract_text_from_pdf(file_bytes: bytes) -> str:
        """Extracts raw textual payload from uploaded PDF binary streams."""
        try:
            pdf_file = io.BytesIO(file_bytes)
            reader = PdfReader(pdf_file)
            extracted_text = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text:
                    extracted_text.append(text)
            return "\n".join(extracted_text)
        except Exception as e:
            logger.error(f"Error parsing PDF payload: {str(e)}")
            raise ValueError(f"Failed to extract text from PDF: {str(e)}")

    @staticmethod
    def extract_text_from_docx(file_bytes: bytes) -> str:
        """Extracts raw text content from Microsoft Word DOCX streams."""
        try:
            docx_file = io.BytesIO(file_bytes)
            text = docx2txt.process(docx_file)
            return text
        except Exception as e:
            logger.error(f"Error parsing DOCX payload: {str(e)}")
            raise ValueError(f"Failed to extract text from DOCX: {str(e)}")

    @staticmethod
    def extract_text(filename: str, file_bytes: bytes) -> str:
        """Routes file types to their respective structural extraction utility."""
        lower_name = filename.lower()
        if lower_name.endswith('.pdf'):
            return DocumentProcessor.extract_text_from_pdf(file_bytes)
        elif lower_name.endswith('.docx'):
            return DocumentProcessor.extract_text_from_docx(file_bytes)
        elif lower_name.endswith('.txt'):
            return file_bytes.decode('utf-8', errors='ignore')
        else:
            raise ValueError("Unsupported asset format extension passed to ingestion router.")

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
        """
        Splits raw text down into fixed-character text blocks with a rolling overlap window.
        Ensures technical instructions at the boundary aren't truncated out of context.
        """
        # Normalize structural whitespace anomalies
        cleaned_text = re.sub(r'\s+', ' ', text).strip()
        
        if len(cleaned_text) <= chunk_size:
            return [cleaned_text]
            
        chunks = []
        start_idx = 0
        
        while start_idx < len(cleaned_text):
            end_idx = start_idx + chunk_size
            chunk = cleaned_text[start_idx:end_idx]
            chunks.append(chunk)
            # Roll forward by chunk size minus overlap step
            start_idx += (chunk_size - chunk_overlap)
            
        return chunks

    @staticmethod
    def run_ai_enrichment(title: str, department: str, text_sample: str) -> Dict[str, Any]:
        """
        Simulates metadata generation.
        Will handle API execution to auto-summarize and tag plant items.
        """
        # Generates fallback templates safely matching industrial schemas
        summary = f"This document contains standard operating procedures and technical parameters for the {department} division, with explicit focus on {title}. Review for plant floor clearance."
        keywords = [department.upper(), "TATA STEEL", "SOP-METRIC", title.split('-')[0]]
        suggested_questions = [
            f"What is the primary core operating mechanism for {title}?",
            f"What safety precautions apply to the {department} environment?",
            f"How do operators troubleshoot alignment errors in {title}?"
        ]
        return {
            "summary": summary,
            "keywords": keywords,
            "suggested_questions": suggested_questions
        }