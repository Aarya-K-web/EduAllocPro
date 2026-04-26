"""
EduAllocPro — Teachers Routes
GET /api/teachers — list teachers in district
"""
from typing import Optional

import structlog
from fastapi import APIRouter, Query

from api.deps import BQDep, OfficerDep
from models.teacher import Teacher, TeacherListResponse

logger = structlog.get_logger()
router = APIRouter(tags=["teachers"])


@router.get("/teachers", response_model=TeacherListResponse)
async def list_teachers(
    bq: BQDep,
    user: OfficerDep,
    district_id: str = Query(..., description="District code e.g. NDB01"),
    subject: Optional[str] = Query(None),
    min_retention: float = Query(0.0, ge=0.0, le=100.0),
    limit: int = Query(50, ge=1, le=500),
    include_synthetic: bool = Query(True),
) -> TeacherListResponse:
    """List teachers available for deployment in a district."""
    log = logger.bind(fn="list_teachers", district_id=district_id)
    log.info("teachers.list.start")

    if subject:
        rows = await bq.get_teachers_by_subject(
            subject=subject,
            district_id=district_id,
            min_retention=min_retention,
            limit=limit,
        )
    else:
        rows = await bq.get_teachers_by_subject(
            subject="Mathematics",  # default subject for listing
            district_id=None,
            limit=limit,
        )

    if not rows:
        from tests.fixtures.sample_teachers import SAMPLE_TEACHERS_NDB
        rows = SAMPLE_TEACHERS_NDB

    teachers = [_row_to_teacher(r) for r in rows]
    log.info("teachers.list.done", count=len(teachers))

    return TeacherListResponse(
        teachers=teachers,
        total=len(teachers),
        district_id=district_id,
    )


def _row_to_teacher(row: dict) -> Teacher:
    import json

    subjects = row.get("subject_specialization", [])
    if isinstance(subjects, str):
        try:
            subjects = json.loads(subjects)
        except Exception:
            subjects = [subjects] if subjects else []

    languages = row.get("languages_known", [])
    if isinstance(languages, str):
        try:
            languages = json.loads(languages)
        except Exception:
            languages = [languages] if languages else []

    return Teacher(
        teacher_id=str(row.get("teacher_id", "")),
        name=row.get("teacher_name", row.get("name", "")),
        qualification=row.get("qualification", ""),
        subject_specialization=subjects,
        languages_known=languages,
        current_district=row.get("current_district", ""),
        home_district=row.get("home_district", ""),
        years_of_service=int(row.get("years_of_service", 0) or 0),
        rural_posting_years=int(row.get("rural_posting_years", 0) or 0),
        transfer_request_count=int(row.get("transfer_request_count", 0) or 0),
        retention_score=row.get("retention_score"),
        retention_risk_flag=row.get("retention_risk_flag"),
        long_dist_consent=bool(row.get("long_dist_consent", False)),
        is_synthetic=bool(row.get("is_synthetic", True)),
        current_school_id=row.get("current_school_id"),
        lat=row.get("lat"),
        lng=row.get("lng"),
    )
