"""
EduAllocPro — Unit Tests: Deprivation Index Formula
Tests all 8 scoring functions + composite DI.
Boundary conditions: perfect score, worst score, null input.
"""
import pytest
from utils.di_formula import (
    DI_WEIGHTS,
    UDISESchoolData,
    compute_deprivation_index,
    score_aser_proxy,
    score_classroom_ratio,
    score_electricity,
    score_enrollment_trend,
    score_stu_tea_ratio,
    score_subject_vacancy,
    score_toilet,
    score_urban_distance,
)


class TestWeightsSum:
    def test_weights_sum_to_one(self):
        assert abs(sum(DI_WEIGHTS.values()) - 1.0) < 1e-9

    def test_weights_all_positive(self):
        for k, v in DI_WEIGHTS.items():
            assert v > 0, f"Weight for {k} must be positive"

    def test_weights_count(self):
        assert len(DI_WEIGHTS) == 8


class TestStuTeaRatio:
    def test_ideal_ratio_score_zero(self):
        assert score_stu_tea_ratio(20.0) == 0.0

    def test_ratio_30_approx_16_7(self):
        result = score_stu_tea_ratio(30.0)
        assert abs(result - 16.67) < 0.1

    def test_ratio_80_score_100(self):
        assert score_stu_tea_ratio(80.0) == 100.0

    def test_ratio_above_80_capped_at_100(self):
        assert score_stu_tea_ratio(200.0) == 100.0

    def test_ratio_below_20_score_zero(self):
        assert score_stu_tea_ratio(10.0) == 0.0


class TestSubjectVacancy:
    def test_all_vacant_score_100(self):
        assert score_subject_vacancy(5, 5) == 100.0

    def test_none_vacant_score_0(self):
        assert score_subject_vacancy(0, 5) == 0.0

    def test_half_vacant_score_50(self):
        assert score_subject_vacancy(2, 4) == 50.0

    def test_zero_required_score_0(self):
        assert score_subject_vacancy(0, 0) == 0.0


class TestToilet:
    def test_both_toilets_score_0(self):
        assert score_toilet(True, True) == 0.0

    def test_one_toilet_score_50(self):
        assert score_toilet(True, False) == 50.0
        assert score_toilet(False, True) == 50.0

    def test_no_toilet_score_100(self):
        assert score_toilet(False, False) == 100.0


class TestElectricity:
    def test_electrified_score_0(self):
        assert score_electricity(True) == 0.0

    def test_no_electricity_score_100(self):
        assert score_electricity(False) == 100.0


class TestClassroomRatio:
    def test_good_ratio_low_score(self):
        # 30 students per room → score 0
        result = score_classroom_ratio(classrooms=3, enrollment=90)
        assert result == 0.0

    def test_overcrowded_score_100(self):
        # 60 students per room → score 100
        result = score_classroom_ratio(classrooms=1, enrollment=60)
        assert result == 100.0

    def test_zero_classrooms_neutral(self):
        result = score_classroom_ratio(classrooms=0, enrollment=100)
        assert result == 50.0


class TestUrbanDistance:
    def test_none_returns_50(self):
        assert score_urban_distance(None) == 50.0

    def test_zero_km_score_0(self):
        assert score_urban_distance(0.0) == 0.0

    def test_50km_score_100(self):
        assert score_urban_distance(50.0) == 100.0

    def test_above_50km_capped_100(self):
        assert score_urban_distance(100.0) == 100.0


class TestEnrollmentTrend:
    def test_none_three_yr_ago_score_0(self):
        assert score_enrollment_trend(100, None) == 0.0

    def test_growing_enrollment_score_0(self):
        assert score_enrollment_trend(120, 100) == 0.0

    def test_20pct_decline_score_100(self):
        result = score_enrollment_trend(80, 100)
        assert result == 100.0

    def test_10pct_decline_score_50(self):
        result = score_enrollment_trend(90, 100)
        assert result == 50.0


class TestAserProxy:
    def test_none_returns_50(self):
        assert score_aser_proxy(None) == 50.0

    def test_high_reading_low_score(self):
        # 90% reading → score 10
        assert score_aser_proxy(90.0) == 10.0

    def test_low_reading_high_score(self):
        # 20% reading → score 80
        assert score_aser_proxy(20.0) == 80.0

    def test_zero_reading_score_100(self):
        assert score_aser_proxy(0.0) == 100.0


class TestCompositeIndex:
    def test_worst_school_score_above_80(self):
        """A school with all worst-case signals should score ≥ 80."""
        school = UDISESchoolData(
            school_id="TEST001",
            stu_tea_ratio=100.0,
            num_subject_vacancies=5,
            num_required_subjects=5,
            toilet_boys=False,
            toilet_girls=False,
            has_electricity=False,
            num_classrooms=1,
            enrollment_total=200,
            nearest_town_km=60.0,
            enrollment_3yr_ago=250,
            district_aser_pct=10.0,
        )
        result = compute_deprivation_index(school)
        assert result["composite_di"] >= 80.0

    def test_best_school_score_below_15(self):
        """A school with all best-case signals should score ≤ 15."""
        school = UDISESchoolData(
            school_id="TEST002",
            stu_tea_ratio=20.0,
            num_subject_vacancies=0,
            num_required_subjects=5,
            toilet_boys=True,
            toilet_girls=True,
            has_electricity=True,
            num_classrooms=10,
            enrollment_total=100,
            nearest_town_km=0.0,
            enrollment_3yr_ago=90,
            district_aser_pct=95.0,
        )
        result = compute_deprivation_index(school)
        assert result["composite_di"] <= 15.0

    def test_score_always_0_to_100(self):
        """Composite DI must always be in [0, 100]."""
        school = UDISESchoolData(
            school_id="TEST003",
            stu_tea_ratio=45.0,
            num_subject_vacancies=2,
            num_required_subjects=4,
            toilet_boys=True,
            toilet_girls=False,
            has_electricity=True,
            num_classrooms=3,
            enrollment_total=120,
            nearest_town_km=15.0,
            enrollment_3yr_ago=130,
            district_aser_pct=60.0,
        )
        result = compute_deprivation_index(school)
        assert 0.0 <= result["composite_di"] <= 100.0

    def test_result_has_all_8_keys(self):
        """Result must contain all 8 signal score keys."""
        school = UDISESchoolData(school_id="TEST004")
        result = compute_deprivation_index(school)
        expected_keys = [
            "stu_tea_ratio_score", "subject_vacancy_score", "toilet_score",
            "electricity_score", "classroom_ratio_score", "urban_distance_score",
            "enrollment_trend_score", "aser_proxy_score", "composite_di",
        ]
        for key in expected_keys:
            assert key in result, f"Missing key: {key}"

    def test_insufficient_data_returns_none_di(self):
        """School missing >3 signals should get composite_di=None."""
        school = UDISESchoolData(
            school_id="TEST005",
            stu_tea_ratio=None,
            nearest_town_km=None,
            district_aser_pct=None,
            enrollment_3yr_ago=None,
        )
        result = compute_deprivation_index(school)
        assert result["composite_di"] is None
        assert result["di_data_quality"] == "INSUFFICIENT_DATA"
