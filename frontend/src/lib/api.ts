// Centralized API Client and TypeScript Types

export const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:8000/api/v1";

// ---------- API Response Interfaces ----------

export interface DocumentResponse {
  id: string;
  title: string;
  department: string;
  version: string;
  status: "Processing" | "Indexed" | "Failed";
  uploaded_by: string;
  summary?: string | null;
  keywords?: string[] | null;
  suggested_questions?: string[] | null;
  created_at: string;
  chunks: number;
  pages: number;
}

export interface CitationSchema {
  document_title: string;
  chunk_index: number;
  snippet: string;
}

export interface ChatMessageRequest {
  session_id: string;
  message: string;
}

export interface ChatMessageResponse {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  citations?: CitationSchema[];
  confidence_score?: string;
  created_at: string;
}

export interface SearchTrendItem {
  day: string;
  searches: number;
  queries: number;
}

export interface MostViewedSOP {
  title: string;
  views: number;
  department: string;
}

export interface DepartmentUsageItem {
  department: string;
  percentage: number;
}

export interface PerformanceMetrics {
  total_documents: number;
  total_searches: number;
  active_users: number;
  ai_accuracy: string;
  avg_latency_ms: number;
}

export interface DashboardAnalyticsResponse {
  metrics: PerformanceMetrics;
  search_trends: SearchTrendItem[];
  most_viewed_sops: MostViewedSOP[];
  department_usage: DepartmentUsageItem[];
  recent_activity: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
  }>;
}

export interface SearchResult {
  document_id: string;
  title: string;
  department: string;
  version: string;
  snippet: string;
  score: number;
}

export interface SearchRequest {
  query: string;
  department_filter?: string;
  doc_type_filter?: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  execution_time_ms: number;
}

// ---------- Request / Fetch Helper ----------

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = new Headers(options?.headers);
  if (!(options?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errMsg = "An API error occurred";
    try {
      const text = await response.text();
      // Try parsing standard FastAPI/Pydantic validation errors or simple string detail
      try {
        const parsed = JSON.parse(text);
        if (parsed.detail) {
          if (typeof parsed.detail === "string") {
            errMsg = parsed.detail;
          } else if (Array.isArray(parsed.detail)) {
            errMsg = parsed.detail.map((d: any) => `${d.loc.join(".")}: ${d.msg}`).join("; ");
          }
        }
      } catch {
        if (text) errMsg = text;
      }
    } catch {}
    
    throw new Error(errMsg);
  }

  return response.json();
}

export const ACCEPTED_EXT = [".pdf", ".doc", ".docx", ".txt"] as const;
export const ACCEPTED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export function validateFile(file: File): string | null {
  const lower = file.name.toLowerCase();
  const okExt = ACCEPTED_EXT.some((e) => lower.endsWith(e));
  const okMime = file.type === "" ? okExt : ACCEPTED_MIME.includes(file.type) || okExt;
  if (!okExt || !okMime) return `Unsupported file type: ${file.name}`;
  if (file.size > MAX_FILE_SIZE) return `${file.name} exceeds 25MB limit`;
  if (file.size === 0) return `${file.name} is empty`;
  return null;
}