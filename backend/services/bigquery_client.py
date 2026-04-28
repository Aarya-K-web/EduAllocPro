"""
EduAllocPro — BigQuery Client
Async wrapper around google-cloud-bigquery using ThreadPoolExecutor.
ALL queries are parameterized — never f-string SQL.
school_id is always STRING — never cast to INT.
"""
import asyncio
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from typing import Any, Optional

import structlog

logger = structlog.get_logger()

# Lazy import to avoid hard dependency when BQ is not configured
try:
    from google.cloud import bigquery
    BQ_AVAILABLE = True
except ImportError:
    BQ_AVAILABLE = False


class BigQueryClient:
    """Async BigQuery client using ThreadPoolExecutor for non-blocking calls."""

    def __init__(self, project_id: str, dataset: str) -> None:
        self._project_id = project_id
        self._dataset = dataset
        self._pool = ThreadPoolExecutor(max_workers=4)
        self._client = None
        if BQ_AVAILABLE and project_id:
            try:
                self._client = bigquery.Client(project=project_id)
            except Exception as e:
                logger.warning("bq.init.failed", error=str(e))

    @classmethod
    def from_env(cls) -> "BigQueryClient":
        from config import config
        return cls(project_id=config.gcp_project, dataset=config.bq_dataset)

    async def _run(self, fn, *args) -> Any:
        """Run a synchronous BQ call in the thread pool — never blocks event loop."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self._pool, lambda: fn(*args))

    def _table(self, name: str) -> str:
        return f"`{self._project_id}.{self._dataset}.{name}`"

    async def initialize(self) -> None:
        """Initialize the client and ensure dataset/tables exist."""
        try:
            from google.cloud import bigquery
            import os
            import json
            import tempfile

            # Task 4 fix: Support direct JSON string from env var
            json_str = os.environ.get("GCP_SERVICE_ACCOUNT_JSON")
            if json_str:
                logger.info("bq.init.using_env_json")
                with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
                    f.write(json_str)
                    temp_path = f.name
                os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = temp_path
            
            self._client = bigquery.Client(project=self._project_id)
            await self.ensure_tables_exist()
            logger.info("bq.init.ok", project=self._project_id, dataset=self._dataset)
        except Exception as e:
            logger.error("bq.init.failed", error=str(e))
            self._client = None
            raise  # Re-raise so the setup script stops and shows the error

    async def ensure_tables_exist(self) -> None:
        """Create dataset and tables if they don't exist."""
        if not self._client:
            return

        from google.cloud import bigquery
        
        # 1. Ensure Dataset
        dataset_id = f"{self._project}.{self._dataset}"
        dataset = bigquery.Dataset(dataset_id)
        dataset.location = self._location
        try:
            self._client.create_dataset(dataset, exists_ok=True)
        except Exception:
            pass

        # 2. Define Table Schemas
        tables = {
            "schools": [
                bigquery.SchemaField("school_id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("school_name", "STRING"),
                bigquery.SchemaField("district_code", "STRING"),
                bigquery.SchemaField("district_name", "STRING"),
                bigquery.SchemaField("block_name", "STRING"),
                bigquery.SchemaField("lat", "FLOAT"),
                bigquery.SchemaField("lng", "FLOAT"),
                bigquery.SchemaField("di_score", "FLOAT"),
                bigquery.SchemaField("di_tier", "STRING"),
                bigquery.SchemaField("total_vacancies", "INTEGER"),
                bigquery.SchemaField("vacancy_subjects", "STRING"),
                bigquery.SchemaField("enrollment_total", "INTEGER"),
                bigquery.SchemaField("data_updated_at", "STRING"),
                bigquery.SchemaField("is_synthetic", "BOOLEAN"),
                bigquery.SchemaField("geocode_status", "STRING"),
                bigquery.SchemaField("di_data_quality", "STRING"),
                bigquery.SchemaField("rte_violation", "BOOLEAN"),
                bigquery.SchemaField("required_subjects_count", "INTEGER"),
                bigquery.SchemaField("stu_tea_ratio", "FLOAT"),
                bigquery.SchemaField("toilet_boys", "BOOLEAN"),
                bigquery.SchemaField("toilet_girls", "BOOLEAN"),
                bigquery.SchemaField("has_electricity", "BOOLEAN"),
                bigquery.SchemaField("num_classrooms", "INTEGER"),
                bigquery.SchemaField("nearest_town_km", "FLOAT"),
                bigquery.SchemaField("enrollment_3yr_ago", "INTEGER"),
                bigquery.SchemaField("district_aser_pct", "FLOAT"),
            ],
            "teachers": [
                bigquery.SchemaField("teacher_id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("teacher_name", "STRING"),
                bigquery.SchemaField("gender", "STRING"),
                bigquery.SchemaField("qualification", "STRING"),
                bigquery.SchemaField("subject_specialization", "STRING"),
                bigquery.SchemaField("languages_known", "STRING"),
                bigquery.SchemaField("current_district", "STRING"),
                bigquery.SchemaField("home_district", "STRING"),
                bigquery.SchemaField("years_of_service", "INTEGER"),
                bigquery.SchemaField("rural_posting_years", "INTEGER"),
                bigquery.SchemaField("transfer_request_count", "INTEGER"),
                bigquery.SchemaField("long_dist_consent", "BOOLEAN"),
                bigquery.SchemaField("is_synthetic", "BOOLEAN"),
                bigquery.SchemaField("consent_given", "BOOLEAN"),
                bigquery.SchemaField("embedding", "JSON"),
                bigquery.SchemaField("embedding_text", "STRING"),
                bigquery.SchemaField("created_at", "STRING"),
            ]
        }

        for table_name, schema in tables.items():
            table_id = f"{dataset_id}.{table_name}"
            table = bigquery.Table(table_id, schema=schema)
            try:
                self._client.create_table(table, exists_ok=True)
                logger.info("bq.table.ensured", table=table_name)
            except Exception as e:
                logger.error("bq.table.failed", table=table_name, error=str(e))

    async def ping(self) -> bool:
        """Health check — SELECT 1."""
        if not self._client:
            return False
        try:
            def _ping():
                list(self._client.query("SELECT 1").result())
            await self._run(_ping)
            return True
        except Exception as e:
            logger.warning("bq.ping.failed", error=str(e))
            return False

    async def get_schools(
        self,
        district_id: str,
        min_di: float = 0.0,
        rte_only: bool = False,
        vacancies_only: bool = False,
        block_code: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict]:
        """
        Get schools for a district, sorted by DI score DESC.
        Triggers cluster pruning via district_code = @district_id.
        """
        if not self._client:
            return []

        conditions = [
            "district_code = @district_id",
            "di_score IS NOT NULL",
        ]
        params = [
            bigquery.ScalarQueryParameter("district_id", "STRING", district_id),
            bigquery.ScalarQueryParameter("min_di", "FLOAT64", min_di),
            bigquery.ScalarQueryParameter("limit_val", "INT64", limit),
            bigquery.ScalarQueryParameter("offset_val", "INT64", offset),
        ]

        if min_di > 0:
            conditions.append("di_score >= @min_di")
        if rte_only:
            conditions.append("rte_violation = TRUE")
        if vacancies_only:
            conditions.append("total_vacancies > 0")
        if block_code:
            conditions.append("block_code = @block_code")
            params.append(bigquery.ScalarQueryParameter("block_code", "STRING", block_code))

        where_clause = " AND ".join(conditions)
        query = f"""
            SELECT
                school_id,
                school_name,
                district_code,
                district_name,
                block_name,
                cluster_name,
                lat,
                lng,
                di_score,
                di_tier,
                rte_violation,
                total_vacancies,
                vacancy_subjects,
                enrollment_total,
                enrollment_boys,
                enrollment_girls,
                stu_tea_ratio,
                toilet_boys,
                toilet_girls,
                has_electricity,
                num_classrooms,
                nearest_town_km,
                medium,
                category,
                management,
                data_updated_at,
                di_data_quality,
                geocode_status,
                is_synthetic
            FROM {self._table('schools')}
            WHERE {where_clause}
            ORDER BY di_score DESC NULLS LAST
            LIMIT @limit_val
            OFFSET @offset_val
        """

        def _query():
            job_config = bigquery.QueryJobConfig(query_parameters=params)
            return [dict(row) for row in self._client.query(query, job_config=job_config).result()]

        try:
            rows = await self._run(_query)
            # Compute is_data_stale
            threshold = datetime.utcnow() - timedelta(days=365)
            for row in rows:
                updated = row.get("data_updated_at")
                if updated and hasattr(updated, "replace"):
                    row["is_data_stale"] = updated.replace(tzinfo=None) < threshold
                else:
                    row["is_data_stale"] = True
            return rows
        except Exception as e:
            logger.error("bq.get_schools.error", error=str(e), district_id=district_id)
    async def get_district_stats(self, district_id: str) -> dict:
        """Task 5.2: Get district-level summary stats via single aggregation query."""
        if not self._client:
            return {}

        # Data staleness threshold (365 days)
        stale_date = (datetime.utcnow() - timedelta(days=365)).isoformat()

        query = f"""
            SELECT
                count(*) as total_schools,
                countif(di_score IS NOT NULL) as scored_schools,
                countif(di_score >= 80) as critical_count,
                countif(di_score >= 60 AND di_score < 80) as high_count,
                countif(rte_violation = TRUE) as rte_violation_count,
                sum(total_vacancies) as total_vacancies,
                countif(data_updated_at < @stale_date OR data_updated_at IS NULL) as data_stale_count
            FROM {self._table('schools')}
            WHERE district_code = @district_id
        """
        params = [
            bigquery.ScalarQueryParameter("district_id", "STRING", district_id),
            bigquery.ScalarQueryParameter("stale_date", "STRING", stale_date),
        ]

        def _query():
            job_config = bigquery.QueryJobConfig(query_parameters=params)
            rows = list(self._client.query(query, job_config=job_config).result())
            return dict(rows[0]) if rows else {}

        try:
            return await self._run(_query)
        except Exception as e:
            logger.error("bq.get_district_stats.error", error=str(e))
            return {}

    async def get_school_by_id(self, school_id: str) -> Optional[dict]:
        """Get full school detail by UDISE code (always STRING)."""
        if not self._client:
            return None

        query = f"""
            SELECT
                school_id, school_name, district_code, district_name,
                block_name, cluster_name, lat, lng,
                di_score, di_tier, rte_violation,
                total_vacancies, vacancy_subjects,
                enrollment_total, enrollment_boys, enrollment_girls,
                stu_tea_ratio, toilet_boys, toilet_girls,
                has_electricity, num_classrooms, nearest_town_km,
                medium, category, management,
                data_updated_at, di_data_quality,
                di_breakdown_json, enrollment_trend_json,
                required_subjects, rte_teachers_needed,
                satellite_verified
            FROM {self._table('schools')}
            WHERE school_id = @school_id
            LIMIT 1
        """
        params = [bigquery.ScalarQueryParameter("school_id", "STRING", school_id)]

        def _query():
            job_config = bigquery.QueryJobConfig(query_parameters=params)
            rows = list(self._client.query(query, job_config=job_config).result())
            return dict(rows[0]) if rows else None

        try:
            row = await self._run(_query)
            if row:
                threshold = datetime.utcnow() - timedelta(days=365)
                updated = row.get("data_updated_at")
                if updated and hasattr(updated, "replace"):
                    row["is_data_stale"] = updated.replace(tzinfo=None) < threshold
                else:
                    row["is_data_stale"] = True
            return row
        except Exception as e:
            logger.error("bq.get_school_by_id.error", error=str(e), school_id=school_id)
            return None

    async def get_raw_school_data(
        self, district_id: str, limit: int = 1000, offset: int = 0
    ) -> list[dict]:
        """Get raw UDISE data for DI computation with pagination."""
        if not self._client:
            return []

        query = f"""
            SELECT
                school_id, stu_tea_ratio, total_vacancies, required_subjects_count,
                toilet_boys, toilet_girls, has_electricity,
                num_classrooms, enrollment_total, nearest_town_km,
                enrollment_3yr_ago, district_aser_pct
            FROM {self._table('schools')}
            WHERE district_code = @district_id
            ORDER BY school_id
            LIMIT @limit_val
            OFFSET @offset_val
        """
        params = [
            bigquery.ScalarQueryParameter("district_id", "STRING", district_id),
            bigquery.ScalarQueryParameter("limit_val", "INT64", limit),
            bigquery.ScalarQueryParameter("offset_val", "INT64", offset),
        ]

        def _query():
            job_config = bigquery.QueryJobConfig(query_parameters=params)
            return [dict(row) for row in self._client.query(query, job_config=job_config).result()]

        try:
            return await self._run(_query)
        except Exception as e:
            logger.error("bq.get_raw_school_data.error", error=str(e))
            return []

    async def get_teachers_by_subject(
        self,
        subject: str,
        district_id: Optional[str] = None,
        min_retention: float = 0.0,
        limit: int = 100,
    ) -> list[dict]:
        """Pre-filter teachers by subject before embedding comparison."""
        if not self._client:
            return []

        conditions = ["@subject IN UNNEST(JSON_VALUE_ARRAY(subject_specialization))"]
        params = [
            bigquery.ScalarQueryParameter("subject", "STRING", subject),
            bigquery.ScalarQueryParameter("limit_val", "INT64", limit),
        ]

        if district_id:
            conditions.append("current_district = @district_id")
            params.append(bigquery.ScalarQueryParameter("district_id", "STRING", district_id))

        where_clause = " AND ".join(conditions)
        query = f"""
            SELECT
                teacher_id, teacher_name, qualification,
                subject_specialization, languages_known,
                current_district, home_district,
                years_of_service, rural_posting_years,
                transfer_request_count, retention_score,
                retention_risk_flag, long_dist_consent,
                is_synthetic, current_school_id,
                lat, lng, embedding
            FROM {self._table('teachers')}
            WHERE {where_clause}
            LIMIT @limit_val
        """

        def _query():
            job_config = bigquery.QueryJobConfig(query_parameters=params)
            return [dict(row) for row in self._client.query(query, job_config=job_config).result()]

        try:
            return await self._run(_query)
        except Exception as e:
            logger.error("bq.get_teachers_by_subject.error", error=str(e))
            return []

    async def get_all_teachers_with_embeddings(self) -> list[dict]:
        """Load all teachers that have pre-computed embeddings for cache warm-up."""
        if not self._client:
            return []

        query = f"""
            SELECT teacher_id, embedding
            FROM {self._table('teachers')}
            WHERE embedding IS NOT NULL
        """

        def _query():
            job_config = bigquery.QueryJobConfig()
            return [dict(row) for row in self._client.query(query, job_config=job_config).result()]

        try:
            return await self._run(_query)
        except Exception as e:
            logger.error("bq.get_all_teachers_with_embeddings.error", error=str(e))
            return []

    async def batch_update_di_scores(self, updates: list[dict]) -> None:
        """Batch update DI scores for a list of schools."""
        if not self._client or not updates:
            return

        def _update():
            rows_to_insert = [
                {
                    "school_id": u["school_id"],
                    "di_score": u.get("composite_di"),
                    "di_data_quality": u.get("di_data_quality", "OK"),
                    "di_breakdown_json": json.dumps({
                        k: v for k, v in u.items()
                        if k.endswith("_score") and k != "composite_di"
                    }),
                    "di_computed_at": datetime.utcnow().isoformat(),
                }
                for u in updates
            ]
            table_ref = self._client.dataset(self._dataset).table("schools")
            errors = self._client.insert_rows_json(table_ref, rows_to_insert)
            if errors:
                logger.error("bq.batch_update_di.errors", errors=str(errors))

        try:
            await self._run(_update)
            logger.info("bq.batch_update_di.done", count=len(updates))
        except Exception as e:
            logger.error("bq.batch_update_di.error", error=str(e))

    async def save_optimization_result(self, result: Any, district_id: str) -> None:
        """Save optimizer result to BigQuery deployments table."""
        if not self._client:
            return

        def _save():
            rows = [
                {
                    "deployment_id": a.assignment_id,
                    "school_id": a.school_id,
                    "teacher_id": a.teacher_id,
                    "vacancy_subject": a.subject,
                    "dvs_score": a.dvs_score,
                    "status": "pending",
                    "district_code": district_id,
                    "run_id": result.run_id,
                    "created_at": datetime.utcnow().isoformat(),
                }
                for a in result.assignments
            ]
            if rows:
                table_ref = self._client.dataset(self._dataset).table("deployments")
                self._client.insert_rows_json(table_ref, rows)

        try:
            await self._run(_save)
        except Exception as e:
            logger.error("bq.save_optimization_result.error", error=str(e))

    async def get_cached_briefing(
        self, district_id: str, week_start: datetime
    ) -> Optional[dict]:
        """Check for a cached briefing from this week."""
        if not self._client:
            return None

        query = f"""
            SELECT briefing_json, generated_at
            FROM {self._table('briefings')}
            WHERE district_code = @district_id
              AND generated_at >= @week_start
            ORDER BY generated_at DESC
            LIMIT 1
        """
        params = [
            bigquery.ScalarQueryParameter("district_id", "STRING", district_id),
            bigquery.ScalarQueryParameter("week_start", "TIMESTAMP", week_start),
        ]

        def _query():
            job_config = bigquery.QueryJobConfig(query_parameters=params)
            rows = list(self._client.query(query, job_config=job_config).result())
            if rows:
                row = dict(rows[0])
                return json.loads(row["briefing_json"])
            return None

        try:
            return await self._run(_query)
        except Exception as e:
            logger.error("bq.get_cached_briefing.error", error=str(e))
            return None

    async def save_briefing(self, briefing_data: dict) -> None:
        """Save a generated briefing to BigQuery."""
        if not self._client:
            return

        def _save():
            row = {
                "briefing_id": briefing_data.get("briefing_id", ""),
                "district_code": briefing_data.get("district_code", ""),
                "briefing_json": json.dumps(briefing_data),
                "generated_at": datetime.utcnow().isoformat(),
                "gemini_prompt_hash": briefing_data.get("prompt_version", "1.0.0"),
            }
            table_ref = self._client.dataset(self._dataset).table("briefings")
            self._client.insert_rows_json(table_ref, [row])

        try:
            await self._run(_save)
        except Exception as e:
            logger.error("bq.save_briefing.error", error=str(e))

    def close(self) -> None:
        """Shutdown thread pool."""
        self._pool.shutdown(wait=False)
        if self._client:
            self._client.close()
