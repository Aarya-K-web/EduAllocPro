"""
EduAllocPro — Deprivation Index AI Pipeline
Wraps di_formula.py with BigQuery I/O.
Pure scoring functions live in utils/di_formula.py.
"""
from typing import Optional

import structlog

from utils.di_formula import UDISESchoolData, compute_deprivation_index

logger = structlog.get_logger()

async def compute_di_for_district(bq, district_id: str) -> int:
    """
    Compute DI scores for all schools in a district (Task 3).
    Uses pagination (200 at a time) and immediate batch updates.
    """
    log = logger.bind(fn="compute_di_for_district", district_id=district_id)
    log.info("di.compute.start")

    batch_size = 200
    offset = 0
    total_processed = 0
    
    # Summary stats
    scored_count = 0
    null_count = 0
    critical_count = 0
    high_count = 0
    sum_di = 0.0

    while True:
        # Task 3.1: Pagination
        rows = await bq.get_raw_school_data(district_id, limit=batch_size, offset=offset)
        if not rows:
            break
            
        updates = []
        for row in rows:
            school = UDISESchoolData(
                school_id=str(row.get("school_id") or ""),
                stu_tea_ratio=row.get("stu_tea_ratio"),
                num_subject_vacancies=int(row.get("total_vacancies") or 0),
                num_required_subjects=max(1, int(row.get("required_subjects_count") or 1)),
                toilet_boys=bool(row.get("toilet_boys") or False),
                toilet_girls=bool(row.get("toilet_girls") or False),
                has_electricity=bool(row.get("has_electricity") or False),
                num_classrooms=max(1, int(row.get("num_classrooms") or 1)),
                enrollment_total=int(row.get("enrollment_total") or 0),
                nearest_town_km=row.get("nearest_town_km"),
                enrollment_3yr_ago=row.get("enrollment_3yr_ago"),
                district_aser_pct=row.get("district_aser_pct"),
            )

            result = compute_deprivation_index(school)
            result["school_id"] = school.school_id
            updates.append(result)
            
            # Update summary stats
            if result.get("composite_di") is not None:
                scored_count += 1
                sum_di += result["composite_di"]
                if result["composite_di"] >= 80:
                    critical_count += 1
                elif result["composite_di"] >= 60:
                    high_count += 1
            else:
                null_count += 1

        # Task 3.2: Immediate batch update
        if updates:
            await bq.batch_update_di_scores(updates)
            total_processed += len(updates)
            
        # Task 3.3: Progress log
        log.info("di.batch.done", 
                 batch=offset // batch_size + 1, 
                 total_batched=total_processed, 
                 district=district_id)
        
        offset += batch_size

    # Task 3.4: District summary log
    avg_di = (sum_di / scored_count) if scored_count > 0 else 0
    log.info("di.district.summary", 
             district=district_id,
             total_schools=total_processed,
             scored=scored_count, 
             null_quality=null_count,
             avg_di=round(avg_di, 1),
             critical_count=critical_count,
             high_count=high_count)

    return total_processed
