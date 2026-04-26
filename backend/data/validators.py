"""
EduAllocPro — Data Validators
Validation utilities for UDISE and teacher data.
"""


def validate_school_id(school_id: str) -> bool:
    """UDISE school_id must be an 11-digit string."""
    return isinstance(school_id, str) and len(school_id) == 11 and school_id.isdigit()


def validate_teacher_id(teacher_id: str) -> bool:
    """teacher_id must be a UUID v4 string."""
    import re
    uuid_pattern = r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
    return bool(re.match(uuid_pattern, teacher_id.lower()))


def validate_di_score(score) -> bool:
    """DI score must be a float in [0, 100] or None."""
    if score is None:
        return True
    try:
        return 0.0 <= float(score) <= 100.0
    except (TypeError, ValueError):
        return False
