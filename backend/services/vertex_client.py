"""
EduAllocPro — Vertex AI Embeddings Client
Wraps google-cloud-aiplatform for textembedding-gecko@003.
Model: textembedding-gecko@003 — DO NOT CHANGE (cache consistency).
"""
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

import structlog

from utils.retry import with_retry

logger = structlog.get_logger()

try:
    from google.cloud import aiplatform
    from vertexai.language_models import TextEmbeddingModel
    VERTEX_AVAILABLE = True
except ImportError:
    VERTEX_AVAILABLE = False


class VertexClient:
    """Async Vertex AI embeddings client."""

    def __init__(self, project_id: str, location: str, model_name: str) -> None:
        self._project_id = project_id
        self._location = location
        self._model_name = model_name
        self._pool = ThreadPoolExecutor(max_workers=2)
        self._model = None

        if VERTEX_AVAILABLE and project_id:
            try:
                aiplatform.init(project=project_id, location=location)
                self._model = TextEmbeddingModel.from_pretrained(model_name)
                logger.info("vertex.init.ok", model=model_name)
            except Exception as e:
                logger.warning("vertex.init.failed", error=str(e))

    @classmethod
    def from_env(cls) -> "VertexClient":
        from config import config
        return cls(
            project_id=config.gcp_project,
            location=config.vertex_location,
            model_name=config.vertex_model,
        )

    @with_retry(max_attempts=3, backoff_base=1.0)
    async def embed(self, texts: list[str]) -> list[list[float]]:
        """
        Embed a list of texts using textembedding-gecko@003.
        Returns list of 768-dimensional float vectors.
        """
        if not self._model:
            # Return zero vectors as fallback for development
            logger.warning("vertex.embed.fallback", count=len(texts))
            return [[0.0] * 768 for _ in texts]

        log = logger.bind(fn="embed", count=len(texts))
        log.info("vertex.embed.start")

        def _embed():
            embeddings = self._model.get_embeddings(texts)
            return [e.values for e in embeddings]

        loop = asyncio.get_event_loop()
        try:
            result = await loop.run_in_executor(self._pool, _embed)
            log.info("vertex.embed.done", dims=len(result[0]) if result else 0)
            return result
        except Exception as e:
            log.error("vertex.embed.error", error=str(e))
            raise

    async def ping(self) -> bool:
        """Health check — embed a single test string."""
        try:
            result = await self.embed(["health check"])
            return len(result) > 0 and len(result[0]) > 0
        except Exception:
            return False

    def close(self) -> None:
        self._pool.shutdown(wait=False)
