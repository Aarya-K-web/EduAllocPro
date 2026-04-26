# EduAllocPro — Project Rules
## School Intelligence & Teacher Deployment Platform
**Hackathon:** Build with AI — Hack2Skill 2026 | **Domain:** Smart Resource Allocation

---

## 1. Project Identity

| Field | Value |
|-------|-------|
| Project | EduAllocPro |
| Stack | Python 3.11 + FastAPI (backend) · React 18 + Vite + Tailwind (frontend) |
| AI APIs | Vertex AI Embeddings · Gemini 1.5 Pro · Google OR-Tools · Cloud Translation |
| Data | Google BigQuery (edualloc_dataset) · UDISE+ CSV · Synthetic Teacher DB |
| Deploy | Cloud Run (backend) · Vercel (frontend) |
| Pilot | Nandurbar District, Maharashtra — real UDISE+ data |
| Phase | Phase 1 MVP — 72-hour hackathon sprint |

---

## 2. Repository Structure

```
edualloc-pro/
├── backend/
│   ├── api/
│   │   ├── main.py              # FastAPI app factory + lifespan
│   │   ├── deps.py              # Shared FastAPI dependencies
│   │   └── routes/
│   │       ├── schools.py       # GET /api/schools, /api/schools/{id}
│   │       ├── teachers.py      # GET /api/teachers
│   │       ├── deploy.py        # GET /api/deploy/matches, POST /api/deploy/optimize
│   │       ├── briefing.py      # GET /api/briefing, POST /api/briefing/order
│   │       └── health.py        # GET /api/health
│   ├── ai/
│   │   ├── deprivation.py       # Deprivation Index engine (8 UDISE signals)
│   │   ├── matching.py          # Vertex AI Embeddings teacher-school matching
│   │   ├── retention.py         # Retention risk proxy scorer
│   │   ├── optimizer.py         # OR-Tools CP-SAT district-wide optimizer
│   │   ├── gemini.py            # Gemini briefing + deployment order generation
│   │   └── embeddings_cache.py  # Thread-safe in-memory embedding cache
│   ├── data/
│   │   ├── ingest_udise.py      # UDISE CSV → BigQuery pipeline
│   │   ├── gen_teachers.py      # Synthetic teacher profile generator
│   │   └── geocode.py           # Google Maps batch geocoding
│   ├── services/
│   │   ├── bigquery_client.py   # BQ async client (ThreadPoolExecutor)
│   │   ├── vertex_client.py     # Vertex AI Embeddings wrapper
│   │   ├── gemini_client.py     # Gemini API + JSON schema enforcement
│   │   └── maps_client.py       # Distance Matrix + Geocoding
│   ├── models/
│   │   ├── school.py            # SchoolSummary, SchoolDetail, DIBreakdown
│   │   ├── teacher.py           # Teacher, TeacherProfile
│   │   ├── deployment.py        # TeacherMatch, Assignment, DVScore
│   │   └── errors.py            # EduAllocError hierarchy
│   ├── utils/
│   │   ├── di_formula.py        # Pure DI computation (no I/O)
│   │   ├── dvs_formula.py       # DVS = DI*0.40 + Match*0.35 + Ret*0.25
│   │   ├── rte_check.py         # RTE PTR compliance checker
│   │   └── pdf_generator.py     # ReportLab deployment order PDF
│   └── tests/
│       ├── unit/                # Pure function tests — no mocking needed
│       └── integration/         # API tests with mocked external services
├── frontend/
│   └── src/
│       ├── components/          # DIBadge, DVSMeter, SchoolCard, TeacherMatchCard
│       ├── pages/               # Dashboard, SchoolDetail, Deploy, Briefing, BEODashboard
│       ├── hooks/               # useSchools, useDeployment, useBriefing
│       ├── lib/                 # motion.js, diColors.js, mapMarkers.js
│       └── i18n/locales/        # en.json, mr.json (Marathi translations)
├── CLAUDE.md                    # ← You are here
└── docker-compose.yml
```

---

## 3. Core Domain Concepts

Before writing any code, understand these concepts. Use these exact terms everywhere.

### 3.1 The Four AI Pipelines

```
Pipeline     Module              Output
─────────────────────────────────────────────────────────────────
L2  DI       ai/deprivation.py   di_score 0-100 per school
L3  Match    ai/matching.py      match_score 0-100 per teacher-school pair
L4  Retain   ai/retention.py     retention_score 0-100 per teacher-posting pair
L5  Optimize ai/optimizer.py     list[Assignment] — district-wide deployment plan
```

### 3.2 The DVS Formula — Never Modify Without Discussion

```python
DVS = (DI / 100) * 0.40 + (match_score / 100) * 0.35 + (retention_score / 100) * 0.25
```

- DI weight 0.40 — equity (most deprived schools get priority)
- Match weight 0.35 — efficiency (best subject fit)
- Retention weight 0.25 — sustainability (teacher stays long-term)

### 3.3 DI Signal Weights — Do Not Change Without Explicit Instruction

```python
DI_WEIGHTS = {
    'stu_tea_ratio':    0.25,
    'subject_vacancy':  0.20,
    'toilet':           0.15,
    'electricity':      0.10,
    'classroom_ratio':  0.10,
    'urban_distance':   0.08,
    'enrollment_trend': 0.07,
    'aser_proxy':       0.05,
}
# These weights sum to 1.0. Verify with: assert abs(sum(DI_WEIGHTS.values()) - 1.0) < 1e-9
```

### 3.4 OR-Tools Hard Constraints — All Four Are Non-Negotiable

1. Each teacher assigned to at most 1 school per cycle
2. Each vacancy receives at most 1 teacher
3. Teacher subject must match vacancy subject
4. Commute ≤ 80km unless `teacher.long_dist_consent = True`

### 3.5 Key Identifiers

- `school_id` — 11-digit UDISE code, **always STRING**, never cast to INT
- `teacher_id` — UUID v4 (synthetic) or HRMS employee ID (Phase 2)
- `deployment_id` — UUID v4
- `district_code` — 5-char Census code, e.g. `NDB01` for Nandurbar

---

## 4. Tech Stack Rules

### 4.1 Python Backend

```python
# Always use — non-negotiable
python_version = "3.11+"
async_framework = "FastAPI"
server         = "uvicorn"
validation     = "pydantic v2"     # ALL data validation — no raw dicts
logging        = "structlog"       # JSON structured — never print() or logging.debug()
bq_client      = "google-cloud-bigquery"
vertex_sdk     = "google-cloud-aiplatform"
gemini_sdk     = "google-generativeai"
optimizer      = "ortools"         # cp_model only — no LP solver
pdf            = "reportlab"
type_hints     = "required on ALL function signatures"
```

**Forbidden in backend:**
- `print()` — use `structlog.get_logger().info()`
- Raw `dict` access with `d['key']` — use `d.get('key', default)`
- `SELECT *` in BigQuery queries — always name columns
- Hardcoded API keys — always read from `os.environ`
- Importing `google.cloud.bigquery` directly in `ai/` modules
- Synchronous BigQuery calls in async route handlers

### 4.2 React Frontend

```javascript
// Always use
framework    = "React 18 + Vite"
styling      = "Tailwind CSS"
maps         = "@react-google-maps/api"
charts       = "recharts"
animation    = "framer-motion"
i18n         = "react-i18next"     // English + Marathi toggle
pdf_client   = "@react-pdf/renderer"
fonts        = "Inter (EN) + Noto Sans Devanagari (MR) + JetBrains Mono (numbers)"
```

**Frontend forbidden:**
- Inline styles for colors — use Tailwind classes or CSS custom properties
- Hardcoded color hex values outside `globals.css` or `tailwind.config.js`
- `navigate()` away from the map to show school detail — use slide panel
- Any spinner component — use skeleton loaders
- `localStorage` for anything except language preference

### 4.3 BigQuery Patterns

```python
# ALWAYS parameterized queries — never f-string SQL
job_config = bigquery.QueryJobConfig(query_parameters=[
    bigquery.ScalarQueryParameter('district_id', 'STRING', district_id),
])
# ALWAYS run BQ calls in ThreadPoolExecutor — never block the event loop
async def _run(self, fn, *args):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(self._pool, lambda: fn(*args))
```

---

## 5. Code Style & Conventions

### 5.1 Python

```python
# Naming
function_name    = snake_case        # compute_di_for_district()
class_name       = PascalCase        # BigQueryClient, SchoolDetail
constant_name    = UPPER_SNAKE_CASE  # DI_WEIGHTS, DVS_WEIGHTS
module_name      = snake_case        # deprivation.py, bigquery_client.py

# Docstrings — required on all public functions
def compute_deprivation_index(school: UDISESchoolData) -> dict:
    """
    Compute composite Deprivation Index from 8 UDISE signals.
    Returns dict with all 8 signal scores + composite_di key.
    Pure function — no I/O, no side effects.
    """

# Logging pattern — always bind context first
log = logger.bind(district_id=district_id, fn='compute_di_for_district')
log.info('di.compute.start')
log.info('di.compute.done', count=len(rows))   # structured data, not f-strings
log.error('vertex.embed.error', error=str(e))  # always log error=str(e)

# Error handling — always specific, never bare except
try:
    result = await vertex.embed([teacher_str])
except VertexRateLimitError as e:
    log.warning('vertex.rate_limit', retry_after=e.retry_after)
    raise
except GoogleAPIError as e:
    log.error('vertex.api_error', error=str(e))
    raise EduAllocError('Vertex AI unavailable', 'VERTEX_ERROR', 502)
```

### 5.2 JavaScript / React

```javascript
// Naming
componentName    = PascalCase        // SchoolCard, DVSMeter
hookName         = camelCase         // useSchools, useDeployment
utilFunction     = camelCase         // getDIColor, buildMarkerSVG
constantName     = UPPER_SNAKE_CASE  // DI_CONFIG, DVS_WEIGHTS
cssVariable      = --kebab-case      // --di-critical, --brand

// Component structure — always this order
// 1. Imports
// 2. Type/constant definitions
// 3. Component function
// 4. Internal sub-components (if any)
// 5. Export

// Always destructure props
const SchoolCard = ({ school, onClick }) => { ... }

// Never use index as key in lists
schools.map(s => <SchoolCard key={s.school_id} school={s} />)

// Always handle loading + error states
if (loading) return <SkeletonCard />
if (error)   return <ErrorMessage message={error.message} />
```

### 5.3 File Naming

```
Python files:   snake_case.py         (deprivation.py, bigquery_client.py)
React pages:    PascalCase.jsx         (Dashboard.jsx, SchoolDetail.jsx)
React components: PascalCase.jsx       (SchoolCard.jsx, DVSMeter.jsx)
React hooks:    useKebabCase.js        (useSchools.js, useDeployment.js)
Utility files:  kebab-case.js          (di-colors.js, map-markers.js)
Test files:     test_snake_case.py     (test_deprivation.py)
```

---

## 6. Module Responsibility Rules

**These are the most important rules. Violations cause tight coupling.**

| Layer | Does | Does NOT |
|-------|------|----------|
| `api/routes/` | Validate HTTP params, call service/AI, format response | Call BigQuery/Vertex AI directly |
| `ai/` | Run AI computation | Handle HTTP exceptions, call BigQuery directly |
| `services/` | Wrap external APIs with retry/timeout | Contain business logic |
| `models/` | Pydantic schemas | Import from `ai/` or `services/` |
| `utils/` | Pure functions, zero I/O | Any external API calls |
| `data/` | One-time setup scripts | Be imported by `api/` or `ai/` |

---

## 7. BigQuery Schema Reference

### Core Tables

```
schools         — UDISE+ school data + DI scores
teachers        — Teacher profiles (synthetic Phase 1)
deployments     — OR-Tools assignments + approval status
briefings       — Gemini weekly district briefings
commute_cache   — Pre-computed Maps Distance Matrix results
override_audit  — Immutable officer override log
```

### Critical Schema Rules

```sql
-- school_id is ALWAYS STRING — 11-digit UDISE code
-- Never: WHERE CAST(school_id AS INT64) = 27031001001
-- Always: WHERE school_id = '27031001001'

-- Cluster key for all school queries
-- WHERE district_code = @district_id    ← triggers cluster pruning
-- ORDER BY di_score DESC NULLS LAST     ← cluster key order

-- DI score may be NULL for newly ingested schools
-- Always: WHERE di_score IS NOT NULL    ← before ranking
-- Or:     ORDER BY di_score DESC NULLS LAST

-- Never commit is_synthetic=FALSE records to Phase 1 tables
-- All Phase 1 teachers: is_synthetic = TRUE
```

### Key Queries

```python
# Schools for dashboard — most common query
GET /api/schools?district_id=NDB01&limit=50
# → WHERE district_code = @district_id ORDER BY di_score DESC LIMIT 50

# Teacher candidates — pre-filter by subject before embedding comparison
# → WHERE @vacancy_subject IN UNNEST(JSON_VALUE_ARRAY(subject_specialization))

# Optimizer input — vacancies + commute cache
# → Two queries: schools with vacancies + commute_cache for those pairs
```

---

## 8. AI Pipeline Implementation Rules

### 8.1 Deprivation Index

```python
# Location: backend/utils/di_formula.py (PURE FUNCTIONS)
# Location: backend/ai/deprivation.py (BQ I/O wrapper)
# Rule: Pure scoring functions in utils/ — ZERO I/O
# Rule: Di formula assertion must always be present:
assert abs(sum(DI_WEIGHTS.values()) - 1.0) < 1e-9

# Null handling rule: if school missing >3 of 8 signals:
# → Set di_score = NULL, di_data_quality = 'INSUFFICIENT_DATA'
# → Do NOT skip the school — it still appears in dashboard (sorted last)
```

### 8.2 Teacher Matching

```python
# Location: backend/ai/matching.py
# Vertex AI model: textembedding-gecko@003

# Teacher embedding string format:
# "{subjects} | {qualification} | {district} | {languages} | {years}yr service {rural}yr rural"
# Example: "PHY CHM | MSc BEd | Nashik | mr hi | 8yr service 3yr rural"

# School need embedding string format:
# "{vacancy_subject} | Grade {grade_range} | Rural {rural_score} | {district}"
# Example: "PHY CHM | Grade 6-10 | Rural 87 | Nandurbar"

# Hard distance constraint — ALWAYS enforce:
if distance_km > 80 and not teacher.long_dist_consent:
    continue  # Hard reject — do not include in results

# Always use cache before calling Vertex AI:
vec = cache.get(teacher_id)
if vec is None:
    vec = await vertex.embed([teacher_str])
    cache.set(teacher_id, vec)
```

### 8.3 OR-Tools Optimizer

```python
# Location: backend/ai/optimizer.py
# Time limit: ALWAYS set — never let solver run indefinitely
solver.parameters.max_time_in_seconds = 20

# Integer scaling for objective — OR-Tools works with integers only
SCALE = 1000
dvs_int = int(dvs * mult * SCALE)

# On timeout — return partial result with OptimizerTimeoutError
# NEVER raise an exception that returns 4xx or 5xx on timeout
# Return status='FEASIBLE' with what was found within time limit
```

### 8.4 Gemini Integration

```python
# Location: backend/ai/gemini.py + backend/services/gemini_client.py
# Model: gemini-1.5-pro (NOT flash — quality matters for government briefings)
# Temperature: 0.3 for briefings (factual), 0.6 for order narrative

# ALWAYS enforce JSON schema:
generation_config=GenerationConfig(
    temperature=0.3,
    max_output_tokens=2048,
    response_mime_type='application/json',
)

# ALWAYS validate Gemini output against schema before returning:
try:
    result = json.loads(response.text)
    _validate_briefing_schema(result)  # Raises GeminiParseError if invalid
except (json.JSONDecodeError, KeyError) as e:
    raise GeminiParseError(f'Schema validation failed: {e}')

# NEVER return raw Gemini text directly to the frontend
```

---

## 9. Frontend Implementation Rules

### 9.1 Color System — Always Use These Tokens

```css
/* DI urgency colors — use for ALL DI score representations */
--di-critical: #E11D48;   /* DI 80-100 */
--di-high:     #D97706;   /* DI 60-79  */
--di-moderate: #2563EB;   /* DI 40-59  */
--di-stable:   #059669;   /* DI 0-39   */

/* Never invent new urgency colors */
/* Never use red for anything other than DI critical */
```

### 9.2 Map Rules

```javascript
// The map ALWAYS stays visible — never navigate away
// School detail opens as a slide panel OVER the map
// Map options required:
const MAP_OPTIONS = {
    disableDefaultUI: true,
    clickableIcons: false,
    gestureHandling: 'greedy',  // single-finger pan on mobile
}

// Marker click — slide panel, not navigation:
marker.addListener('click', () => {
    setSelectedSchool(school.id)  // opens SchoolDetailPanel
    map.panTo(marker.position)    // centers map — does NOT navigate
})
```

### 9.3 Marathi Language Rules

```javascript
// Language toggle is a first-class feature — not a nice-to-have
// BEO role defaults to Marathi — always set in setDefaultLangForRole()
// Devanagari needs more line height:
.lang-mr { --body-line-height: 1.85; }
// Number values (DI scores, DVS) always render in Latin numerals
// even when Marathi mode is active — use font-family: 'JetBrains Mono'
```

### 9.4 Loading States

```javascript
// NEVER use spinner components
// ALWAYS use skeleton loaders for async content
// ALWAYS show optimistic UI for deployment approval
// Skeleton pattern:
if (loading) return <SkeletonCard count={5} />
```

---

## 10. Testing Rules

```python
# Unit tests — backend/tests/unit/
# Rule: Every function in utils/ must be tested
# Rule: Boundary conditions required: perfect score, worst score, null input
# Rule: Zero external API calls in unit tests — they are pure functions

# Integration tests — backend/tests/integration/
# Rule: Mock BigQuery, Vertex AI, Gemini, Maps API
# Rule: Test at least one happy-path per endpoint
# Rule: Test missing required params → 422 response
# Rule: Test unauthorized request → 401 response

# Run tests:
# cd backend && pytest tests/ -v
# Target: all tests pass in < 30 seconds
```

---

## 11. Environment Variables

```bash
# backend/.env — NEVER commit this file
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_API_KEY=your-gemini-key        # from aistudio.google.com
MAPS_API_KEY=your-maps-key
VERTEX_AI_LOCATION=us-central1
BQ_DATASET=edualloc_dataset
UDISE_CSV_PATH=./data/sample/udise_nandurbar.csv
TEACHER_CSV_PATH=./data/sample/teachers_synth.csv

# frontend/.env — NEVER commit this file
VITE_API_URL=https://edualloc-api-xyz.run.app
VITE_MAPS_API_KEY=your-maps-key
VITE_FIREBASE_CONFIG={"projectId":"..."}
```

```bash
# .gitignore — these must ALWAYS be present
.env
.env.local
*.env
**/.env
**/secrets/
service-account-key.json
```

---

## 12. API Contract Reference

```
Method  Endpoint                  Auth Required   Description
───────────────────────────────────────────────────────────────────────
GET     /api/health               No              Liveness probe
GET     /api/schools              Yes (officer)   List schools by district, sorted by DI
GET     /api/schools/{id}         Yes (officer)   Full school detail + DI breakdown
GET     /api/teachers             Yes (officer)   List teachers in district
GET     /api/deploy/matches       Yes (officer)   Top-5 teacher matches for a vacancy
POST    /api/deploy/optimize      Yes (collector) Run OR-Tools optimizer for district
GET     /api/briefing             Yes (officer)   Gemini weekly briefing JSON
POST    /api/briefing/order       Yes (officer)   Generate deployment order PDF
```

### Response Shape Rules

```python
# ALWAYS use Pydantic response_model on every route
@router.get('/schools', response_model=SchoolListResponse)  # Never return raw dict

# Error responses — always this shape:
{"error": "ERROR_CODE", "message": "Human readable message", "partial_result": false}

# Partial success (OR-Tools timeout) — HTTP 200 with:
{"assignments": [...], "status": "FEASIBLE", "solver_time_s": 20.0}
# NEVER return 408 or 500 for optimizer timeout — partial result IS a valid result
```

---

## 13. Deployment Configuration

```dockerfile
# Cloud Run requirements:
# --min-instances 1         CRITICAL: prevents cold start during demo
# --memory 2Gi              OR-Tools + embeddings cache needs this
# --timeout 120             OR-Tools 20s + Gemini 15s + buffer
# --concurrency 10          Single worker — state shared in app.state

# Vercel requirements:
# Environment variables set in Vercel dashboard (not in vercel.json)
# SPA routing: { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

---

## 14. Hackathon Phase 1 Checklist

When I say "Phase 1 is complete", verify all of these:

- [ ] UDISE Nandurbar CSV loaded in BigQuery `schools` table
- [ ] DI scores computed for all Nandurbar schools (`di_score` not null)
- [ ] 300 synthetic teacher profiles in BigQuery `teachers` table
- [ ] Teacher embeddings computed and cached (`embedding` not null)
- [ ] All schools geocoded (`geocode_status = 'OK'` for >90%)
- [ ] `/api/schools?district_id=NDB01` returns schools sorted by DI
- [ ] `/api/deploy/matches` returns 5 teachers with scores for a vacancy
- [ ] `/api/deploy/optimize` returns optimized assignments for Nandurbar
- [ ] `/api/briefing` returns valid JSON with marathi_summary field
- [ ] `/api/briefing/order` streams a PDF with school + teacher data
- [ ] React dashboard shows school heatmap on Google Maps
- [ ] School cards sorted by DI with colour-coded badges
- [ ] Teacher match cards show DVS meter breakdown
- [ ] English ↔ Marathi language toggle works on all UI text
- [ ] Download deployment order PDF button works
- [ ] Dashboard loads in < 4 seconds on fresh visit
- [ ] Cloud Run deployed with min-instances=1
- [ ] Vercel deployed with live URL
- [ ] GitHub repo public, no `.env` committed, README complete

---

## 15. What Claude Should Always Do

1. **Read module responsibility rules before generating any code.** AI code belongs in `ai/`, HTTP code in `api/routes/`, client code in `services/`.

2. **Never modify DI weights or DVS formula without explicit instruction.** These are domain decisions, not engineering decisions.

3. **Always add structlog logging** to every async function that calls an external service. Pattern: `log = logger.bind(...)` then `log.info('event.name', key=value)`.

4. **Always use parameterized BigQuery queries.** Never build SQL with f-strings or string concatenation.

5. **Always handle the Gemini output validation step.** Never return Gemini text directly to the frontend without JSON schema validation.

6. **Always enforce the 80km commute constraint** in the matching engine. This is a hard constraint — not a preference.

7. **Always add `is_data_stale` indicator** when returning school data to the frontend. UDISE data is 12-18 months old — this must be visible.

8. **When generating frontend components**, always include the Marathi text label in the i18n JSON files alongside the component.

9. **When writing tests**, always include a boundary condition test (score = 0, score = 100, input = None) for every scoring function.

10. **When deploying to Cloud Run**, always include `--min-instances 1` in the deploy command. A cold start during the demo is a demo failure.

---

## 16. What Claude Should Never Do

1. **Never generate a migration that deletes data** from `override_audit`. This table is append-only and immutable.

2. **Never make teacher personal data (name, address, date_of_birth) appear in log output.** Log only `teacher_id`.

3. **Never add a spinner to the frontend.** Skeleton screens only.

4. **Never navigate away from the map view.** School detail is always a slide panel.

5. **Never use `SELECT *` in BigQuery queries.** Always name required columns.

6. **Never return a 5xx error when OR-Tools hits the time limit.** Return partial result with `status: 'FEASIBLE'`.

7. **Never call Vertex AI for the same `teacher_id` if it's in the embeddings cache.** Always check cache first.

8. **Never modify the `SCALE = 1000` constant in `optimizer.py`** without verifying all integer DVS calculations remain valid.

9. **Never suggest using a different AI model than `textembedding-gecko@003`** for teacher-school embeddings. Model consistency is required for cached vector reuse.

10. **Never commit or suggest committing `.env` files, service account JSON keys, or API keys** in any form.

---

*EduAllocPro — Build with AI Hackathon 2026 — Hack2Skill*
*Last updated: April 2026*
