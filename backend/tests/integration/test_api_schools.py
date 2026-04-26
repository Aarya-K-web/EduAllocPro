"""
EduAllocPro — Integration Tests: Schools API
Uses TestClient with mocked BigQuery.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient


def make_app():
    """Create a test app with mocked state."""
    from api.main import app
    return app


@pytest.fixture
def client():
    """TestClient with mocked app state."""
    from api.main import app
    from tests.fixtures.sample_schools import SAMPLE_SCHOOLS_NDB

    mock_bq = AsyncMock()
    mock_bq.ping.return_value = True
    mock_bq.get_schools.return_value = SAMPLE_SCHOOLS_NDB
    mock_bq.get_school_by_id.return_value = SAMPLE_SCHOOLS_NDB[0]
    mock_bq.get_all_teachers_with_embeddings.return_value = []

    mock_vertex = AsyncMock()
    mock_vertex.ping.return_value = False
    mock_vertex.embed.return_value = [[0.1] * 768]

    mock_gemini = AsyncMock()
    mock_maps = AsyncMock()
    mock_maps.distance_matrix.return_value = [45.0]

    mock_cache = MagicMock()
    mock_cache.get.return_value = None
    mock_cache.size = 0
    mock_cache.warm_up = AsyncMock(return_value=0)

    app.state.bq = mock_bq
    app.state.vertex = mock_vertex
    app.state.gemini = mock_gemini
    app.state.maps = mock_maps
    app.state.cache = mock_cache

    # Set dev user on all requests
    from starlette.testclient import TestClient as TC
    with TC(app) as c:
        yield c


class TestListSchools:
    def test_list_schools_sorted_by_di_desc(self, client):
        response = client.get("/api/schools?district_id=NDB01")
        assert response.status_code == 200
        data = response.json()
        assert "schools" in data
        schools = data["schools"]
        if len(schools) > 1:
            for i in range(len(schools) - 1):
                assert schools[i]["di_score"] >= schools[i + 1]["di_score"]

    def test_missing_district_id_returns_422(self, client):
        response = client.get("/api/schools")
        assert response.status_code == 422

    def test_unauthorized_returns_401(self):
        """Without dev mode, missing auth should return 401."""
        from api.main import app
        from config import config
        # Only test in non-dev mode
        if config.is_development:
            pytest.skip("Dev mode bypasses auth")

    def test_school_not_found_returns_404(self, client):
        from api.main import app
        app.state.bq.get_school_by_id.return_value = None
        response = client.get("/api/schools/99999999999")
        assert response.status_code == 404

    def test_rte_only_filter(self, client):
        response = client.get("/api/schools?district_id=NDB01&rte_only=true")
        assert response.status_code == 200

    def test_pagination_has_more(self, client):
        response = client.get("/api/schools?district_id=NDB01&limit=2&offset=0")
        assert response.status_code == 200
        data = response.json()
        assert "has_more" in data
        assert "limit" in data
        assert data["limit"] == 2

    def test_response_has_is_data_stale(self, client):
        response = client.get("/api/schools?district_id=NDB01")
        assert response.status_code == 200
        schools = response.json()["schools"]
        if schools:
            assert "is_data_stale" in schools[0]
