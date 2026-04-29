"""
EduAllocPro — School Pydantic Models
All school-related response schemas. school_id is always STRING.
"""
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, field_validator


class DIBreakdown(BaseModel):
    """All 8 DI signal scores (0-100) plus composite."""

    stu_tea_ratio_score: float = 0.0
    subject_vacancy_score: float = 0.0
    toilet_score: float = 0.0
    electricity_score: float = 0.0
    classroom_ratio_score: float = 0.0
    urban_distance_score: float = 0.0
    enrollment_trend_score: float = 0.0
    aser_proxy_score: float = 0.0
    composite_di: float = 0.0


class SchoolSummary(BaseModel):
    """Lightweight school record for list views and map markers."""

    school_id: str  # Always STRING — 11-digit UDISE code
    name: str
    district: str
    block: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    di_score: float = 0.0
    di_tier: str = "stable"
    rte_violation: bool = False
    vacancies: list[str] = []
    enrollment_trend: Optional[str] = None
    data_updated_at: Optional[datetime] = None
    is_data_stale: bool = False
    deployment_status: str = "unassigned"

    @field_validator("di_score", mode="before")
    @classmethod
    def round_di_score(cls, v: Any) -> float:
        if v is None:
            return 0.0
        return round(float(v), 1)

    @field_validator("di_tier", mode="before")
    @classmethod
    def compute_di_tier(cls, v: Any, info: Any) -> str:
        # If tier is already set, use it
        if v and v != "stable":
            return v
        # Compute from di_score in values
        score = info.data.get("di_score", 0.0) if hasattr(info, "data") else 0.0
        if score >= 80:
            return "critical"
        if score >= 60:
            return "high"
        if score >= 40:
            return "moderate"
        return "stable"


class SchoolDetail(SchoolSummary):
    """Full school record with DI breakdown and infrastructure details."""

    di_breakdown: Optional[DIBreakdown] = None
    enrollment_boys: Optional[int] = None
    enrollment_girls: Optional[int] = None
    enrollment_total: Optional[int] = None
    enrollment_trend_list: list[int] = []
    stu_tea_ratio: Optional[float] = None
    num_classrooms: Optional[int] = None
    toilet_boys: bool = False
    toilet_girls: bool = False
    electricity: bool = False
    nearest_town_km: Optional[float] = None
    vacancies_detail: list[dict] = []
    required_subjects: list[str] = []
    rte_teachers_needed: int = 0
    di_data_quality: str = "OK"
    satellite_verified: bool = False
    medium: Optional[str] = None
    category: Optional[str] = None
    management: Optional[str] = None
    cluster: Optional[str] = None


class DistrictStats(BaseModel):
    """Task 5: District-level aggregation summary."""
    total_schools: int = 0
    scored_schools: int = 0
    critical_count: int = 0
    high_count: int = 0
    rte_violation_count: int = 0
    total_vacancies: int = 0
    data_stale_count: int = 0


class SchoolListResponse(BaseModel):
    """Paginated list of schools with district stats (Task 5)."""

    schools: list[SchoolSummary]
    total: int
    limit: int
    offset: int
    has_more: bool
    district_id: str
    filters_applied: dict = {}
    district_stats: Optional[DistrictStats] = None


class SchoolDetailResponse(BaseModel):
    """Full detail for a single school."""
    school: SchoolDetail
