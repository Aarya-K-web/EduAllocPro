"""
EduAllocPro — Deprivation Index AI Pipeline
Wraps di_formula.py with BigQuery I/O.
Pure scoring functions live in utils/di_formula.py.
"""
from typing import Optional

import structlog

from utils.di_formula import UDISESchoolData, compute_deprivation_index

logger = structlog.get_logger()

# Subject inference by grade range
_GRADE_SUBJECT_MAP = {
    "1-5":  ["Marathi", "Mathematics", "English", "EVS"],
    "6-8":  ["Marathi", "Mathematics", "English", "Science", "Social Studies", "Hindi"],
    "9-10": ["Mathematics", "Science", "English", "Social Studies", "Hindi", "Marathi"],
    "11-12": ["Physics", "Chemistry", "Biology", "Mathematics", "English"],
}


def _infer_required_subjects(grade_range: str) -> list[str]:
    """Infer required subjects from grade range string."""
    for key, subjects in _GRADE_SUBJECT_MAP.items():
        if key in grade_range:
            return subjects
    return ["Mathematics", "Science", "English"]


async def compute_di_for_district(bq, district_id: str) -> int:
    """
    Compute DI scores for all schools in a district.
    Writes results back to BigQuery via bq.batch_update_di_scores().
    Returns count of schools processed.
    """
    log = logger.bind(fn="compute_di_for_district", district_id=district_id)
    log.info("di.compute.start")

    rows = await bq.get_raw_school_data(district_id)
    log.info("di.compute.fetched", count=len(rows))

    updates = []
    for row in rows:
        school = UDISESchoolData(
            school_id=str(row.get("school_id", "")),
            stu_tea_ratio=row.get("stu_tea_ratio"),
            num_subject_vacancies=int(row.get("total_vacancies", 0)),
            num_required_subjects=max(1, int(row.get("required_subjects_count", 1))),
            toilet_boys=bool(row.get("toilet_boys", False)),
            toilet_girls=bool(row.get("toilet_girls", False)),
            has_electricity=bool(row.get("has_electricity", False)),
            num_classrooms=max(1, int(row.get("num_classrooms", 1))),
            enrollment_total=int(row.get("enrollment_total", 0)),
            nearest_town_km=row.get("nearest_town_km"),
            enrollment_3yr_ago=row.get("enrollment_3yr_ago"),
            district_aser_pct=row.get("district_aser_pct"),
        )

        result = compute_deprivation_index(school)
        result["school_id"] = school.school_id
        updates.append(result)

    if updates:
        await bq.batch_update_di_scores(updates)

    log.info("di.compute.done", count=len(updates))
    return len(updates)
