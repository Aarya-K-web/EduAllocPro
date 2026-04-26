"""
EduAllocPro — Retry Decorator
Exponential backoff for external service calls.
"""
import asyncio
import functools
import time
from typing import Callable, Type

import structlog

logger = structlog.get_logger()


def with_retry(
    max_attempts: int = 3,
    backoff_base: float = 1.0,
    retryable_exceptions: tuple = (Exception,),
) -> Callable:
    """
    Decorator for async functions that should be retried on failure.

    Exponential backoff: backoff_base * 2^(attempt-1)
    Logs a warning on each retry with fn name, attempt, wait_s, error.
    """
    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        async def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return await fn(*args, **kwargs)
                except retryable_exceptions as exc:
                    last_error = exc
                    if attempt < max_attempts:
                        wait_s = backoff_base * (2 ** (attempt - 1))
                        log = logger.bind(fn=fn.__name__, attempt=attempt, wait_s=wait_s)
                        log.warning("retry.attempt", error=str(exc))
                        await asyncio.sleep(wait_s)
                    else:
                        log = logger.bind(fn=fn.__name__, attempt=attempt)
                        log.error("retry.exhausted", error=str(exc))
            raise last_error
        return wrapper
    return decorator


def with_retry_sync(
    max_attempts: int = 3,
    backoff_base: float = 1.0,
    retryable_exceptions: tuple = (Exception,),
) -> Callable:
    """Synchronous version of with_retry for non-async functions."""
    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return fn(*args, **kwargs)
                except retryable_exceptions as exc:
                    last_error = exc
                    if attempt < max_attempts:
                        wait_s = backoff_base * (2 ** (attempt - 1))
                        log = logger.bind(fn=fn.__name__, attempt=attempt, wait_s=wait_s)
                        log.warning("retry.attempt", error=str(exc))
                        time.sleep(wait_s)
                    else:
                        log = logger.bind(fn=fn.__name__, attempt=attempt)
                        log.error("retry.exhausted", error=str(exc))
            raise last_error
        return wrapper
    return decorator
