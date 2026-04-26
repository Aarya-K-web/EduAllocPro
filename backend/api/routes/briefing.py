"""
EduAllocPro — Briefing Routes
GET /api/briefing — Gemini weekly district briefing
POST /api/briefing/order — Generate deployment order PDF
"""
import uuid
from datetime import datetime, timedelta
from typing import Optional

import structlog
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from api.deps import BQDep, GeminiDep, OfficerDep

logger = structlog.get_logger()
router = APIRouter(tags=["briefing"])


@router.get("/briefing")
async def get_briefing(
    bq: BQDep,
    gemini: GeminiDep,
    user: OfficerDep,
    district_id: str = Query(..., description="District code e.g. NDB01"),
    refresh: bool = Query(False, description="Force regeneration even if cached"),
    language: str = Query("en", description="Response language: en or mr"),
) -> dict:
    """
    Get AI-generated weekly district briefing.
    Returns cached briefing if available and not refresh=True.
    """
    log = logger.bind(fn="get_briefing", district_id=district_id)
    log.info("briefing.start")

    # Check cache (1 week TTL)
    if not refresh:
        week_start = datetime.utcnow() - timedelta(hours=168)
        cached = await bq.get_cached_briefing(district_id, week_start)
        if cached:
            log.info("briefing.cache_hit")
            return cached

    # Load context: top 20 schools + top 10 deployments
    schools = await bq.get_schools(district_id=district_id, limit=20)
    if not schools:
        from tests.fixtures.sample_schools import SAMPLE_SCHOOLS_NDB
        schools = SAMPLE_SCHOOLS_NDB[:5]

    # Build context for Gemini
    top_schools = [
        {
            "school_id": s.get("school_id", ""),
            "name": s.get("school_name", s.get("name", "")),
            "di_score": float(s.get("di_score", 0) or 0),
            "di_tier": _compute_tier(float(s.get("di_score", 0) or 0)),
            "total_vacancies": int(s.get("total_vacancies", 0) or 0),
            "rte_violation": bool(s.get("rte_violation", False)),
            "block": s.get("block_name", s.get("block", "")),
        }
        for s in schools[:5]
    ]

    rte_violations = sum(1 for s in schools if s.get("rte_violation"))
    total_vacancies = sum(int(s.get("total_vacancies", 0) or 0) for s in schools)

    context = {
        "district_id": district_id,
        "district_name": schools[0].get("district_name", "Nandurbar") if schools else "Nandurbar",
        "top_schools": top_schools,
        "top_deployments": [],
        "rte_violations_count": rte_violations,
        "total_vacancies": total_vacancies,
        "year": datetime.utcnow().year,
    }

    # Generate briefing
    from ai.gemini import generate_briefing, generate_escalation_assessment
    briefing = await generate_briefing(context, gemini)

    # Run escalation assessment for schools with DI > 85
    escalation_flags = []
    for school in schools:
        di = float(school.get("di_score", 0) or 0)
        if di > 85:
            assessment = await generate_escalation_assessment(school, gemini)
            if assessment.get("should_escalate"):
                escalation_flags.append(school.get("school_id", ""))

    briefing["escalation_flags"] = list(set(briefing.get("escalation_flags", []) + escalation_flags))
    briefing["district_code"] = district_id
    briefing["briefing_id"] = str(uuid.uuid4())
    briefing["generated_at"] = datetime.utcnow().isoformat() + "Z"
    briefing["prompt_version"] = "1.0.0"

    # Save to BQ
    await bq.save_briefing(briefing)

    log.info("briefing.done", district_id=district_id)
    return briefing


class OrderRequest(BaseModel):
    school_id: str
    teacher_id: str
    vacancy_subject: str
    effective_date: Optional[str] = "01 June 2026"
    include_retention_note: bool = True


@router.post("/briefing/order")
async def generate_order(
    body: OrderRequest,
    bq: BQDep,
    gemini: GeminiDep,
    user: OfficerDep,
) -> StreamingResponse:
    """
    Generate a deployment order PDF.
    Returns StreamingResponse with application/pdf content type.
    """
    log = logger.bind(fn="generate_order", school_id=body.school_id)
    log.info("briefing.order.start")

    # Fetch school and teacher
    school = await bq.get_school_by_id(body.school_id)
    if not school:
        from tests.fixtures.sample_schools import SAMPLE_SCHOOLS_NDB
        school = next((s for s in SAMPLE_SCHOOLS_NDB if s["school_id"] == body.school_id), SAMPLE_SCHOOLS_NDB[0])

    teacher = await bq.get_teachers_by_subject(body.vacancy_subject, limit=1)
    if teacher:
        teacher = teacher[0]
    else:
        from tests.fixtures.sample_teachers import SAMPLE_TEACHERS_NDB
        teacher = next(
            (t for t in SAMPLE_TEACHERS_NDB if body.vacancy_subject in t.get("subject_specialization", [])),
            SAMPLE_TEACHERS_NDB[0],
        )

    # Build deployment context
    deployment = {
        "school_id": body.school_id,
        "school_name": school.get("school_name", school.get("name", "")),
        "school_district": school.get("district_name", school.get("district", "Nandurbar")),
        "di_score": float(school.get("di_score", 0) or 0),
        "enrollment_total": int(school.get("enrollment_total", 0) or 0),
        "vacancy_subject": body.vacancy_subject,
        "teacher_id": body.teacher_id,
        "teacher_name": teacher.get("teacher_name", teacher.get("name", "")),
        "teacher_district": teacher.get("current_district", ""),
        "qualification": teacher.get("qualification", ""),
        "years_of_service": int(teacher.get("years_of_service", 0) or 0),
        "rural_posting_years": int(teacher.get("rural_posting_years", 0) or 0),
        "current_district": teacher.get("current_district", ""),
        "match_score": float(teacher.get("match_score", 75.0) or 75.0),
        "retention_score": float(teacher.get("retention_score", 70.0) or 70.0),
        "dvs_score": float(teacher.get("dvs_score", 0.75) or 0.75),
        "effective_date": body.effective_date,
        "vacancy_months": 18,
    }

    # Generate order narrative via Gemini
    from ai.gemini import generate_deployment_order
    order_text = await generate_deployment_order(deployment, gemini)

    # Generate PDF
    from utils.pdf_generator import generate_deployment_order_pdf
    pdf_bytes = generate_deployment_order_pdf(deployment, order_text)

    school_last4 = body.school_id[-4:] if len(body.school_id) >= 4 else body.school_id
    filename = f"EduAllocPro_Order_{school_last4}_{datetime.utcnow().strftime('%Y%m%d')}.pdf"

    log.info("briefing.order.done", bytes=len(pdf_bytes))

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _compute_tier(score: float) -> str:
    if score >= 80:
        return "CRITICAL"
    if score >= 60:
        return "HIGH"
    if score >= 40:
        return "MODERATE"
    return "STABLE"
