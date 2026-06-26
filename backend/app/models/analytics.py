import uuid
from sqlalchemy import Column, String, Text, DateTime, Integer, JSON
from sqlalchemy.sql import func
from app.db.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class SearchLog(Base):
    __tablename__ = "search_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    query = Column(String(505), nullable=False, index=True)
    filters_applied = Column(JSON, nullable=True)
    results_count = Column(Integer, default=0)
    execution_time_ms = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SystemMetric(Base):
    __tablename__ = "system_metrics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    metric_name = Column(String(100), nullable=False, index=True)
    metric_value = Column(String(255), nullable=False)
    context_payload = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())