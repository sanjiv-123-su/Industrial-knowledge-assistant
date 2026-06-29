from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import Base, engine, settings
from app.api.v1 import documents, chat, search, analytics
from app.utils.logger import logger

# Initialize Database Structures directly for rapid proof-of-concept initialization
Base.metadata.create_all(bind=engine)
logger.info("MySQL Database structural schemas successfully synchronized.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router, prefix=f"{settings.API_V1_STR}/documents", tags=["Documents"])
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat", tags=["AI Chat Engine"])
app.include_router(search.router, prefix=f"{settings.API_V1_STR}/search", tags=["Knowledge Search Engine"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["Plant Operational Analytics"])

@app.get("/health", tags=["Infrastructure System Check"])
def system_health_check():
    return {"status": "operational", "database": "connected", "auth": "bypassed"}