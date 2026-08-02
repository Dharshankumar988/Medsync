from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from app.core.config import settings
from app.core.exceptions import DomainException
from app.api.v1.router import api_router
from app.schemas.response import APIResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.dependencies.rate_limit import limiter
from app.middleware.api_logger import APILoggingMiddleware
from contextlib import asynccontextmanager
import asyncio
from app.blockchain.workers.scheduler import start_scheduler, stop_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the blockchain background worker
    start_scheduler()
    yield
    # Cancel the worker on shutdown
    stop_scheduler()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(APILoggingMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=500)
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

@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "message": "MedSync API is running. Visit /docs for documentation."}

@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "version": settings.VERSION}
