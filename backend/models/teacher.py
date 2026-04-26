"""
EduAllocPro — Teacher Pydantic Models
"""
from typing import Optional
from pydantic import BaseModel


class Teacher(BaseModel):
    """Teacher profile — Phase 1 uses synthetic data only."""

    teacher_id: str  # UUID v4
    name: str
    qualification: str
    subject_specialization: list[str] = []
    languages_known: list[str] = []
    current_district: str
    home_district: str
    years_of_service: int = 0
    rural_posting_years: int = 0
    transfer_request_count: int = 0
    retention_score: Optional[float] = None
    retention_risk_flag: Optional[str] = None  # HIGH_RISK / MEDIUM_RISK / LOW_RISK
    long_dist_consent: bool = False
    is_synthetic: bool = True
    consent_given: bool = True
    current_school_id: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class TeacherListResponse(BaseModel):
    """Paginated list of teachers."""

    teachers: list[Teacher]
    total: int
    district_id: str
