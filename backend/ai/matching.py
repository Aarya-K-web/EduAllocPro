"""
EduAllocPro — Teacher-School Matching via Vertex AI Embeddings
Uses cosine similarity on textembedding-gecko@003 vectors.
Hard constraint: distance_km > 80 AND not long_dist_consent → reject.
Always check cache before calling Vertex AI.
"""
from datetime import datetime
from typing import Optional

import numpy as np
import structlog

from ai.retention import compute_retention_score
from models.deployment import DVSBreakdown, MatchListResponse, TeacherMatch
from utils.dvs_formula import compute_dvs, compute_dvs_breakdown

logger = structlog.get_logger()

# Hard commute constraint
MAX_COMMUTE_KM = 80


def build_teacher_embedding_str(teacher: dict) -> str:
    """
    Build embedding string for a teacher profile.
    Format: "{subjects} | {qualification} | {district} | {languages} | {years}yr service {rural}yr rural"
    """
    subjects = " ".join(teacher.get("subject_specialization", []) or [])
    qualification = teacher.get("qualification", "")
    district = teacher.get("current_district", "")
    languages = " ".join(teacher.get("languages_known", []) or [])
    years = teacher.get("years_of_service", 0)
    rural = teacher.get("rural_posting_years", 0)
    return f"{subjects} | {qualification} | {district} | {languages} | {years}yr service {rural}yr rural"


def build_school_need_str(school: dict, vacancy_subject: str) -> str:
    """
    Build embedding string for a school vacancy.
    Format: "{vacancy_subject} | Grade {grade_range} | Rural {rural_score} | {district}"
    """
    grade_range = school.get("grade_range", "6-10")
    rural_score = int(school.get("di_score", 50))
    district = school.get("district_name", school.get("district", ""))
    return f"{vacancy_subject} | Grade {grade_range} | Rural {rural_score} | {district}"


def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    """Compute cosine similarity between two vectors using numpy."""
    a = np.array(v1, dtype=np.float32)
    b = np.array(v2, dtype=np.float32)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


async def find_top_matches(
    school_id: str,
    vacancy_subject: str,
    bq,
    vertex,
    maps,
    cache,
    top_n: int = 5,
) -> MatchListResponse:
    """
    Find top-N teacher matches for a school vacancy.

    Pipeline:
    1. Get school from BQ
    2. Build school embedding string, get vector
    3. Pre-filter teachers by subject from BQ
    4. For each teacher: cache.get() first, only call vertex.embed() on cache miss
    5. Compute cosine similarity for all candidates
    6. Get top_n*2 candidates
    7. Apply distance matrix for commute
    8. Hard reject: distance_km > 80 AND not long_dist_consent
    9. Compute retention score for each
    10. Compute DVS via dvs_formula
    11. Return top_n results sorted by dvs_score desc
    """
    log = logger.bind(fn="find_top_matches", school_id=school_id, subject=vacancy_subject)
    log.info("matching.start")

    # 1. Get school
    school = await bq.get_school_by_id(school_id)
    if not school:
        # Use mock school for development
        school = {
            "school_id": school_id,
            "school_name": f"School {school_id}",
            "district_name": "Nandurbar",
            "district_code": "NDB01",
            "di_score": 75.0,
            "grade_range": "6-10",
        }

    school_name = school.get("school_name", school.get("name", ""))
    school_district = school.get("district_name", school.get("district", "Nandurbar"))
    di_score = float(school.get("di_score", 0))
    school_lat = school.get("lat")
    school_lng = school.get("lng")

    # 2. Build school embedding
    school_str = build_school_need_str(school, vacancy_subject)
    school_vecs = await vertex.embed([school_str])
    school_vec = school_vecs[0] if school_vecs else [0.0] * 768

    # 3. Pre-filter teachers by subject
    teachers = await bq.get_teachers_by_subject(vacancy_subject, limit=200)
    if not teachers:
        # Use mock teachers for development
        from tests.fixtures.sample_teachers import SAMPLE_TEACHERS_NDB
        teachers = [t for t in SAMPLE_TEACHERS_NDB if vacancy_subject in t.get("subject_specialization", [])]
        if not teachers:
            teachers = SAMPLE_TEACHERS_NDB[:10]

    log.info("matching.teachers_fetched", count=len(teachers))

    # 4-5. Get embeddings (cache-first)
    cache_hits = 0
    teacher_vecs = []
    texts_to_embed = []
    text_indices = []

    for i, teacher in enumerate(teachers):
        teacher_id = teacher.get("teacher_id", "")
        cached = cache.get(teacher_id)
        if cached is not None:
            teacher_vecs.append((i, cached))
            cache_hits += 1
        else:
            texts_to_embed.append(build_teacher_embedding_str(teacher))
            text_indices.append(i)

    # Batch embed cache misses
    if texts_to_embed:
        new_vecs = await vertex.embed(texts_to_embed)
        for idx, (teacher_idx, vec) in enumerate(zip(text_indices, new_vecs)):
            teacher_id = teachers[teacher_idx].get("teacher_id", "")
            cache.set(teacher_id, vec)
            teacher_vecs.append((teacher_idx, vec))

    # Sort by original index
    teacher_vecs.sort(key=lambda x: x[0])

    log.info("matching.embeddings_done", cache_hits=cache_hits, computed=len(texts_to_embed))

    # 5. Compute cosine similarity
    scored = []
    for i, teacher in enumerate(teachers):
        if i < len(teacher_vecs):
            _, vec = teacher_vecs[i]
            sim = cosine_similarity(school_vec, vec)
            scored.append((sim, teacher))

    # 6. Get top_n*2 by similarity
    scored.sort(key=lambda x: x[0], reverse=True)
    candidates = scored[: top_n * 2]

    # 7. Apply distance matrix
    candidates_rejected_distance = 0
    if school_lat and school_lng and maps:
        origins = []
        for _, teacher in candidates:
            t_lat = teacher.get("lat")
            t_lng = teacher.get("lng")
            if t_lat and t_lng:
                origins.append((t_lat, t_lng))
            else:
                origins.append((school_lat + 0.1, school_lng + 0.1))  # fallback

        distances = await maps.distance_matrix(origins, (school_lat, school_lng))
    else:
        distances = [45.0] * len(candidates)  # Default fallback

    # 8. Hard reject by distance + consent
    valid_candidates = []
    for (sim, teacher), dist_km in zip(candidates, distances):
        long_dist_consent = teacher.get("long_dist_consent", False)
        if dist_km > MAX_COMMUTE_KM and not long_dist_consent:
            candidates_rejected_distance += 1
            continue
        valid_candidates.append((sim, teacher, dist_km))

    # 9-10. Compute retention + DVS for valid candidates
    matches = []
    for rank, (sim, teacher, dist_km) in enumerate(valid_candidates[:top_n], start=1):
        retention_result = compute_retention_score(teacher, school_district, dist_km)
        retention_score = retention_result["retention_score"]
        risk_flag = retention_result["risk_flag"]

        match_score = sim * 100.0
        dvs_breakdown = compute_dvs_breakdown(di_score, match_score, retention_score)

        retention_warning = None
        if risk_flag == "HIGH_RISK":
            retention_warning = "High retention risk — consider hardship allowance"
        elif risk_flag == "MEDIUM_RISK":
            retention_warning = "Medium retention risk — BEO welfare visit recommended"

        commute_minutes = int(dist_km / 40 * 60) if dist_km < 999 else None

        match = TeacherMatch(
            rank=rank,
            teacher_id=teacher.get("teacher_id", ""),
            name=teacher.get("teacher_name", teacher.get("name", "")),
            qualification=teacher.get("qualification", ""),
            subjects=teacher.get("subject_specialization", []),
            current_district=teacher.get("current_district", ""),
            home_district=teacher.get("home_district", ""),
            match_score=round(match_score, 1),
            commute_minutes=commute_minutes,
            distance_km=round(dist_km, 1) if dist_km < 999 else None,
            retention_score=round(retention_score, 1),
            retention_risk=risk_flag,
            dvs_score=round(dvs_breakdown["dvs_score"], 4),
            dvs_breakdown=DVSBreakdown(
                di_component=dvs_breakdown["di_component"],
                match_component=dvs_breakdown["match_component"],
                retention_component=dvs_breakdown["retention_component"],
            ),
            is_within_80km=dist_km <= MAX_COMMUTE_KM,
            retention_warning=retention_warning,
            is_synthetic=teacher.get("is_synthetic", True),
        )
        matches.append(match)

    # Sort by DVS score descending
    matches.sort(key=lambda m: m.dvs_score, reverse=True)
    for i, m in enumerate(matches):
        m.rank = i + 1

    log.info(
        "matching.done",
        matches=len(matches),
        rejected_distance=candidates_rejected_distance,
        cache_used=cache_hits > 0,
    )

    return MatchListResponse(
        school_id=school_id,
        school_name=school_name,
        vacancy_subject=vacancy_subject,
        school_di_score=di_score,
        matches=matches,
        total_candidates_evaluated=len(teachers),
        candidates_rejected_distance=candidates_rejected_distance,
        cache_used=cache_hits > 0,
        computed_at=datetime.utcnow(),
    )
