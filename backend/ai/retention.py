"""
EduAllocPro — Retention Risk Proxy Scorer
Estimates probability a teacher will stay long-term at a posting.
Pure scoring functions + composite retention score.
"""
from typing import Optional

import structlog

logger = structlog.get_logger()

# Retention component weights
RETENTION_WEIGHTS: dict[str, float] = {
    "home_dist_score":     0.40,
    "rural_exp_score":     0.25,
    "transfer_freq_score": 0.20,
    "yrs_to_retire_score": 0.15,
}
assert abs(sum(RETENTION_WEIGHTS.values()) - 1.0) < 1e-9, "RETENTION_WEIGHTS must sum to 1.0"

# Risk thresholds
RISK_HIGH_THRESHOLD   = 55.0
RISK_MEDIUM_THRESHOLD = 75.0


def score_home_district_distance(
    home_district: str,
    school_district: str,
    home_to_school_km: Optional[float] = None,
) -> float:
    """
    Score based on distance from home district.
    Same district → 100 (high retention), far away → 0 (low retention).
    """
    if home_district and school_district:
        if home_district.lower() == school_district.lower():
            return 100.0

    if home_to_school_km is not None:
        # Within 30km → 100, 30-80km → 50, >80km → 0
        if home_to_school_km <= 30:
            return 100.0
        if home_to_school_km <= 80:
            return 50.0
        return 0.0

    # Different district, no distance data → moderate score
    return 30.0


def score_rural_experience(rural_posting_years: int) -> float:
    """
    Score based on rural posting experience.
    More rural experience → higher retention probability.
    Formula: min(100, years * 20)
    """
    return min(100.0, rural_posting_years * 20.0)


def score_transfer_frequency(transfer_request_count: int) -> float:
    """
    Score based on transfer request history.
    Frequent transfer requests → lower retention.
    Formula: max(0, 100 - count * 25)
    """
    return max(0.0, 100.0 - transfer_request_count * 25.0)


def score_years_to_retirement(
    years_of_service: int,
    retirement_age_yrs: int = 30,
) -> float:
    """
    Score based on years remaining until retirement.
    More years remaining → higher retention (more to lose by transferring).
    """
    years_remaining = max(0, retirement_age_yrs - years_of_service)
    # 0 years remaining → 0, 15+ years remaining → 100
    return min(100.0, years_remaining / 15.0 * 100.0)


def compute_retention_score(
    teacher: dict,
    school_district: str,
    home_to_school_km: Optional[float] = None,
) -> dict:
    """
    Compute composite retention score for a teacher-school pair.

    Returns dict with:
    - home_dist_score, rural_exp_score, transfer_freq_score, yrs_to_retire_score
    - retention_score (0-100)
    - risk_flag: HIGH_RISK (<55), MEDIUM_RISK (<75), LOW_RISK (75+)
    """
    home_dist = score_home_district_distance(
        teacher.get("home_district", ""),
        school_district,
        home_to_school_km,
    )
    rural_exp = score_rural_experience(
        int(teacher.get("rural_posting_years", 0))
    )
    transfer_freq = score_transfer_frequency(
        int(teacher.get("transfer_request_count", 0))
    )
    yrs_retire = score_years_to_retirement(
        int(teacher.get("years_of_service", 0))
    )

    composite = (
        home_dist    * RETENTION_WEIGHTS["home_dist_score"]     +
        rural_exp    * RETENTION_WEIGHTS["rural_exp_score"]     +
        transfer_freq * RETENTION_WEIGHTS["transfer_freq_score"] +
        yrs_retire   * RETENTION_WEIGHTS["yrs_to_retire_score"]
    )
    composite = round(composite, 1)

    if composite < RISK_HIGH_THRESHOLD:
        risk_flag = "HIGH_RISK"
    elif composite < RISK_MEDIUM_THRESHOLD:
        risk_flag = "MEDIUM_RISK"
    else:
        risk_flag = "LOW_RISK"

    return {
        "home_dist_score":     round(home_dist, 1),
        "rural_exp_score":     round(rural_exp, 1),
        "transfer_freq_score": round(transfer_freq, 1),
        "yrs_to_retire_score": round(yrs_retire, 1),
        "retention_score":     composite,
        "risk_flag":           risk_flag,
    }


def audit_gender_disparity(
    teachers: list[dict],
    threshold_gap: float = 10.0,
) -> dict:
    """
    Audit gender disparity in retention scores.
    Returns analysis dict with gap and flag if threshold exceeded.
    """
    male_scores = [t.get("retention_score", 0) for t in teachers if t.get("gender") == "M"]
    female_scores = [t.get("retention_score", 0) for t in teachers if t.get("gender") == "F"]

    if not male_scores or not female_scores:
        return {"gap": 0.0, "flag": False, "note": "Insufficient gender data"}

    male_avg = sum(male_scores) / len(male_scores)
    female_avg = sum(female_scores) / len(female_scores)
    gap = abs(male_avg - female_avg)

    return {
        "male_avg_retention": round(male_avg, 1),
        "female_avg_retention": round(female_avg, 1),
        "gap": round(gap, 1),
        "flag": gap > threshold_gap,
        "note": f"Gender retention gap of {gap:.1f} points {'exceeds' if gap > threshold_gap else 'within'} threshold",
    }
