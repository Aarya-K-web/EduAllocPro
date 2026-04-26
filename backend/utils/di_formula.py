"""
EduAllocPro — Deprivation Index Formula
Pure functions — zero I/O, zero side effects.
All 8 signal scoring functions + composite DI computation.
"""
from dataclasses import dataclass, field
from typing import Optional

# ── DI Signal Weights ────────────────────────────────────────────────────────
DI_WEIGHTS: dict[str, float] = {
    "stu_tea_ratio":    0.25,
    "subject_vacancy":  0.20,
    "toilet":           0.15,
    "electricity":      0.10,
    "classroom_ratio":  0.10,
    "urban_distance":   0.08,
    "enrollment_trend": 0.07,
    "aser_proxy":       0.05,
}
# Invariant — must always hold
assert abs(sum(DI_WEIGHTS.values()) - 1.0) < 1e-9, "DI_WEIGHTS must sum to 1.0"


@dataclass
class UDISESchoolData:
    """All UDISE fields needed for DI computation."""

    school_id: str
    stu_tea_ratio: Optional[float] = None       # students per teacher
    num_subject_vacancies: int = 0              # unfilled subject posts
    num_required_subjects: int = 1              # total required subject posts
    toilet_boys: bool = False
    toilet_girls: bool = False
    has_electricity: bool = False
    num_classrooms: int = 1
    enrollment_total: int = 0
    nearest_town_km: Optional[float] = None    # km to nearest urban centre
    enrollment_3yr_ago: Optional[int] = None   # for trend calculation
    district_aser_pct: Optional[float] = None  # % students reading Grade 2 text


# ── Individual Signal Scorers ────────────────────────────────────────────────

def score_stu_tea_ratio(ratio: float) -> float:
    """
    Score student-teacher ratio.
    STR 20 → 0 (ideal), STR 80+ → 100 (worst).
    Formula: min(100, (ratio - 20) / 0.60)
    """
    if ratio is None:
        return 50.0  # neutral default for missing data
    return min(100.0, max(0.0, (ratio - 20.0) / 0.60))


def score_subject_vacancy(vacancies: int, required: int) -> float:
    """
    Score subject vacancy rate.
    0 vacancies → 0 (ideal), all vacant → 100 (worst).
    """
    if required <= 0:
        return 0.0
    return min(100.0, max(0.0, (vacancies / required) * 100.0))


def score_toilet(boys: bool, girls: bool) -> float:
    """
    Score toilet availability.
    Both present → 0, one present → 50, neither → 100.
    """
    if boys and girls:
        return 0.0
    if boys or girls:
        return 50.0
    return 100.0


def score_electricity(has_electricity: bool) -> float:
    """
    Score electricity availability.
    Electrified → 0, no electricity → 100.
    """
    return 0.0 if has_electricity else 100.0


def score_classroom_ratio(classrooms: int, enrollment: int) -> float:
    """
    Score classroom-to-student ratio.
    Good ratio (≥1 room per 30 students) → 0, overcrowded → 100.
    """
    if classrooms <= 0 or enrollment <= 0:
        return 50.0
    students_per_room = enrollment / classrooms
    # Ideal: 30 students/room → score 0; 60+ students/room → score 100
    return min(100.0, max(0.0, (students_per_room - 30.0) / 0.30))


def score_urban_distance(km: Optional[float]) -> float:
    """
    Score distance from nearest urban centre.
    None → 50.0 (neutral), 0 km → 0, 50+ km → 100.
    """
    if km is None:
        return 50.0
    return min(100.0, max(0.0, km * 2.0))


def score_enrollment_trend(current: int, three_yr_ago: Optional[int]) -> float:
    """
    Score enrollment trend.
    None or growing → 0, declining 20%+ → 100.
    """
    if three_yr_ago is None or three_yr_ago <= 0:
        return 0.0
    change_pct = (current - three_yr_ago) / three_yr_ago * 100.0
    if change_pct >= 0:
        return 0.0
    # -20% decline → score 100
    return min(100.0, abs(change_pct) * 5.0)


def score_aser_proxy(district_aser_pct: Optional[float]) -> float:
    """
    Score ASER learning outcome proxy.
    None → 50.0 (neutral), high reading % → low score, low reading % → high score.
    district_aser_pct: % of students who can read Grade 2 text (0-100).
    """
    if district_aser_pct is None:
        return 50.0
    # High reading ability → low deprivation score
    return max(0.0, 100.0 - district_aser_pct)


# ── Composite DI Computation ─────────────────────────────────────────────────

def compute_deprivation_index(school: UDISESchoolData) -> dict:
    """
    Compute composite Deprivation Index from 8 UDISE signals.

    Returns dict with all 8 _score keys + composite_di (rounded to 1dp).
    Pure function — no I/O, no side effects.

    Null handling: if school missing >3 of 8 signals:
    → composite_di = None, di_data_quality = 'INSUFFICIENT_DATA'
    """
    # Count missing signals
    missing_count = 0
    if school.stu_tea_ratio is None:
        missing_count += 1
    if school.nearest_town_km is None:
        missing_count += 1
    if school.district_aser_pct is None:
        missing_count += 1
    if school.enrollment_3yr_ago is None:
        missing_count += 1

    # Compute all 8 signal scores
    stu_tea_score = score_stu_tea_ratio(
        school.stu_tea_ratio if school.stu_tea_ratio is not None else 999.0
    )
    subject_vac_score = score_subject_vacancy(
        school.num_subject_vacancies, school.num_required_subjects
    )
    toilet_score = score_toilet(school.toilet_boys, school.toilet_girls)
    electricity_score = score_electricity(school.has_electricity)
    classroom_score = score_classroom_ratio(school.num_classrooms, school.enrollment_total)
    urban_dist_score = score_urban_distance(school.nearest_town_km)
    enrollment_score = score_enrollment_trend(school.enrollment_total, school.enrollment_3yr_ago)
    aser_score = score_aser_proxy(school.district_aser_pct)

    scores = {
        "stu_tea_ratio_score":      stu_tea_score,
        "subject_vacancy_score":    subject_vac_score,
        "toilet_score":             toilet_score,
        "electricity_score":        electricity_score,
        "classroom_ratio_score":    classroom_score,
        "urban_distance_score":     urban_dist_score,
        "enrollment_trend_score":   enrollment_score,
        "aser_proxy_score":         aser_score,
    }

    # Insufficient data check
    if missing_count > 3:
        return {
            **scores,
            "composite_di": None,
            "di_data_quality": "INSUFFICIENT_DATA",
        }

    # Weighted composite
    composite = (
        stu_tea_score    * DI_WEIGHTS["stu_tea_ratio"]    +
        subject_vac_score * DI_WEIGHTS["subject_vacancy"] +
        toilet_score     * DI_WEIGHTS["toilet"]           +
        electricity_score * DI_WEIGHTS["electricity"]     +
        classroom_score  * DI_WEIGHTS["classroom_ratio"]  +
        urban_dist_score * DI_WEIGHTS["urban_distance"]   +
        enrollment_score * DI_WEIGHTS["enrollment_trend"] +
        aser_score       * DI_WEIGHTS["aser_proxy"]
    )

    return {
        **scores,
        "composite_di": round(composite, 1),
        "di_data_quality": "OK",
    }
