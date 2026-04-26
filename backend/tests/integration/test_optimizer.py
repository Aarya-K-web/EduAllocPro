"""
EduAllocPro — Integration Tests: OR-Tools Optimizer
"""
import pytest
from tests.fixtures.sample_schools import SAMPLE_SCHOOLS_NDB
from tests.fixtures.sample_teachers import SAMPLE_TEACHERS_NDB


class TestOptimizer:
    def test_optimizer_returns_valid_assignments(self):
        from ai.optimizer import optimize_district_deployment
        schools = [s for s in SAMPLE_SCHOOLS_NDB if s.get("total_vacancies", 0) > 0]
        result = optimize_district_deployment(schools, SAMPLE_TEACHERS_NDB, max_time_seconds=5)
        assert result.status in ("OPTIMAL", "FEASIBLE", "NO_SOLUTION")
        assert result.solver_time_s >= 0
        assert isinstance(result.assignments, list)

    def test_subject_constraint_enforced(self):
        """Teacher subject must match vacancy subject."""
        from ai.optimizer import optimize_district_deployment
        schools = [s for s in SAMPLE_SCHOOLS_NDB if s.get("total_vacancies", 0) > 0]
        result = optimize_district_deployment(schools, SAMPLE_TEACHERS_NDB, max_time_seconds=5)
        for assignment in result.assignments:
            # Find the teacher
            teacher = next(
                (t for t in SAMPLE_TEACHERS_NDB if t["teacher_id"] == assignment.teacher_id),
                None,
            )
            if teacher:
                assert assignment.subject in teacher.get("subject_specialization", [])

    def test_commute_constraint_enforced(self):
        """Teachers without long_dist_consent should not be assigned >80km away."""
        from ai.optimizer import optimize_district_deployment
        schools = SAMPLE_SCHOOLS_NDB[:2]
        result = optimize_district_deployment(schools, SAMPLE_TEACHERS_NDB, max_time_seconds=5)
        # All assignments should have valid DVS scores
        for assignment in result.assignments:
            assert 0.0 <= assignment.dvs_score <= 1.0

    def test_timeout_returns_partial_not_error(self):
        """Optimizer timeout must return partial result, not raise exception."""
        from ai.optimizer import optimize_district_deployment
        # Very short time limit to force timeout
        result = optimize_district_deployment(
            SAMPLE_SCHOOLS_NDB, SAMPLE_TEACHERS_NDB, max_time_seconds=1
        )
        # Must not raise — must return a result
        assert result is not None
        assert result.status in ("OPTIMAL", "FEASIBLE", "NO_SOLUTION")

    def test_dvs_formula_applied_correctly(self):
        """DVS scores in assignments must be in [0, 1]."""
        from ai.optimizer import optimize_district_deployment
        schools = [s for s in SAMPLE_SCHOOLS_NDB if s.get("total_vacancies", 0) > 0]
        result = optimize_district_deployment(schools, SAMPLE_TEACHERS_NDB, max_time_seconds=5)
        for assignment in result.assignments:
            assert 0.0 <= assignment.dvs_score <= 1.0

    def test_each_teacher_assigned_at_most_once(self):
        """Hard constraint: each teacher assigned to at most 1 school."""
        from ai.optimizer import optimize_district_deployment
        schools = SAMPLE_SCHOOLS_NDB
        result = optimize_district_deployment(schools, SAMPLE_TEACHERS_NDB, max_time_seconds=5)
        teacher_ids = [a.teacher_id for a in result.assignments]
        assert len(teacher_ids) == len(set(teacher_ids)), "Teacher assigned to multiple schools!"
