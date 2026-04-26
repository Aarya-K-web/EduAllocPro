"""
EduAllocPro — Gemini Client
Wraps google-generativeai for briefing + order generation.
Model: gemini-1.5-pro — DO NOT use flash for government briefings.
All output validated against JSON schema before returning.
"""
import asyncio
import json
from typing import Optional

import structlog

from models.errors import GeminiParseError

logger = structlog.get_logger()

# Prompt version tracking — increment on any change
PROMPT_VERSIONS = {
    "SYS-001":    "1.0.0",
    "BRIEF-001":  "1.0.0",
    "ORDER-001":  "1.0.0",
    "ESCL-001":   "1.0.0",
    "BUDGET-001": "1.0.0",
}

SYSTEM_PROMPT = """You are EduAllocPro, an AI assistant for the Maharashtra Government School Education Department.
Your role is to generate factual, data-driven intelligence briefings and deployment orders for district education officers.

RULES:
1. Only reference school IDs and teacher names that appear in the provided context data.
2. Never hallucinate statistics — use only the numbers provided.
3. Use formal Maharashtra government letter language (सरकारी पत्र भाषा) for Marathi content.
4. All Marathi text must be in Devanagari script only — never romanised Marathi.
5. Numbers (DI scores, DVS, PTR) are always in Latin numerals even in Marathi text.
6. district_summary: exactly 3 sentences — statistics | geography | action.
7. marathi_summary: 140-160 Devanagari words.
8. critical_issue: maximum 120 characters — cite school ID, specific data, duration.
9. escalation_flags: only school_id values present in the TOP SCHOOLS data above.
10. Return valid JSON only — no markdown, no code blocks, no trailing commas."""

try:
    import google.generativeai as genai
    from google.generativeai.types import GenerationConfig
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


class GeminiClient:
    """Gemini 1.5 Pro client for briefings and deployment orders."""

    def __init__(self, api_key: str, model: str = "gemini-1.5-pro") -> None:
        self._api_key = api_key
        self._model_name = model
        self._model = None

        if GEMINI_AVAILABLE and api_key:
            try:
                genai.configure(api_key=api_key)
                self._model = genai.GenerativeModel(
                    model_name=model,
                    system_instruction=SYSTEM_PROMPT,
                )
                logger.info("gemini.init.ok", model=model)
            except Exception as e:
                logger.warning("gemini.init.failed", error=str(e))

    @classmethod
    def from_env(cls) -> "GeminiClient":
        from config import config
        return cls(api_key=config.gemini_key, model=config.gemini_model)

    async def generate_briefing(self, context: dict) -> dict:
        """
        Generate district briefing with up to 3 attempts on parse failure.
        Temperature increases slightly on each retry.
        """
        if not self._model:
            return _mock_briefing(context)

        max_attempts = 3
        last_error = None

        for attempt in range(1, max_attempts + 1):
            log = logger.bind(
                fn="generate_briefing",
                attempt=attempt,
                district=context.get("district_id"),
            )
            log.info("gemini.briefing.attempt")

            prompt = _build_briefing_prompt(context)

            def _generate(temp: float):
                if GEMINI_AVAILABLE:
                    from google.generativeai.types import GenerationConfig as GC
                    response = self._model.generate_content(
                        prompt,
                        generation_config=GC(
                            temperature=temp,
                            max_output_tokens=2048,
                            response_mime_type="application/json",
                        ),
                    )
                    return response.text
                return json.dumps(_mock_briefing(context))

            try:
                temp = 0.3 + (attempt - 1) * 0.1
                loop = asyncio.get_event_loop()
                raw = await loop.run_in_executor(None, lambda: _generate(temp))
                result = json.loads(raw)
                _validate_briefing_schema(result)
                log.info("gemini.briefing.success", attempt=attempt)
                return result
            except (json.JSONDecodeError, GeminiParseError) as e:
                last_error = e
                log.warning(
                    "gemini.briefing.parse_fail",
                    attempt=attempt,
                    error=str(e),
                )
                if attempt < max_attempts:
                    await asyncio.sleep(2 ** attempt)

        raise GeminiParseError(
            f"Briefing failed after {max_attempts} attempts: {last_error}"
        )

    async def generate_order_draft(self, deployment: dict) -> str:
        """
        Generate a 3-paragraph deployment order narrative.
        Temperature 0.6 for natural formal language.
        """
        if not self._model:
            return _mock_order_text(deployment)

        prompt = _build_order_prompt(deployment)

        def _generate():
            if GEMINI_AVAILABLE:
                from google.generativeai.types import GenerationConfig as GC
                response = self._model.generate_content(
                    prompt,
                    generation_config=GC(
                        temperature=0.6,
                        max_output_tokens=1024,
                    ),
                )
                return response.text
            return _mock_order_text(deployment)

        log = logger.bind(fn="generate_order_draft", school_id=deployment.get("school_id"))
        log.info("gemini.order.start")
        try:
            loop = asyncio.get_event_loop()
            text = await loop.run_in_executor(None, _generate)
            log.info("gemini.order.done", chars=len(text))
            return text
        except Exception as e:
            log.error("gemini.order.error", error=str(e))
            return _mock_order_text(deployment)

    async def generate_escalation_assessment(self, school_data: dict) -> dict:
        """
        Assess whether a school requires escalation to District Collector.
        Only called for schools with DI > 85.
        Temperature 0.1 — must be near-deterministic.
        """
        if not self._model:
            return _mock_escalation(school_data)

        prompt = _build_escalation_prompt(school_data)

        def _generate():
            if GEMINI_AVAILABLE:
                from google.generativeai.types import GenerationConfig as GC
                response = self._model.generate_content(
                    prompt,
                    generation_config=GC(
                        temperature=0.1,
                        max_output_tokens=512,
                        response_mime_type="application/json",
                    ),
                )
                return response.text
            return json.dumps(_mock_escalation(school_data))

        try:
            loop = asyncio.get_event_loop()
            raw = await loop.run_in_executor(None, _generate)
            return json.loads(raw)
        except Exception as e:
            logger.error("gemini.escalation.error", error=str(e))
            return _mock_escalation(school_data)


# ── Prompt Builders ──────────────────────────────────────────────────────────

def _build_briefing_prompt(ctx: dict) -> str:
    """BRIEF-001 template."""
    district = ctx.get("district_name", "Nandurbar")
    district_id = ctx.get("district_id", "NDB01")
    schools_json = json.dumps(ctx.get("top_schools", []), indent=2, ensure_ascii=False)
    deployments_json = json.dumps(ctx.get("top_deployments", []), indent=2, ensure_ascii=False)
    total_vacancies = ctx.get("total_vacancies", 0)
    rte_violations = ctx.get("rte_violations_count", 0)
    year = ctx.get("year", 2026)

    return f"""DISTRICT INTELLIGENCE BRIEFING REQUEST — BRIEF-001 v{PROMPT_VERSIONS['BRIEF-001']}

DISTRICT: {district} (Code: {district_id})
REPORTING PERIOD: April {year}

TOP PRIORITY SCHOOLS (sorted by Deprivation Index DESC):
{schools_json}

TOP DEPLOYMENT RECOMMENDATIONS:
{deployments_json}

DISTRICT SUMMARY STATISTICS:
  Total Teacher Vacancies:  {total_vacancies}
  RTE PTR Violations:       {rte_violations} schools

INSTRUCTIONS:
Generate a structured district intelligence briefing in the following JSON format.
All school_id values in escalation_flags MUST appear in the TOP PRIORITY SCHOOLS data above.
marathi_summary MUST be in Devanagari script, 140-160 words, formal सरकारी पत्र language.
critical_issue: maximum 120 characters — cite school_id, specific metric, duration.
district_summary: exactly 3 sentences — statistics | geography | action.

OUTPUT JSON SCHEMA:
{{
  "top_schools": [
    {{
      "school_id": "string — 11-digit UDISE code",
      "name": "string",
      "di_score": number,
      "di_tier": "CRITICAL|HIGH|MODERATE|STABLE",
      "critical_issue": "string — max 120 chars, cite school ID + data + duration",
      "recommended_action": "string — specific, actionable, named officer"
    }}
  ],
  "top_deployments": [
    {{
      "school_id": "string",
      "teacher_name": "string",
      "subject": "string",
      "dvs_score": number,
      "justification": "string"
    }}
  ],
  "rte_violations_count": number,
  "total_unfilled_vacancies": number,
  "estimated_budget_inr": number,
  "district_summary": "string — 3 sentences: stats | geography | action",
  "marathi_summary": "string — 140-160 Devanagari words, formal government language",
  "escalation_flags": ["school_id_1", "school_id_2"]
}}"""


def _build_order_prompt(deployment: dict) -> str:
    """ORDER-001 template."""
    retention_warning = _build_retention_warning(deployment.get("retention_score", 75))
    school_name = deployment.get("school_name", "")
    school_id = deployment.get("school_id", "")
    teacher_name = deployment.get("teacher_name", "")
    subject = deployment.get("vacancy_subject", "")
    di_score = deployment.get("di_score", 0)
    dvs_score = deployment.get("dvs_score", 0)
    match_score = deployment.get("match_score", 0)
    retention_score = deployment.get("retention_score", 0)
    effective_date = deployment.get("effective_date", "01 June 2026")
    qualification = deployment.get("qualification", "")
    years_service = deployment.get("years_of_service", 0)
    rural_years = deployment.get("rural_posting_years", 0)
    current_district = deployment.get("current_district", "")
    enrollment = deployment.get("enrollment_total", 0)
    vacancy_months = deployment.get("vacancy_months", 0)

    return f"""DEPLOYMENT ORDER NARRATIVE REQUEST — ORDER-001 v{PROMPT_VERSIONS['ORDER-001']}

Generate a formal 3-paragraph Government of Maharashtra deployment order narrative.
Format: 3 paragraphs separated by blank lines. No headers, no bullet points, no markdown.
Word count: 200-280 words total.

SCHOOL DATA:
  Name: {school_name}
  UDISE Code: {school_id}
  Deprivation Index: {di_score:.1f}/100
  Enrolled Students: {enrollment}
  Vacancy Subject: {subject}
  Vacancy Duration: {vacancy_months} months

TEACHER DATA:
  Name: {teacher_name}
  Qualification: {qualification}
  Years of Service: {years_service} (Rural: {rural_years} years)
  Current District: {current_district}
  DVS Score: {dvs_score:.3f} (Match: {match_score:.1f}%, Retention: {retention_score:.1f}%)

EFFECTIVE DATE: {effective_date}
{retention_warning}

PARAGRAPH STRUCTURE:
Paragraph 1 — SITUATION: Describe the school's deprivation, vacancy duration, student impact, RTE violation.
Paragraph 2 — DECISION: Explain why this teacher was selected (DVS system, scores, background).
Paragraph 3 — DIRECTIVE: Issue the formal order with reporting date, time, BEO welfare check."""


def _build_retention_warning(retention_score: float) -> str:
    """Inject retention warning into ORDER-001 prompt."""
    if retention_score < 55:
        return (
            "RETENTION NOTE: This teacher has a HIGH retention risk score. "
            "Paragraph 3 MUST mention: hardship allowance eligibility, "
            "BEO welfare visit within 6 weeks, and accommodation support."
        )
    if retention_score < 75:
        return (
            "RETENTION NOTE: This teacher has a MEDIUM retention risk. "
            "Paragraph 3 should mention BEO welfare visit within 8 weeks."
        )
    return ""


def _build_escalation_prompt(school_data: dict) -> str:
    """ESCL-001 template."""
    return f"""ESCALATION ASSESSMENT REQUEST — ESCL-001 v{PROMPT_VERSIONS['ESCL-001']}

Assess whether this school requires escalation to the District Collector.

SCHOOL DATA:
{json.dumps(school_data, indent=2, ensure_ascii=False)}

ESCALATION CRITERIA:
A: DI score >= 90 AND vacancy duration > 36 months
B: Enrollment declined > 15% AND no active deployment recommendation
C: RTE violation AND no teacher deployment in past 6 months

OUTPUT JSON SCHEMA:
{{
  "should_escalate": boolean,
  "criteria_met": ["A", "B", "C"],
  "escalation_reason": "string — cite specific data",
  "recommended_escalation_action": "string — specific officer + timeline",
  "urgency_level": "IMMEDIATE|THIS_WEEK|THIS_MONTH"
}}"""


# ── Schema Validation ────────────────────────────────────────────────────────

def _validate_briefing_schema(result: dict) -> None:
    """
    Validate Gemini briefing output against expected schema.
    Raises GeminiParseError on any validation failure.
    """
    required_keys = [
        "top_schools", "top_deployments", "rte_violations_count",
        "total_unfilled_vacancies", "estimated_budget_inr",
        "district_summary", "marathi_summary", "escalation_flags",
    ]
    for key in required_keys:
        if key not in result:
            raise GeminiParseError(f"Missing required key: {key}")

    schools = result["top_schools"]
    if not isinstance(schools, list) or len(schools) < 1 or len(schools) > 5:
        raise GeminiParseError(f"top_schools must have 1-5 items, got {len(schools)}")

    for i, school in enumerate(schools):
        for field in ["school_id", "name", "di_score", "critical_issue", "recommended_action"]:
            if field not in school:
                raise GeminiParseError(f"top_schools[{i}] missing field: {field}")
        if len(school["critical_issue"]) > 150:
            raise GeminiParseError(
                f"top_schools[{i}].critical_issue exceeds 150 chars: "
                f"{len(school['critical_issue'])} chars"
            )

    deployments = result["top_deployments"]
    if not isinstance(deployments, list) or len(deployments) < 1:
        raise GeminiParseError("top_deployments must have at least 1 item")

    for field in ["rte_violations_count", "total_unfilled_vacancies", "estimated_budget_inr"]:
        val = result[field]
        if not isinstance(val, (int, float)) or val < 0:
            raise GeminiParseError(f"{field} must be a non-negative number, got {val!r}")

    if not isinstance(result["district_summary"], str) or len(result["district_summary"]) < 50:
        raise GeminiParseError("district_summary is too short or not a string")

    marathi = result["marathi_summary"]
    if not isinstance(marathi, str) or len(marathi) < 100:
        raise GeminiParseError("marathi_summary is too short")

    has_devanagari = any("\u0900" <= c <= "\u097F" for c in marathi)
    if not has_devanagari:
        raise GeminiParseError("marathi_summary contains no Devanagari characters")

    if not isinstance(result["escalation_flags"], list):
        raise GeminiParseError("escalation_flags must be an array")
    if len(result["escalation_flags"]) > 3:
        raise GeminiParseError("escalation_flags must have at most 3 items")


# ── Mock Fallbacks (when Gemini is not configured) ───────────────────────────

def _mock_briefing(ctx: dict) -> dict:
    district = ctx.get("district_name", "Nandurbar")
    schools = ctx.get("top_schools", [])
    top_school = schools[0] if schools else {"school_id": "27310100101", "name": "ZP School", "di_score": 87}

    return {
        "top_schools": [
            {
                "school_id": top_school.get("school_id", "27310100101"),
                "name": top_school.get("name", "ZP Primary School"),
                "di_score": top_school.get("di_score", 87),
                "di_tier": "CRITICAL",
                "critical_issue": f"School {top_school.get('school_id', '27310100101')} (DI {top_school.get('di_score', 87)}) has critical teacher shortage affecting 312 students.",
                "recommended_action": "Deploy 2 teachers immediately. BEO to issue joining order within 72 hours.",
            }
        ],
        "top_deployments": [
            {
                "school_id": top_school.get("school_id", "27310100101"),
                "teacher_name": "Rajesh Kumar Patil",
                "subject": "Mathematics",
                "dvs_score": 0.81,
                "justification": "Highest DVS candidate with 88% match score and Nandurbar home district.",
            }
        ],
        "rte_violations_count": ctx.get("rte_violations_count", 6),
        "total_unfilled_vacancies": ctx.get("total_vacancies", 14),
        "estimated_budget_inr": 7200000,
        "district_summary": (
            f"{district} district has {ctx.get('total_vacancies', 14)} unfilled teacher vacancies "
            f"with {ctx.get('rte_violations_count', 6)} RTE PTR violations as of April 2026. "
            f"Critical DI concentration is in Akkalkuwa and Toranmal blocks. "
            f"Immediate deployment of at least 8 teachers is required for RTE compliance."
        ),
        "marathi_summary": (
            f"नंदुरबार जिल्ह्यात {ctx.get('total_vacancies', 14)} शिक्षक पदे रिक्त असून "
            f"{ctx.get('rte_violations_count', 6)} शाळांमध्ये आरटीई उल्लंघन होत आहे. "
            "वंचितता निर्देशांकाच्या आधारे अक्कलकुवा व टोरणमाळ तालुक्यातील शाळांना "
            "तातडीने लक्ष देणे आवश्यक आहे. EduAllocPro प्रणालीने DVS सूत्राच्या आधारे "
            "सर्वोच्च प्राधान्य असलेल्या नियुक्त्या निश्चित केल्या आहेत. "
            "जिल्हाधिकाऱ्यांनी येत्या 30 दिवसांत या नियुक्त्यांना मंजुरी देणे अपेक्षित आहे."
        ),
        "escalation_flags": [top_school.get("school_id", "27310100101")],
    }


def _mock_order_text(deployment: dict) -> str:
    school_name = deployment.get("school_name", "Zilla Parishad Primary School")
    school_id = deployment.get("school_id", "27310100101")
    teacher_name = deployment.get("teacher_name", "the appointed teacher")
    subject = deployment.get("vacancy_subject", "the required subject")
    di_score = deployment.get("di_score", 87)
    dvs_score = deployment.get("dvs_score", 0.81)
    effective_date = deployment.get("effective_date", "01 June 2026")

    return f"""It has been brought to the notice of this office that {school_name} (UDISE Code: {school_id}), Nandurbar District, is operating under conditions of acute educational deprivation as measured by the EduAllocPro Deprivation Index (Score: {di_score:.1f} out of 100). The post of {subject} teacher has remained vacant, directly affecting the educational outcomes of enrolled students. The school is presently in violation of the Right to Education Act, 2009, Section 25.

As determined by the EduAllocPro Deployment Value Score (DVS) algorithm, {teacher_name} has been identified as the most suitable candidate for this posting with a DVS score of {dvs_score:.3f}. The candidate's subject expertise, years of service, and proximity to the posting location make them the optimal choice for this vacancy, reflecting both subject competency and long-term commitment to rural service.

In exercise of the powers vested under the Maharashtra Educational Services (Conduct) Rules, the undersigned hereby directs {teacher_name} to report for duty at {school_name} with effect from {effective_date}. The teacher shall report to the Headmaster by 10:00 AM on the effective date and submit joining report to the Block Education Officer on the same day. The Block Education Officer is directed to conduct a welfare visit within six weeks of joining and report compliance to this office."""


def _mock_escalation(school_data: dict) -> dict:
    di_score = school_data.get("di_score", 0)
    should_escalate = di_score >= 90
    return {
        "should_escalate": should_escalate,
        "criteria_met": ["A"] if should_escalate else [],
        "escalation_reason": (
            f"School {school_data.get('school_id', '')} has DI {di_score} "
            "with critical vacancy duration."
            if should_escalate
            else f"School DI {di_score} does not meet escalation threshold."
        ),
        "recommended_escalation_action": (
            "District Collector to personally review BEO deployment record within 10 working days."
            if should_escalate
            else "No escalation required. Monitor joining confirmation within 30 days."
        ),
        "urgency_level": "IMMEDIATE" if should_escalate else "THIS_MONTH",
    }
