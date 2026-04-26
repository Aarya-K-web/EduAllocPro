"""
EduAllocPro — OR-Tools CP-SAT District Optimizer
Assigns teachers to school vacancies maximising total DVS.
SCALE = 1000 — NEVER change this constant.
Returns partial result on timeout — NEVER raises exception.
"""
import time
import uuid
from datetime import datetime
from typing import Optional

import structlog

from ai.retention import compute_retention_score
from models.deployment import Assignment, OptimizationResult, UnmatchedVacancy
from utils.dvs_formula import compute_dvs

logger = structlog.get_logger()

# Integer scaling for OR-Tools (works with integers only)
SCALE = 1000  # NEVER change this constant

DVS_WEIGHTS = {"di": 0.40, "match": 0.35, "retention": 0.25}

# Priority multipliers
PRIORITY_SUBJECTS = {"Science", "Mathematics", "Physics", "Chemistry", "Biology"}
PRIORITY_GRADES = {"9-10", "11-12"}

try:
    from ortools.sat.python import cp_model
    ORTOOLS_AVAILABLE = True
except ImportError:
    ORTOOLS_AVAILABLE = False


def _get_priority_multiplier(teacher: dict, vacancy: dict) -> float:
    """
    1.2x for Science/Maths in Grade 9-10.
    1.1x for same home district as school.
    """
    multiplier = 1.0
    subject = vacancy.get("subject", "")
    grade_range = vacancy.get("grade_range", "")
    if subject in PRIORITY_SUBJECTS and any(g in grade_range for g in PRIORITY_GRADES):
        multiplier *= 1.2
    if teacher.get("home_district", "") == vacancy.get("school_district", ""):
        multiplier *= 1.1
    return round(multiplier, 2)


def _build_justification(teacher: dict, vacancy: dict, dvs: float) -> str:
    """Build human-readable justification for an assignment."""
    name = teacher.get("teacher_name", teacher.get("name", "Teacher"))
    subject = vacancy.get("subject", "")
    school = vacancy.get("school_name", "")
    match = teacher.get("match_score", 0)
    retention = teacher.get("retention_score", 0)
    return (
        f"{name} assigned to {school} for {subject} vacancy. "
        f"DVS: {dvs:.3f} (Match: {match:.0f}%, Retention: {retention:.0f}%). "
        f"Selected by OR-Tools CP-SAT optimizer."
    )


def optimize_district_deployment(
    schools: list[dict],
    teachers: list[dict],
    max_time_seconds: int = 20,
) -> OptimizationResult:
    """
    Run OR-Tools CP-SAT optimizer for district-wide teacher deployment.

    Hard constraints:
    1. Each teacher assigned to at most 1 school per cycle
    2. Each vacancy receives at most 1 teacher
    3. Teacher subject must match vacancy subject
    4. Commute ≤ 80km unless long_dist_consent = True

    Returns OptimizationResult with status OPTIMAL, FEASIBLE, or NO_SOLUTION.
    NEVER raises exception on timeout — returns partial result HTTP 200.
    """
    log = logger.bind(fn="optimize_district_deployment")
    log.info("optimizer.start", schools=len(schools), teachers=len(teachers))

    start_time = time.time()

    # Build vacancy list from schools
    vacancies = []
    for school in schools:
        school_id = school.get("school_id", "")
        school_name = school.get("school_name", school.get("name", ""))
        di_score = float(school.get("di_score", 0))
        school_district = school.get("district_name", school.get("district", ""))

        for vac in school.get("vacancies_detail", school.get("vacancies", [])):
            if isinstance(vac, dict):
                subject = vac.get("subject", "")
                count = int(vac.get("count", 1))
            else:
                subject = str(vac)
                count = 1

            for _ in range(count):
                vacancies.append({
                    "school_id": school_id,
                    "school_name": school_name,
                    "di_score": di_score,
                    "school_district": school_district,
                    "subject": subject,
                    "grade_range": vac.get("grade_range", "6-10") if isinstance(vac, dict) else "6-10",
                })

    if not vacancies or not teachers:
        log.info("optimizer.no_data")
        return OptimizationResult(
            status="NO_SOLUTION",
            solver_time_s=0.0,
            vacancies_total=len(vacancies),
            run_id=str(uuid.uuid4()),
        )

    # Pre-compute DVS scores for valid (teacher, vacancy) pairs
    # Only pairs where subject matches and distance constraint is met
    valid_pairs = []  # (t_idx, v_idx, dvs_int, dvs_float, dist_km)

    for t_idx, teacher in enumerate(teachers):
        teacher_subjects = set(teacher.get("subject_specialization", []))
        t_lat = teacher.get("lat")
        t_lng = teacher.get("lng")
        long_dist_consent = teacher.get("long_dist_consent", False)

        for v_idx, vacancy in enumerate(vacancies):
            # Constraint 3: subject match
            if vacancy["subject"] not in teacher_subjects:
                continue

            # Constraint 4: commute distance
            dist_km = teacher.get("commute_km", 45.0)  # pre-computed or default
            if dist_km > 80 and not long_dist_consent:
                continue

            # Compute retention score
            retention_result = compute_retention_score(
                teacher, vacancy["school_district"], dist_km
            )
            retention_score = retention_result["retention_score"]

            match_score = float(teacher.get("match_score", 70.0))
            di_score = vacancy["di_score"]

            dvs = compute_dvs(di_score, match_score, retention_score)
            priority_mult = _get_priority_multiplier(teacher, vacancy)
            dvs_adjusted = dvs * priority_mult

            dvs_int = int(dvs_adjusted * SCALE)
            valid_pairs.append((t_idx, v_idx, dvs_int, dvs_adjusted, dist_km, retention_score, match_score))

    if not valid_pairs:
        log.info("optimizer.no_valid_pairs")
        return OptimizationResult(
            status="NO_SOLUTION",
            solver_time_s=time.time() - start_time,
            vacancies_total=len(vacancies),
            unmatched_vacancies=[
                UnmatchedVacancy(
                    school_id=v["school_id"],
                    subject=v["subject"],
                    reason="No eligible teacher found (subject or distance constraint)",
                )
                for v in vacancies
            ],
            run_id=str(uuid.uuid4()),
        )

    if not ORTOOLS_AVAILABLE:
        # Greedy fallback when OR-Tools not installed
        return _greedy_fallback(teachers, vacancies, valid_pairs, start_time)

    # ── OR-Tools CP-SAT Model ────────────────────────────────────────────────
    model = cp_model.CpModel()

    # Decision variables: x[t_idx, v_idx] ∈ {0, 1}
    x = {}
    for t_idx, v_idx, dvs_int, *_ in valid_pairs:
        x[(t_idx, v_idx)] = model.NewBoolVar(f"x_{t_idx}_{v_idx}")

    # Constraint 1: Each teacher assigned to at most 1 school
    for t_idx in range(len(teachers)):
        teacher_vars = [x[(ti, vi)] for ti, vi, *_ in valid_pairs if ti == t_idx]
        if teacher_vars:
            model.Add(sum(teacher_vars) <= 1)

    # Constraint 2: Each vacancy receives at most 1 teacher
    for v_idx in range(len(vacancies)):
        vacancy_vars = [x[(ti, vi)] for ti, vi, *_ in valid_pairs if vi == v_idx]
        if vacancy_vars:
            model.Add(sum(vacancy_vars) <= 1)

    # Objective: maximise total DVS (integer scaled)
    objective_terms = [
        x[(t_idx, v_idx)] * dvs_int
        for t_idx, v_idx, dvs_int, *_ in valid_pairs
    ]
    model.Maximize(sum(objective_terms))

    # Solve
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = max_time_seconds
    solver.parameters.log_search_progress = False

    status_code = solver.Solve(model)
    solver_time = time.time() - start_time

    status_map = {
        cp_model.OPTIMAL:   "OPTIMAL",
        cp_model.FEASIBLE:  "FEASIBLE",
        cp_model.INFEASIBLE: "NO_SOLUTION",
        cp_model.UNKNOWN:   "NO_SOLUTION",
    }
    status = status_map.get(status_code, "NO_SOLUTION")
    partial = status == "FEASIBLE"

    log.info("optimizer.solved", status=status, solver_time_s=round(solver_time, 2))

    if status_code in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        assignments = []
        assigned_vacancies = set()
        total_dvs = 0.0

        for t_idx, v_idx, dvs_int, dvs_float, dist_km, retention_score, match_score in valid_pairs:
            if solver.Value(x[(t_idx, v_idx)]) == 1:
                teacher = teachers[t_idx]
                vacancy = vacancies[v_idx]
                assigned_vacancies.add(v_idx)
                total_dvs += dvs_float

                commute_minutes = int(dist_km / 40 * 60) if dist_km < 999 else None
                priority_mult = _get_priority_multiplier(teacher, vacancy)

                assignments.append(Assignment(
                    school_id=vacancy["school_id"],
                    school_name=vacancy["school_name"],
                    di_score=vacancy["di_score"],
                    teacher_id=teacher.get("teacher_id", ""),
                    teacher_name=teacher.get("teacher_name", teacher.get("name", "")),
                    subject=vacancy["subject"],
                    match_score=round(match_score, 1),
                    retention_score=round(retention_score, 1),
                    dvs_score=round(dvs_float, 4),
                    commute_minutes=commute_minutes,
                    priority_multiplier=priority_mult,
                    justification=_build_justification(teacher, vacancy, dvs_float),
                ))

        unmatched = [
            UnmatchedVacancy(
                school_id=vacancies[v_idx]["school_id"],
                subject=vacancies[v_idx]["subject"],
                reason="Not selected by optimizer in time limit" if partial else "No eligible teacher",
            )
            for v_idx in range(len(vacancies))
            if v_idx not in assigned_vacancies
        ]

        return OptimizationResult(
            status=status,
            solver_time_s=round(solver_time, 2),
            total_dvs=round(total_dvs, 4),
            vacancies_filled=len(assignments),
            vacancies_total=len(vacancies),
            partial_result=partial,
            assignments=assignments,
            unmatched_vacancies=unmatched,
            run_id=str(uuid.uuid4()),
            optimized_at=datetime.utcnow(),
        )

    # NO_SOLUTION
    return OptimizationResult(
        status="NO_SOLUTION",
        solver_time_s=round(solver_time, 2),
        vacancies_total=len(vacancies),
        unmatched_vacancies=[
            UnmatchedVacancy(
                school_id=v["school_id"],
                subject=v["subject"],
                reason="No feasible solution found",
            )
            for v in vacancies
        ],
        run_id=str(uuid.uuid4()),
    )


def _greedy_fallback(
    teachers: list[dict],
    vacancies: list[dict],
    valid_pairs: list,
    start_time: float,
) -> OptimizationResult:
    """Greedy fallback when OR-Tools is not available."""
    # Sort by DVS descending
    sorted_pairs = sorted(valid_pairs, key=lambda p: p[3], reverse=True)

    assigned_teachers = set()
    assigned_vacancies = set()
    assignments = []
    total_dvs = 0.0

    for t_idx, v_idx, dvs_int, dvs_float, dist_km, retention_score, match_score in sorted_pairs:
        if t_idx in assigned_teachers or v_idx in assigned_vacancies:
            continue
        teacher = teachers[t_idx]
        vacancy = vacancies[v_idx]
        assigned_teachers.add(t_idx)
        assigned_vacancies.add(v_idx)
        total_dvs += dvs_float
        priority_mult = _get_priority_multiplier(teacher, vacancy)
        commute_minutes = int(dist_km / 40 * 60) if dist_km < 999 else None

        assignments.append(Assignment(
            school_id=vacancy["school_id"],
            school_name=vacancy["school_name"],
            di_score=vacancy["di_score"],
            teacher_id=teacher.get("teacher_id", ""),
            teacher_name=teacher.get("teacher_name", teacher.get("name", "")),
            subject=vacancy["subject"],
            match_score=round(match_score, 1),
            retention_score=round(retention_score, 1),
            dvs_score=round(dvs_float, 4),
            commute_minutes=commute_minutes,
            priority_multiplier=priority_mult,
            justification=_build_justification(teacher, vacancy, dvs_float),
        ))

    unmatched = [
        UnmatchedVacancy(
            school_id=vacancies[v_idx]["school_id"],
            subject=vacancies[v_idx]["subject"],
            reason="Not assigned (greedy fallback)",
        )
        for v_idx in range(len(vacancies))
        if v_idx not in assigned_vacancies
    ]

    return OptimizationResult(
        status="FEASIBLE",
        solver_time_s=round(time.time() - start_time, 2),
        total_dvs=round(total_dvs, 4),
        vacancies_filled=len(assignments),
        vacancies_total=len(vacancies),
        partial_result=True,
        assignments=assignments,
        unmatched_vacancies=unmatched,
        run_id=str(uuid.uuid4()),
        optimized_at=datetime.utcnow(),
    )
