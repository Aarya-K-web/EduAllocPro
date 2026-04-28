"""
EduAllocPro — FastAPI Application Factory
Lifespan: initialises BigQueryClient, VertexClient, GeminiClient, EmbeddingsCache.
"""
import sys
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import config

# Configure structlog with JSON renderer
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(
        getattr(__import__("logging"), config.log_level, 20)
    ),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: initialise all shared state. Shutdown: close connections."""
    logger.info("app.startup.begin", env=config.app_env)

    # BigQuery client
    from services.bigquery_client import BigQueryClient
    bq = BigQueryClient(project_id=config.gcp_project, dataset=config.bq_dataset)
    app.state.bq = bq

    # Vertex AI client
    from services.vertex_client import VertexClient
    vertex = VertexClient(
        project_id=config.gcp_project,
        location=config.vertex_location,
        model_name=config.vertex_model,
    )
    app.state.vertex = vertex

    # Gemini client
    from services.gemini_client import GeminiClient
    gemini = GeminiClient(api_key=config.gemini_key, model=config.gemini_model)
    app.state.gemini = gemini

    # Maps client
    from services.maps_client import MapsClient
    maps = MapsClient(api_key=config.maps_key, distance_mode=config.maps_distance_mode)
    app.state.maps = maps

    # Embeddings cache
    from ai.embeddings_cache import EmbeddingsCache
    cache = EmbeddingsCache(
        ttl_hours=config.cache_ttl_hours,
        max_size=config.cache_max_size,
    )
    app.state.cache = cache

    # Warm up cache from BigQuery
    try:
        loaded = await cache.warm_up(bq, vertex)
        logger.info("app.cache.warmed", loaded=loaded)
    except Exception as e:
        logger.warning("app.cache.warmup_failed", error=str(e))

    logger.info("app.startup.done")
    yield

    # Shutdown
    logger.info("app.shutdown.begin")
    bq.close()
    vertex.close()
    await maps.close()
    logger.info("app.shutdown.done")


# ── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="EduAllocPro API",
    description="School Intelligence & Teacher Deployment Platform — Maharashtra",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if config.app_env != "production" else None,
    redoc_url="/api/redoc" if config.app_env != "production" else None,
)

# CORS — allow Vercel + localhost:5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.get_cors_origins() + [
        "https://frontend-flax-two-1atipqo8ee.vercel.app",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
from api.routes import health, schools, teachers, deploy, briefing
from api.middleware.auth import FirebaseAuthMiddleware
from api.middleware.logging import StructuredLoggingMiddleware

app.add_middleware(StructuredLoggingMiddleware)
app.add_middleware(FirebaseAuthMiddleware, project_id=config.firebase_project_id)

app.include_router(health.router,   prefix="/api")
app.include_router(schools.router,  prefix="/api")
app.include_router(teachers.router, prefix="/api")
app.include_router(deploy.router,   prefix="/api")
app.include_router(briefing.router, prefix="/api")

# ── Global Exception Handler ─────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Never leak stack traces to clients."""
    from models.errors import EduAllocError
    if isinstance(exc, EduAllocError):
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.to_dict(),
        )
    logger.error("unhandled_exception", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=500,
        content={"error": "INTERNAL_ERROR", "message": "An internal error occurred"},
    )
