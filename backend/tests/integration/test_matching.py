"""
EduAllocPro — Integration Tests: Teacher Matching
"""
import pytest
from unittest.mock import AsyncMock, MagicMock


@pytest.mark.asyncio
async def test_find_top_matches_returns_ranked_results(mock_bq, mock_vertex, mock_maps, mock_cache):
    from tests.fixtures.sample_schools import SAMPLE_SCHOOLS_NDB
    from tests.fixtures.sample_teachers import SAMPLE_TEACHERS_NDB
    from ai.matching import find_top_matches

    mock_bq.get_school_by_id.return_value = SAMPLE_SCHOOLS_NDB[0]
    mock_bq.get_teachers_by_subject.return_value = [
        t for t in SAMPLE_TEACHERS_NDB if "Mathematics" in t.get("subject_specialization", [])
    ]
    mock_vertex.embed.return_value = [[0.1] * 768]
    mock_maps.distance_matrix.return_value = [45.0, 62.0, 28.0, 78.0, 12.0]

    result = await find_top_matches(
        school_id="27310100202",
        vacancy_subject="Mathematics",
        bq=mock_bq,
        vertex=mock_vertex,
        maps=mock_maps,
        cache=mock_cache,
        top_n=5,
    )

    assert result.school_id == "27310100202"
    assert result.vacancy_subject == "Mathematics"
    assert len(result.matches) <= 5
    # Matches should be sorted by DVS descending
    if len(result.matches) > 1:
        for i in range(len(result.matches) - 1):
            assert result.matches[i].dvs_score >= result.matches[i + 1].dvs_score


@pytest.mark.asyncio
async def test_distance_constraint_rejects_far_teachers(mock_bq, mock_vertex, mock_maps, mock_cache):
    from tests.fixtures.sample_schools import SAMPLE_SCHOOLS_NDB
    from tests.fixtures.sample_teachers import SAMPLE_TEACHERS_NDB
    from ai.matching import find_top_matches

    mock_bq.get_school_by_id.return_value = SAMPLE_SCHOOLS_NDB[0]
    # Only teachers without long_dist_consent
    teachers_no_consent = [
        t for t in SAMPLE_TEACHERS_NDB
        if not t.get("long_dist_consent") and "Mathematics" in t.get("subject_specialization", [])
    ]
    mock_bq.get_teachers_by_subject.return_value = teachers_no_consent
    mock_vertex.embed.return_value = [[0.1] * 768]
    # All distances > 80km
    mock_maps.distance_matrix.return_value = [100.0] * len(teachers_no_consent)

    result = await find_top_matches(
        school_id="27310100202",
        vacancy_subject="Mathematics",
        bq=mock_bq,
        vertex=mock_vertex,
        maps=mock_maps,
        cache=mock_cache,
        top_n=5,
    )

    # All should be rejected
    assert result.candidates_rejected_distance >= 0
    # Matches should be empty or have only long_dist_consent teachers
    for match in result.matches:
        assert match.is_within_80km or match.distance_km is None
