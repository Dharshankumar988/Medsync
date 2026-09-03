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
import logging
try:
    from app.blockchain.workers.scheduler import start_scheduler, stop_scheduler
except ImportError:
    start_scheduler = lambda: logger.warning("Blockchain scheduler disabled (dependencies missing)")
    stop_scheduler = lambda: None

logger = logging.getLogger("medsync.startup")

class AppState:
    def __init__(self):
        self.models_ready = False
        self.groq_ready = False
        self.blockchain_ready = False

app_state = AppState()

async def _init_ai_background():
    try:
        from app.ai.core.inference_service import inference_service
        from app.ai.services.groq_client import groq_client
        
        # Verify Groq is configured
        await groq_client.verify_health()
        if groq_client.is_healthy:
            logger.info("AI Warmup: Groq LLM → healthy")
            app_state.groq_ready = True
        else:
            logger.warning("AI Warmup: Groq LLM → unavailable (check GROQ_API_KEY)")
            app_state.groq_ready = False
            
        # Warm up Local Models
        logger.info("AI Warmup: Initializing local models (may take time on first run)...")
        
        def _load_local_models():
            from app.services.rag_service import rag_service
            rag_service._get_embedding_model()
            try:
                from app.services.face_auth_service import get_arcface_model
                model = get_arcface_model()
                if model is not None:
                    logger.info("AI Warmup: DeepFace ArcFace → ready")
                else:
                    logger.warning("AI Warmup: DeepFace ArcFace → model returned None (lazy init fallback)")
            except Exception as e:
                logger.warning(f"AI Warmup: DeepFace ArcFace → failed ({e})")

        await asyncio.to_thread(_load_local_models)
        logger.info("AI Warmup: Local models downloaded and cached successfully.")
        app_state.models_ready = True
        logger.info("═══ AI Subsystem Ready ═══")
    except Exception as e:
        logger.warning(f"AI warmup skipped or failed (non-critical): {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──
    logger.info("═══ MedSync Backend Starting ═══")
    
    # 0. Initialize SQLite database if fallback is used
    from app.database.session import engine, db_url
    if "sqlite" in str(db_url):
        from app.models import Base
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Initialized in-memory SQLite database fallback")
    
    # 1. Start blockchain scheduler
    try:
        from app.blockchain.client import blockchain_client
        if getattr(blockchain_client, 'configured', False):
            start_scheduler()
            app_state.blockchain_ready = True
        else:
            logger.info("Blockchain not configured. Scheduler disabled.")
            app_state.blockchain_ready = False
    except Exception as e:
        logger.warning(f"Failed to check blockchain configuration: {e}")
        app_state.blockchain_ready = False
    # 2. Start QR token cleanup background task
    qr_cleanup_task = None
    try:
        from app.tasks.qr_cleanup import qr_cleanup_loop
        qr_cleanup_task = asyncio.create_task(qr_cleanup_loop())
        logger.info("QR cleanup background task registered")
    except Exception as e:
        logger.warning(f"QR cleanup task registration failed (non-critical): {e}")
    # 3. Warm up AI subsystem (non-blocking background task)
    from app.ai.core.inference_service import inference_service
    logger.info("AI Warmup: Pinging HF Space in background...")
    asyncio.create_task(inference_service.warmup())
    
    # Run heavy AI / local model initialization completely in the background
    asyncio.create_task(_init_ai_background())
    
    yield
    
    # ── Shutdown ──
    if qr_cleanup_task:
        qr_cleanup_task.cancel()
        try:
            await qr_cleanup_task
        except asyncio.CancelledError:
            pass
    stop_scheduler()
    logger.info("═══ MedSync Backend Stopped ═══")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(APILoggingMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=500)
cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
if not cors_origins:
    logger.warning("CORS_ORIGINS is empty! No cross-origin requests will be allowed.")
    cors_origins = ["http://localhost:3000"]  # Minimal safe fallback for local dev

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

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
    # Health checks LIVENESS: is the FastAPI server running and responding?
    return {"status": "ok", "version": settings.VERSION}

@app.get("/readiness", tags=["System"])
async def readiness_check():
    # Readiness checks DEPENDENCIES: are optional services ready?
    return {
        "status": "ready",
        "database": True,  # DB connection check could be added here
        "models": app_state.models_ready,
        "groq": app_state.groq_ready,
        "blockchain": app_state.blockchain_ready
    }
