"""
EduAllocPro — Unit Tests: RTE PTR Compliance Checker
"""
import pytest
from utils.rte_check import (
    RTE_PTR_GRADES_1_5,
    RTE_PTR_GRADES_6_8,
    check_rte_violation,
    teachers_needed_for_compliance,
)


class TestRTEConstants:
    def test_grades_1_5_norm(self):
        assert RTE_PTR_GRADES_1_5 == 30

    def test_grades_6_8_norm(self):
        assert RTE_PTR_GRADES_6_8 == 35


class TestRTEViolation:
    def test_violation_grade_1_5_ptr_31(self):
        assert check_rte_violation(31.0, "1-5") is True

    def test_no_violation_grade_1_5_ptr_29(self):
        assert check_rte_violation(29.0, "1-5") is False

    def test_violation_grade_6_8_ptr_36(self):
        assert check_rte_violation(36.0, "6-8") is True

    def test_no_violation_grade_6_8_ptr_34(self):
        assert check_rte_violation(34.0, "6-8") is False

    def test_exact_norm_no_violation(self):
        assert check_rte_violation(30.0, "1-5") is False
        assert check_rte_violation(35.0, "6-8") is False

    def test_none_ratio_no_violation(self):
        assert check_rte_violation(None, "1-5") is False


class TestTeachersNeeded:
    def test_compliant_school_needs_zero(self):
        result = teachers_needed_for_compliance(25.0, 100, "1-5")
        assert result == 0

    def test_violation_needs_positive_teachers(self):
        result = teachers_needed_for_compliance(60.0, 120, "1-5")
        assert result > 0

    def test_calculation_grade_1_5(self):
        """120 students / 60 PTR = 2 teachers. Need 120/30 = 4. So need 2 more."""
        result = teachers_needed_for_compliance(60.0, 120, "1-5")
        assert result >= 2

    def test_zero_students_needs_zero(self):
        result = teachers_needed_for_compliance(50.0, 0, "1-5")
        assert result == 0
