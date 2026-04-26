"""
EduAllocPro — Thread-Safe Embeddings Cache
LRU in-memory cache for Vertex AI teacher embeddings.
TTL: 24 hours. Max size: 10,000 entries.
"""
import threading
import time
from collections import OrderedDict
from typing import Optional

import structlog

logger = structlog.get_logger()


class EmbeddingsCache:
    """
    Thread-safe LRU cache for teacher embedding vectors.
    Evicts oldest entry when at max_size.
    Entries expire after ttl_hours.
    """

    def __init__(self, ttl_hours: int = 24, max_size: int = 10_000) -> None:
        self._ttl_seconds = ttl_hours * 3600
        self._max_size = max_size
        self._cache: OrderedDict[str, tuple[list[float], float]] = OrderedDict()
        self._lock = threading.RLock()

    def get(self, key: str) -> Optional[list[float]]:
        """
        Get embedding vector for key.
        Returns None if not found or TTL expired.
        """
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                return None
            vec, timestamp = entry
            if time.time() - timestamp > self._ttl_seconds:
                del self._cache[key]
                return None
            # Move to end (most recently used)
            self._cache.move_to_end(key)
            return vec

    def set(self, key: str, vec: list[float]) -> None:
        """
        Store embedding vector.
        Evicts oldest entry if at max_size.
        """
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
            else:
                if len(self._cache) >= self._max_size:
                    # Evict oldest (first item)
                    evicted_key, _ = self._cache.popitem(last=False)
                    logger.debug("cache.evict", key=evicted_key[:8])
            self._cache[key] = (vec, time.time())

    def invalidate(self, key: str) -> None:
        """Remove a specific key from cache."""
        with self._lock:
            self._cache.pop(key, None)

    @property
    def size(self) -> int:
        """Current number of cached entries."""
        with self._lock:
            return len(self._cache)

    async def warm_up(self, bq, vertex) -> int:
        """
        Pre-load all teacher embeddings from BigQuery into cache.
        Called at startup to avoid cold-start latency.
        Returns number of entries loaded.
        """
        log = logger.bind(fn="warm_up")
        log.info("cache.warmup.start")

        try:
            teachers = await bq.get_all_teachers_with_embeddings()
            loaded = 0
            for teacher in teachers:
                teacher_id = teacher.get("teacher_id")
                embedding = teacher.get("embedding")
                if teacher_id and embedding:
                    # embedding may be stored as JSON string in BQ
                    if isinstance(embedding, str):
                        import json
                        embedding = json.loads(embedding)
                    self.set(teacher_id, embedding)
                    loaded += 1

            log.info("cache.warmup.done", loaded=loaded, total=len(teachers))
            return loaded
        except Exception as e:
            log.error("cache.warmup.error", error=str(e))
            return 0
