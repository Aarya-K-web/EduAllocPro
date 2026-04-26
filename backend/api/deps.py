"""
EduAllocPro — FastAPI Dependencies
Shared dependencies injected into route handlers.
"""
from typing import Annotated

import structlog
from fastapi import Depends, HTTPException, Request

logger = structlog.get_logger()


# ── Service Dependencies ─────────────────────────────────────────────────────

def get_bq(request: Request):
    """Get BigQueryClient from app.state."""
    return request.app.state.bq


def get_vertex(request: Request):
    """Get VertexClient from app.state."""
    return request.app.state.vertex


def get_gemini(request: Request):
    """Get GeminiClient from app.state."""
    return request.app.state.gemini


def get_maps(request: Request):
    """Get MapsClient from app.state."""
    return request.app.state.maps


def get_cache(request: Request):
    """Get EmbeddingsCache from app.state."""
    return request.app.state.cache


# ── Auth Dependencies ────────────────────────────────────────────────────────

def require_role(*allowed_roles: str):
    """
    Returns a FastAPI dependency that checks the user's role.
    Raises 401 if not authenticated, 403 if insufficient role.
    """
    def _check_role(request: Request):
        user = getattr(request.state, "user", None)
        if user is None:
            raise HTTPException(status_code=401, detail="Authentication required")
        role = user.get("role", "")
        if allowed_roles and role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Role '{role}' not permitted. Required: {list(allowed_roles)}",
            )
        return user
    return _check_role


# ── Type Aliases ─────────────────────────────────────────────────────────────
BQDep     = Annotated[object, Depends(get_bq)]
VertexDep = Annotated[object, Depends(get_vertex)]
CacheDep  = Annotated[object, Depends(get_cache)]
GeminiDep = Annotated[object, Depends(get_gemini)]
MapsDep   = Annotated[object, Depends(get_maps)]

# Role-based deps
OfficerDep   = Annotated[dict, Depends(require_role("collector", "beo", "secretary"))]
CollectorDep = Annotated[dict, Depends(require_role("collector", "secretary"))]
