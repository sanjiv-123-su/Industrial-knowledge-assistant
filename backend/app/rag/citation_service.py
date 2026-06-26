import re

class CitationService:
    @staticmethod
    def identify_citations(answer: str, context_chunks: list[dict]) -> list[dict]:
        """
        Cross-references terms, metrics, and expressions inside the generated text 
        against the source chunks to explicitly map accurate footnotes.
        """
        matched_citations = []
        seen_docs = set()
        
        for idx, chunk in enumerate(context_chunks):
            # Check for direct text references or document identifiers
            doc_key = f"{chunk['title']}-Chunk{chunk['chunk_index']}"
            if doc_key in seen_docs:
                continue
                
            # If the LLM referenced the title or explicitly matched content fragments
            title_clean = re.sub(r'[^a-zA-Z0-9]', '', chunk['title'].lower())
            answer_clean = re.sub(r'[^a-zA-Z0-9]', '', answer.lower())
            
            # Extract distinct operational keywords to verify matching
            keywords = [w for w in chunk['content'].split() if len(w) > 6][:3]
            kw_match = any(kw.lower() in answer.lower() for kw in keywords)

            if title_clean in answer_clean or kw_match:
                matched_citations.append({
                    "document_title": chunk["title"],
                    "chunk_index": chunk["chunk_index"],
                    "snippet": chunk["content"][:200] + "..."
                })
                seen_docs.add(doc_key)
                
        return matched_citations