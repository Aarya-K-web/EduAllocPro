"""
EduAllocPro — Centralised Configuration
Single config module — read once at startup.
All env vars accessed here; never import os.environ directly in other modules.
"""
import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()  # Loads backend/.env in development; no-op in Cloud Run

from utils.auth import setup_gcp_auth
setup_gcp_auth()


@dataclass(frozen=True)
class Config:
    # ── Required — raise immediately if missing ────────────────────────────
    gcp_project: str = os.environ.get("GOOGLE_CLOUD_PROJECT", "")
    gemini_key: str = os.environ.get("GOOGLE_API_KEY", "")
    maps_key: str = os.environ.get("MAPS_API_KEY", "")
    firebase_project_id: str = os.environ.get("FIREBASE_PROJECT_ID", "")

    # ── Optional with defaults ─────────────────────────────────────────────
    bq_dataset: str = os.environ.get("BQ_DATASET", "edualloc_dataset")
    bq_location: str = os.environ.get("BQ_LOCATION", "us-central1")
    bq_max_results: int = int(os.environ.get("BQ_MAX_RESULTS", "500"))
    bq_query_timeout_s: int = int(os.environ.get("BQ_QUERY_TIMEOUT_S", "30"))

    vertex_location: str = os.environ.get("VERTEX_AI_LOCATION", "us-central1")
    vertex_model: str = os.environ.get("VERTEX_AI_MODEL", "textembedding-gecko@003")

    gemini_model: str = os.environ.get("GEMINI_MODEL", "gemini-1.5-pro")
    gemini_temp_briefing: float = float(os.environ.get("GEMINI_TEMPERATURE_BRIEFING", "0.3"))
    gemini_temp_order: float = float(os.environ.get("GEMINI_TEMPERATURE_ORDER", "0.6"))

    maps_distance_mode: str = os.environ.get("MAPS_DISTANCE_MODE", "driving")
    max_commute_km: int = int(os.environ.get("MAPS_MAX_COMMUTE_KM", "80"))

    optimizer_time_s: int = int(os.environ.get("OPTIMIZER_TIME_LIMIT_S", "20"))
    cache_ttl_hours: int = int(os.environ.get("EMBEDDINGS_CACHE_TTL_HOURS", "24"))
    cache_max_size: int = int(os.environ.get("EMBEDDINGS_CACHE_MAX_SIZE", "10000"))
    briefing_cache_hours: int = int(os.environ.get("BRIEFING_CACHE_HOURS", "168"))

    district_code: str = os.environ.get("DISTRICT_CODE", "NDB01")
    district_name: str = os.environ.get("DISTRICT_NAME", "Nandurbar")

    app_env: str = os.environ.get("APP_ENV", "development")
    port: int = int(os.environ.get("PORT", "8000"))
    workers: int = int(os.environ.get("WORKERS", "1"))
    log_level: str = os.environ.get("LOG_LEVEL", "INFO")
    udise_csv_path: str = os.environ.get("UDISE_CSV_PATH", "./data/sample/udise_nandurbar.csv")
    teacher_csv_path: str = os.environ.get("TEACHER_CSV_PATH", "./data/sample/teachers_synth.csv")

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    def get_cors_origins(self) -> list[str]:
        raw = os.environ.get("CORS_ORIGINS", "http://localhost:5173")
        return [o.strip() for o in raw.split(",") if o.strip()]


# Singleton — instantiated once at module import
config = Config()
