"""
EduAllocPro — Structured Logging Middleware
Generates request_id, logs http.request with duration.
"""
import time
import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware

logger = structlog.get_logger()


class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    """Log every HTTP request with request_id, method, path, status, duration."""

    async def dispatch(self, request, call_next):
        request_id = str(uuid.uuid4())[:8]
        structlog.contextvars.bind_contextvars(request_id=request_id)

        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 1)

        logger.info(
            "http.request",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
        )

        structlog.contextvars.unbind_contextvars("request_id")
        response.headers["X-Request-ID"] = request_id
        return response
