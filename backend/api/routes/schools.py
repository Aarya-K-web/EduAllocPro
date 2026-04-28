"""
EduAllocPro — Schools Routes
GET /api/schools — list schools by district, sorted by DI
GET /api/schools/{school_id} — full school detail
"""
from typing import Optional

import structlog
from fastapi import APIRouter, HTTPException, Query

from api.deps import BQDep, OfficerDep
from models.errors import DataNotFoundError
from models.school import (
    DIBreakdown,
    SchoolDetail,
    SchoolDetailResponse,
    SchoolListResponse,
    SchoolSummary,
)

logger = structlog.get_logger()
router = APIRouter(tags=["schools"])


@router.get("/schools", response_model=SchoolListResponse)
async def list_schools(
    bq: BQDep,
    user: OfficerDep,
    district_id: str = Query(..., description="District code e.g. NDB01"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    min_di: float = Query(0.0, ge=0.0, le=100.0),
    rte_only: bool = Query(False),
    vacancies_only: bool = Query(False),
    block_code: Optional[str] = Query(None),
) -> SchoolListResponse:
    """List schools for a district, sorted by DI score descending."""
    log = logger.bind(fn="list_schools", district_id=district_id)
    log.info("schools.list.start")

    rows = await bq.get_schools(
        district_id=district_id,
        min_di=min_di,
        rte_only=rte_only,
        vacancies_only=vacancies_only,
        block_code=block_code,
        limit=limit,
        offset=offset,
    )

    # Get district stats for the header summary (Task 5.2)
    stats_row = await bq.get_district_stats(district_id)
    from models.school import DistrictStats
    district_stats = DistrictStats(**stats_row) if stats_row else None

    # If BQ returns nothing, use mock data
    if not rows:
        from tests.fixtures.sample_schools import SAMPLE_SCHOOLS_NDB
        rows = SAMPLE_SCHOOLS_NDB

    schools = [_row_to_summary(r) for r in rows]

    log.info("schools.list.done", count=len(schools))

    return SchoolListResponse(
        schools=schools,
        total=len(schools),
        limit=limit,
        offset=offset,
        has_more=len(schools) == limit,
        district_id=district_id,
        filters_applied={
            "min_di": min_di,
            "rte_only": rte_only,
            "vacancies_only": vacancies_only,
            "block_code": block_code,
        },
        district_stats=district_stats,
    )


@router.get("/schools/{school_id}", response_model=SchoolDetailResponse)
async def get_school(
    school_id: str,
    bq: BQDep,
    user: OfficerDep,
) -> SchoolDetailResponse:
    """Get full school detail by UDISE code."""
    log = logger.bind(fn="get_school", school_id=school_id)
    log.info("schools.detail.start")

    row = await bq.get_school_by_id(school_id)

    if not row:
        # Try mock data
        from tests.fixtures.sample_schools import SAMPLE_SCHOOLS_NDB
        row = next((s for s in SAMPLE_SCHOOLS_NDB if s["school_id"] == school_id), None)

    if not row:
        raise DataNotFoundError("School", school_id)

    school = _row_to_detail(row)
    log.info("schools.detail.done")
    return SchoolDetailResponse(school=school)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _row_to_summary(row: dict) -> SchoolSummary:
    """Convert a BQ row dict to SchoolSummary."""
    import json

    vacancies = row.get("vacancy_subjects", [])
    if isinstance(vacancies, str):
        try:
            vacancies = json.loads(vacancies)
        except Exception:
            vacancies = [vacancies] if vacancies else []

    return SchoolSummary(
        school_id=str(row.get("school_id", "")),
        name=row.get("school_name", row.get("name", "")),
        district=row.get("district_name", row.get("district", "")),
        block=row.get("block_name", row.get("block", "")),
        lat=row.get("lat"),
        lng=row.get("lng"),
        di_score=float(row.get("di_score", 0) or 0),
        di_tier=_compute_tier(float(row.get("di_score", 0) or 0)),
        rte_violation=bool(row.get("rte_violation", False)),
        vacancies=vacancies if isinstance(vacancies, list) else [],
        data_updated_at=row.get("data_updated_at"),
        is_data_stale=bool(row.get("is_data_stale", True)),
        deployment_status=row.get("deployment_status", "unassigned"),
    )


def _row_to_detail(row: dict) -> SchoolDetail:
    """Convert a BQ row dict to SchoolDetail."""
    import json

    summary = _row_to_summary(row)

    # Parse DI breakdown
    di_breakdown = None
    breakdown_raw = row.get("di_breakdown_json")
    if breakdown_raw:
        try:
            bd = json.loads(breakdown_raw) if isinstance(breakdown_raw, str) else breakdown_raw
            di_breakdown = DIBreakdown(
                stu_tea_ratio_score=bd.get("stu_tea_ratio_score", 0),
                subject_vacancy_score=bd.get("subject_vacancy_score", 0),
                toilet_score=bd.get("toilet_score", 0),
                electricity_score=bd.get("electricity_score", 0),
                classroom_ratio_score=bd.get("classroom_ratio_score", 0),
                urban_distance_score=bd.get("urban_distance_score", 0),
                enrollment_trend_score=bd.get("enrollment_trend_score", 0),
                aser_proxy_score=bd.get("aser_proxy_score", 0),
                composite_di=float(row.get("di_score", 0) or 0),
            )
        except Exception:
            pass

    # Parse enrollment trend
    trend_raw = row.get("enrollment_trend_json", "[]")
    try:
        trend_list = json.loads(trend_raw) if isinstance(trend_raw, str) else (trend_raw or [])
    except Exception:
        trend_list = []

    # Parse vacancies detail
    vacancies_raw = row.get("vacancy_subjects", "[]")
    try:
        vacancies_detail = json.loads(vacancies_raw) if isinstance(vacancies_raw, str) else (vacancies_raw or [])
        if not isinstance(vacancies_detail, list):
            vacancies_detail = []
    except Exception:
        vacancies_detail = []

    required_subjects_raw = row.get("required_subjects", "[]")
    try:
        required_subjects = json.loads(required_subjects_raw) if isinstance(required_subjects_raw, str) else (required_subjects_raw or [])
    except Exception:
        required_subjects = []

    return SchoolDetail(
        **summary.model_dump(),
        di_breakdown=di_breakdown,
        enrollment_boys=row.get("enrollment_boys"),
        enrollment_girls=row.get("enrollment_girls"),
        enrollment_total=row.get("enrollment_total"),
        enrollment_trend_list=trend_list,
        stu_tea_ratio=row.get("stu_tea_ratio"),
        num_classrooms=row.get("num_classrooms"),
        toilet_boys=bool(row.get("toilet_boys", False)),
        toilet_girls=bool(row.get("toilet_girls", False)),
        electricity=bool(row.get("has_electricity", False)),
        nearest_town_km=row.get("nearest_town_km"),
        vacancies_detail=vacancies_detail,
        required_subjects=required_subjects,
        rte_teachers_needed=int(row.get("rte_teachers_needed", 0) or 0),
        di_data_quality=row.get("di_data_quality", "OK"),
        satellite_verified=bool(row.get("satellite_verified", False)),
        medium=row.get("medium"),
        category=row.get("category"),
        management=row.get("management"),
        cluster=row.get("cluster_name", row.get("cluster")),
    )


def _compute_tier(score: float) -> str:
    if score >= 80:
        return "critical"
    if score >= 60:
        return "high"
    if score >= 40:
        return "moderate"
    return "stable"
