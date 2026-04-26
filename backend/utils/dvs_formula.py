"""
EduAllocPro — DVS Formula
Pure function — zero I/O.
DVS = (DI/100)*0.40 + (match/100)*0.35 + (retention/100)*0.25
NEVER modify these weights without explicit product discussion.
"""

DVS_WEIGHTS: dict[str, float] = {
    "di":        0.40,
    "match":     0.35,
    "retention": 0.25,
}


def compute_dvs(di: float, match: float, retention: float) -> float:
    """
    Compute Deployment Value Score.

    Args:
        di:        Deprivation Index score (0-100)
        match:     Teacher-school match score (0-100)
        retention: Retention probability score (0-100)

    Returns:
        DVS score in range [0.0, 1.0]
    """
    return (di / 100.0 * DVS_WEIGHTS["di"]) + \
           (match / 100.0 * DVS_WEIGHTS["match"]) + \
           (retention / 100.0 * DVS_WEIGHTS["retention"])


def compute_dvs_breakdown(di: float, match: float, retention: float) -> dict:
    """
    Compute DVS with full component breakdown.

    Returns dict with di_component, match_component, retention_component, dvs_score.
    """
    di_comp        = di / 100.0 * DVS_WEIGHTS["di"]
    match_comp     = match / 100.0 * DVS_WEIGHTS["match"]
    retention_comp = retention / 100.0 * DVS_WEIGHTS["retention"]

    return {
        "di_component":        round(di_comp, 4),
        "match_component":     round(match_comp, 4),
        "retention_component": round(retention_comp, 4),
        "dvs_score":           round(di_comp + match_comp + retention_comp, 4),
    }
