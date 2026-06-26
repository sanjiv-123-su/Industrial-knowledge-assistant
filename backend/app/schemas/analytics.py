from pydantic import BaseModel
from typing import List, Dict, Any

class SearchTrendItem(BaseModel):
    day: str
    searches: int
    queries: int

class MostViewedSOP(BaseModel):
    title: str
    views: int
    department: str

class DepartmentUsageItem(BaseModel):
    department: str
    percentage: float

class PerformanceMetrics(BaseModel):
    total_documents: int
    total_searches: int
    active_users: int
    ai_accuracy: str
    avg_latency_ms: int

class DashboardAnalyticsResponse(BaseModel):
    metrics: PerformanceMetrics
    search_trends: List[SearchTrendItem]
    most_viewed_sops: List[MostViewedSOP]
    department_usage: List[DepartmentUsageItem]
    recent_activity: List[Dict[str, Any]]