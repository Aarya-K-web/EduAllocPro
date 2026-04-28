"""
EduAllocPro — Data Validators
Validation utilities for UDISE and teacher data.
"""


def validate_school_id(school_id: str) -> bool:
    """UDISE school_id must be exactly 11 digits (string)."""
    return isinstance(school_id, str) and len(school_id) == 11 and school_id.isdigit()


def validate_udise_row(row: dict) -> tuple[dict, list[str]]:
    """
    Validate and clean a UDISE row.
    Checks school_id, STR ranges, and enrollment positivity.
    Returns (cleaned_row, list_of_warnings).
    Pure function, no I/O.
    """
    warnings = []
    cleaned = row.copy()

    # school_id must be 11 digits
    sid = str(cleaned.get("school_id", "")).strip()
    if not validate_school_id(sid):
        warnings.append(f"Invalid school_id format: {sid}")
        cleaned["school_id"] = None

    # stu_tea_ratio range check (0, 999)
    try:
        str_val = float(cleaned.get("stu_tea_ratio", 0))
        if str_val <= 0 or str_val >= 999:
            warnings.append(f"stu_tea_ratio out of range: {str_val}")
            cleaned["stu_tea_ratio"] = None
    except (TypeError, ValueError):
        cleaned["stu_tea_ratio"] = None

    # Enrollment fields must be positive
    enrollment_fields = ["enrollment_total", "enrollment_boys", "enrollment_girls"]
    for field in enrollment_fields:
        try:
            val = int(cleaned.get(field, 0))
            if val < 0:
                warnings.append(f"{field} is negative: {val}")
                cleaned[field] = 0
            cleaned[field] = val
        except (TypeError, ValueError):
            cleaned[field] = 0

    return cleaned, warnings


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
