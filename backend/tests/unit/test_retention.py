"""
EduAllocPro — Unit Tests: Retention Scorer
"""
import pytest
from ai.retention import (
    RETENTION_WEIGHTS,
    compute_retention_score,
    score_home_district_distance,
    score_rural_experience,
    score_transfer_frequency,
    score_years_to_retirement,
)


class TestRetentionWeights:
    def test_weights_sum_to_one(self):
        assert abs(sum(RETENTION_WEIGHTS.values()) - 1.0) < 1e-9


class TestHomeDistrictDistance:
    def test_same_district_high_score(self):
        result = score_home_district_distance("Nandurbar", "Nandurbar")
        assert result == 100.0

    def test_far_district_low_score(self):
        result = score_home_district_distance("Pune", "Nandurbar", home_to_school_km=200.0)
        assert result == 0.0

    def test_within_30km_high_score(self):
        result = score_home_district_distance("Dhule", "Nandurbar", home_to_school_km=25.0)
        assert result == 100.0

    def test_30_to_80km_medium_score(self):
        result = score_home_district_distance("Dhule", "Nandurbar", home_to_school_km=50.0)
        assert result == 50.0


class TestRuralExperience:
    def test_zero_years_score_0(self):
        assert score_rural_experience(0) == 0.0

    def test_5_years_score_100(self):
        assert score_rural_experience(5) == 100.0

    def test_high_rural_experience_capped_100(self):
        assert score_rural_experience(10) == 100.0

    def test_2_years_score_40(self):
        assert score_rural_experience(2) == 40.0


class TestTransferFrequency:
    def test_zero_transfers_score_100(self):
        assert score_transfer_frequency(0) == 100.0

    def test_4_transfers_score_0(self):
        assert score_transfer_frequency(4) == 0.0

    def test_frequent_transfers_low_score(self):
        result = score_transfer_frequency(3)
        assert result == 25.0


class TestYearsToRetirement:
    def test_new_teacher_high_score(self):
        result = score_years_to_retirement(years_of_service=2)
        assert result > 80.0

    def test_near_retirement_low_score(self):
        result = score_years_to_retirement(years_of_service=28)
        assert result < 20.0


class TestCompositeRetention:
    def test_same_district_high_score(self):
        teacher = {
            "home_district": "Nandurbar",
            "years_of_service": 10,
            "rural_posting_years": 5,
            "transfer_request_count": 0,
        }
        result = compute_retention_score(teacher, "Nandurbar")
        assert result["retention_score"] >= 75.0
        assert result["risk_flag"] == "LOW_RISK"

    def test_far_district_low_score(self):
        teacher = {
            "home_district": "Mumbai",
            "years_of_service": 5,
            "rural_posting_years": 0,
            "transfer_request_count": 3,
        }
        result = compute_retention_score(teacher, "Nandurbar", home_to_school_km=400.0)
        assert result["retention_score"] < 55.0
        assert result["risk_flag"] == "HIGH_RISK"

    def test_risk_flag_boundaries(self):
        """Test HIGH_RISK <55, MEDIUM_RISK <75, LOW_RISK 75+"""
        # HIGH_RISK
        teacher_high = {
            "home_district": "Mumbai",
            "years_of_service": 2,
            "rural_posting_years": 0,
            "transfer_request_count": 4,
        }
        result = compute_retention_score(teacher_high, "Nandurbar", home_to_school_km=500.0)
        assert result["risk_flag"] == "HIGH_RISK"

    def test_composite_always_0_to_100(self):
        teacher = {
            "home_district": "Nandurbar",
            "years_of_service": 15,
            "rural_posting_years": 8,
            "transfer_request_count": 0,
        }
        result = compute_retention_score(teacher, "Nandurbar")
        assert 0.0 <= result["retention_score"] <= 100.0

    def test_result_has_all_components(self):
        teacher = {
            "home_district": "Nandurbar",
            "years_of_service": 5,
            "rural_posting_years": 2,
            "transfer_request_count": 1,
        }
        result = compute_retention_score(teacher, "Nandurbar")
        for key in ["home_dist_score", "rural_exp_score", "transfer_freq_score",
                    "yrs_to_retire_score", "retention_score", "risk_flag"]:
            assert key in result
