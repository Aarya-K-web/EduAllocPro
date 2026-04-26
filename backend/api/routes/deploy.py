"""
EduAllocPro — Deployment Routes
GET /api/deploy/matches — teacher matches for a vacancy
POST /api/deploy/optimize — OR-Tools district optimizer
"""
from typing import Optional

import structlog
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from api.deps import BQDep, CacheDep, CollectorDep, MapsDep, OfficerDep, VertexDep
from models.deployment import MatchListResponse, OptimizationResult

logger = structlog.get_logger()
router = APIRouter(tags=["deployment"])


@router.get("/deploy/matches", response_model=MatchListResponse)
async def get_teacher_matches(
    bq: BQDep,
    vertex: VertexDep,
    maps: MapsDep,
    cache: CacheDep,
    user: OfficerDep,
    school_id: str = Query(..., description="UDISE school code (STRING)"),
    vacancy_subject: str = Query(..., description="Subject for the vacancy"),
    top_n: int = Query(5, ge=1, le=10),
) -> MatchListResponse:
    """Find top-N teacher matches for a school vacancy using DVS algorithm."""
    log = logger.bind(fn="get_teacher_matches", school_id=school_id, subject=vacancy_subject)
    log.info("deploy.matches.start")

    from ai.matching import find_top_matches
    result = await find_top_matches(
        school_id=school_id,
        vacancy_subject=vacancy_subject,
        bq=bq,
        vertex=vertex,
        maps=maps,
        cache=cache,
        top_n=top_n,
    )

    log.info("deploy.matches.done", matches=len(result.matches))
    return result


class OptimizeRequest(BaseModel):
    district_id: str = Field(..., description="District code e.g. NDB01")
    max_time_seconds: int = Field(20, ge=5, le=30)
    priority_subjects: Optional[list[str]] = None
    dry_run: bool = False


@router.post("/deploy/optimize", response_model=OptimizationResult)
async def optimize_district(
    body: OptimizeRequest,
    bq: BQDep,
    user: CollectorDep,
) -> OptimizationResult:
    """
    Run OR-Tools CP-SAT optimizer for district-wide teacher deployment.
    Returns HTTP 200 for OPTIMAL, FEASIBLE, and NO_SOLUTION — never 4xx/5xx for timeout.
    """
    log = logger.bind(fn="optimize_district", district_id=body.district_id)
    log.info("deploy.optimize.start")

    # Load schools with vacancies
    schools = await bq.get_schools(
        district_id=body.district_id,
        vacancies_only=True,
        limit=500,
    )
    if not schools:
        from tests.fixtures.sample_schools import SAMPLE_SCHOOLS_NDB
        schools = [s for s in SAMPLE_SCHOOLS_NDB if s.get("total_vacancies", 0) > 0]

    # Load teachers
    teachers = await bq.get_teachers_by_subject("Mathematics", limit=300)
    if not teachers:
        from tests.fixtures.sample_teachers import SAMPLE_TEACHERS_NDB
        teachers = SAMPLE_TEACHERS_NDB

    from ai.optimizer import optimize_district_deployment
    result = optimize_district_deployment(
        schools=schools,
        teachers=teachers,
        max_time_seconds=body.max_time_seconds,
    )

    # Save to BQ unless dry run
    if not body.dry_run and result.assignments:
        await bq.save_optimization_result(result, body.district_id)

    log.info(
        "deploy.optimize.done",
        status=result.status,
        filled=result.vacancies_filled,
        total=result.vacancies_total,
        solver_time_s=result.solver_time_s,
    )
    return result
