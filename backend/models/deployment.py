"""
EduAllocPro — Deployment Pydantic Models
DVS = (DI/100)*0.40 + (match/100)*0.35 + (retention/100)*0.25
"""
from datetime import datetime
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class DVSBreakdown(BaseModel):
    """Component breakdown of the Deployment Value Score."""

    di_component: float = 0.0        # DI/100 * 0.40
    match_component: float = 0.0     # match/100 * 0.35
    retention_component: float = 0.0  # retention/100 * 0.25


class TeacherMatch(BaseModel):
    """A single teacher candidate ranked for a vacancy."""

    rank: int
    teacher_id: str
    name: str
    qualification: str
    subjects: list[str] = []
    current_district: str
    home_district: str
    match_score: float
    commute_minutes: Optional[int] = None
    distance_km: Optional[float] = None
    retention_score: float
    retention_risk: str = "LOW_RISK"
    dvs_score: float
    dvs_breakdown: DVSBreakdown
    is_within_80km: bool = True
    retention_warning: Optional[str] = None
    is_synthetic: bool = True


class MatchListResponse(BaseModel):
    """Response for GET /deploy/matches."""

    school_id: str
    school_name: str
    vacancy_subject: str
    school_di_score: float
    matches: list[TeacherMatch]
    total_candidates_evaluated: int = 0
    candidates_rejected_distance: int = 0
    cache_used: bool = False
    computed_at: datetime = Field(default_factory=datetime.utcnow)


class Assignment(BaseModel):
    """A single teacher-school assignment from the optimizer."""

    assignment_id: str = Field(default_factory=lambda: str(uuid4()))
    school_id: str
    school_name: str
    di_score: float
    teacher_id: str
    teacher_name: str
    subject: str
    match_score: float
    retention_score: float
    dvs_score: float
    commute_minutes: Optional[int] = None
    priority_multiplier: float = 1.0
    justification: str = ""
    retention_warning: Optional[str] = None


class UnmatchedVacancy(BaseModel):
    """A vacancy that could not be filled by the optimizer."""

    school_id: str
    subject: str
    reason: str


class OptimizationResult(BaseModel):
    """Result from OR-Tools CP-SAT optimizer."""

    status: str  # OPTIMAL / FEASIBLE / NO_SOLUTION
    solver_time_s: float
    total_dvs: float = 0.0
    vacancies_filled: int = 0
    vacancies_total: int = 0
    partial_result: bool = False
    assignments: list[Assignment] = []
    unmatched_vacancies: list[UnmatchedVacancy] = []
    run_id: str = Field(default_factory=lambda: str(uuid4()))
    optimized_at: datetime = Field(default_factory=datetime.utcnow)
