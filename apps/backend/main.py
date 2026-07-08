from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.exceptions import DomainException
from app.api.v1.router import api_router
from app.schemas.response import APIResponse

from contextlib import asynccontextmanager
import asyncio
from app.core.worker import process_blockchain_tasks

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the blockchain background worker
    worker_task = asyncio.create_task(process_blockchain_tasks())
    yield
    # Cancel the worker on shutdown
    worker_task.cancel()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(DomainException)
async def domain_exception_handler(request: Request, exc: DomainException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"status": "error", "message": exc.message, "data": None}
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "version": settings.VERSION}
