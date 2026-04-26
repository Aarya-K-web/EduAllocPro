"""
EduAllocPro — Test Configuration
Shared fixtures for all tests.
"""
import sys
import os

# Add backend root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from unittest.mock import AsyncMock, MagicMock


@pytest.fixture
def mock_bq():
    """Mock BigQueryClient."""
    bq = AsyncMock()
    bq.ping.return_value = True
    bq.get_schools.return_value = []
    bq.get_school_by_id.return_value = None
    bq.get_teachers_by_subject.return_value = []
    bq.get_all_teachers_with_embeddings.return_value = []
    bq.batch_update_di_scores.return_value = None
    bq.save_optimization_result.return_value = None
    bq.get_cached_briefing.return_value = None
    bq.save_briefing.return_value = None
    return bq


@pytest.fixture
def mock_vertex():
    """Mock VertexClient — returns zero vectors."""
    vertex = AsyncMock()
    vertex.ping.return_value = True
    vertex.embed.return_value = [[0.1] * 768]
    return vertex


@pytest.fixture
def mock_gemini():
    """Mock GeminiClient."""
    gemini = AsyncMock()
    return gemini


@pytest.fixture
def mock_maps():
    """Mock MapsClient — returns 45km distances."""
    maps = AsyncMock()
    maps.distance_matrix.return_value = [45.0, 62.0, 28.0, 78.0, 12.0]
    return maps


@pytest.fixture
def mock_cache():
    """Mock EmbeddingsCache."""
    cache = MagicMock()
    cache.get.return_value = None
    cache.set.return_value = None
    cache.size = 0
    return cache
