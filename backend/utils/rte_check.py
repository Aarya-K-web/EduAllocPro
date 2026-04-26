"""
EduAllocPro — RTE PTR Compliance Checker
Pure functions — zero I/O.
Right to Education Act, 2009 — Section 25 PTR norms.
"""

# RTE Pupil-Teacher Ratio norms
RTE_PTR_GRADES_1_5: int = 30   # Grades 1-5: max 30 students per teacher
RTE_PTR_GRADES_6_8: int = 35   # Grades 6-8: max 35 students per teacher


def check_rte_violation(stu_tea_ratio: float, grade_range: str) -> bool:
    """
    Check if a school violates RTE PTR norms.

    Args:
        stu_tea_ratio: Current student-teacher ratio
        grade_range:   '1-5' for primary, '6-8' for upper primary

    Returns:
        True if in violation (ratio exceeds norm), False if compliant.
    """
    if stu_tea_ratio is None:
        return False
    norm = RTE_PTR_GRADES_6_8 if "6" in str(grade_range) else RTE_PTR_GRADES_1_5
    return stu_tea_ratio > norm


def teachers_needed_for_compliance(
    stu_tea_ratio: float,
    total_students: int,
    grade_range: str,
) -> int:
    """
    Calculate how many additional teachers are needed to achieve RTE compliance.

    Args:
        stu_tea_ratio: Current student-teacher ratio
        total_students: Total enrolled students
        grade_range:   '1-5' or '6-8'

    Returns:
        Number of additional teachers needed (0 if already compliant).
    """
    if stu_tea_ratio is None or total_students <= 0:
        return 0

    norm = RTE_PTR_GRADES_6_8 if "6" in str(grade_range) else RTE_PTR_GRADES_1_5

    if stu_tea_ratio <= norm:
        return 0

    current_teachers = total_students / stu_tea_ratio
    required_teachers = total_students / norm
    return max(0, int(required_teachers - current_teachers) + 1)
