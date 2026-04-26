"""
EduAllocPro — Unit Tests: DVS Formula
"""
import pytest
from utils.dvs_formula import DVS_WEIGHTS, compute_dvs, compute_dvs_breakdown


class TestDVSFormula:
    def test_all_perfect_returns_1(self):
        result = compute_dvs(100.0, 100.0, 100.0)
        assert abs(result - 1.0) < 1e-9

    def test_all_zero_returns_0(self):
        result = compute_dvs(0.0, 0.0, 0.0)
        assert result == 0.0

    def test_weights_correct(self):
        """DVS = (80*0.40 + 70*0.35 + 60*0.25) / 100"""
        expected = (80 * 0.40 + 70 * 0.35 + 60 * 0.25) / 100
        result = compute_dvs(80.0, 70.0, 60.0)
        assert abs(result - expected) < 1e-9

    def test_high_di_beats_low_di_same_match(self):
        """Higher DI school should produce higher DVS (equity priority)."""
        dvs_high_di = compute_dvs(90.0, 70.0, 70.0)
        dvs_low_di  = compute_dvs(40.0, 70.0, 70.0)
        assert dvs_high_di > dvs_low_di

    def test_result_in_0_to_1_range(self):
        for di, match, ret in [(50, 50, 50), (0, 100, 0), (100, 0, 100)]:
            result = compute_dvs(di, match, ret)
            assert 0.0 <= result <= 1.0

    def test_breakdown_sums_to_dvs(self):
        breakdown = compute_dvs_breakdown(80.0, 70.0, 60.0)
        total = breakdown["di_component"] + breakdown["match_component"] + breakdown["retention_component"]
        assert abs(total - breakdown["dvs_score"]) < 1e-6

    def test_weights_sum_to_1(self):
        assert abs(sum(DVS_WEIGHTS.values()) - 1.0) < 1e-9
