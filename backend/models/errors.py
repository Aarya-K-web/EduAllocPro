"""
EduAllocPro — Error Hierarchy
All custom exceptions used across the backend.
"""
from typing import Any, Optional


class EduAllocError(Exception):
    """Base exception for all EduAllocPro errors."""

    def __init__(
        self,
        message: str,
        code: str = "EDUALLOC_ERROR",
        status_code: int = 500,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code

    def to_dict(self) -> dict:
        return {
            "error": self.code,
            "message": self.message,
            "partial_result": False,
        }


class DataNotFoundError(EduAllocError):
    """Raised when a requested entity does not exist in BigQuery."""

    def __init__(self, entity: str, entity_id: str) -> None:
        super().__init__(
            message=f"{entity} '{entity_id}' not found",
            code="NOT_FOUND",
            status_code=404,
        )
        self.entity = entity
        self.entity_id = entity_id


class DataQualityError(EduAllocError):
    """Raised when school data is missing too many signals for DI computation."""

    def __init__(self, school_id: str, missing_fields: list[str]) -> None:
        super().__init__(
            message=f"School {school_id} missing {len(missing_fields)} required fields: "
            f"{', '.join(missing_fields)}",
            code="DATA_QUALITY_ERROR",
            status_code=422,
        )
        self.school_id = school_id
        self.missing_fields = missing_fields


class OptimizerTimeoutError(EduAllocError):
    """
    Raised when OR-Tools hits the time limit.
    status_code=200 — partial result IS a valid result, never 4xx/5xx.
    """

    def __init__(self, partial_result: Any = None, solver_time_s: float = 20.0) -> None:
        super().__init__(
            message="Optimizer reached time limit — returning partial result",
            code="OPTIMIZER_TIMEOUT",
            status_code=200,
        )
        self.partial_result = partial_result
        self.solver_time_s = solver_time_s

    def to_dict(self) -> dict:
        return {
            "error": self.code,
            "message": self.message,
            "partial_result": True,
        }


class GeminiParseError(EduAllocError):
    """Raised when Gemini output fails JSON schema validation."""

    def __init__(self, message: str) -> None:
        super().__init__(
            message=message,
            code="GEMINI_PARSE_ERROR",
            status_code=502,
        )


class VertexRateLimitError(EduAllocError):
    """Raised when Vertex AI returns a rate limit response."""

    def __init__(self, retry_after: int = 60) -> None:
        super().__init__(
            message=f"Vertex AI rate limit exceeded. Retry after {retry_after}s",
            code="VERTEX_RATE_LIMIT",
            status_code=429,
        )
        self.retry_after = retry_after


class GoogleAPIError(EduAllocError):
    """Raised when a Google API call fails with a non-rate-limit error."""

    def __init__(self, service: str, message: str) -> None:
        super().__init__(
            message=f"{service} API error: {message}",
            code=f"{service.upper()}_ERROR",
            status_code=502,
        )
