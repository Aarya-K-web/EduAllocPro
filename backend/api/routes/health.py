"""
EduAllocPro — Health Check Route
GET /api/health — no auth required.
"""
from datetime import datetime

import structlog
from fastapi import APIRouter, Request

logger = structlog.get_logger()
router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(request: Request) -> dict:
    """Liveness probe — checks BQ and Vertex connectivity."""
    from config import config

    bq = getattr(request.app.state, "bq", None)
    vertex = getattr(request.app.state, "vertex", None)
    cache = getattr(request.app.state, "cache", None)

    bq_ok = await bq.ping() if bq else False
    vertex_ok = await vertex.ping() if vertex else False
    embeddings_cached = cache.size if cache else 0

    return {
        "status": "ok",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "bq_connected": bq_ok,
        "vertex_connected": vertex_ok,
        "embeddings_cached": embeddings_cached,
        "environment": config.app_env,
    }
