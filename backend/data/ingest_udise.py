"""
EduAllocPro — UDISE CSV Ingestion Pipeline
Reads UDISE+ CSV → validates → geocodes → loads to BigQuery.

AUDIT FINDING (Task 1.1): 
The previous ingestion was limited to 8 schools because:
1. It defaulted to a small sample CSV (udise_nandurbar.csv) with only a few rows.
2. It lacked a COLUMN_MAP, so real UDISE+ files with non-standard headers were being 
   skipped or rejected by the validator.
3. It didn't parse per-column subject vacancy flags, leading to zero vacancies recorded.

Run: python -m data.ingest_udise
"""
import csv
import json
import os
import sys
from datetime import datetime

import structlog
from data.validators import validate_udise_row

logger = structlog.get_logger()

# Task 1.2: Normalization map for inconsistent UDISE+ headers
COLUMN_MAP = {
    "School_ID": "school_id",
    "UDISE_Code": "school_id",
    "School_Name": "school_name",
    "District_Name": "district_name",
    "Block_Name": "block_name",
    "Total_Enrollment": "enrollment_total",
    "STR": "stu_tea_ratio",
    "Pupil_Teacher_Ratio": "stu_tea_ratio",
    "Boys_Toilet_Functional": "toilet_boys",
    "Girls_Toilet_Functional": "toilet_girls",
    "Electricity_Availability": "has_electricity",
    "Classrooms_Count": "num_classrooms",
    "Distance_Urban_KM": "nearest_town_km",
}

# Task 1.3: Subject vacancy flag columns
SUBJECT_FLAG_COLS = {
    "Vac_Math": "Mathematics",
    "Vac_Sci": "Science",
    "Vac_Eng": "English",
    "Vac_Mar": "Marathi",
    "Vac_Hin": "Hindi",
    "Vac_SST": "Social Studies",
}

REQUIRED_COLUMNS = [
    "school_id", "school_name", "district_name", "block_name", "enrollment_total",
]


def _parse_vacancies(row: dict) -> list[str]:
    """Convert per-column subject flags to JSON array of subjects."""
    vacancies = []
    for col, subject in SUBJECT_FLAG_COLS.items():
        val = str(row.get(col, "0")).lower()
        if val in ("1", "true", "yes", "y"):
            vacancies.append(subject)
    return vacancies


def process_csv(path: str) -> list[dict]:
    """Read, normalize and validate UDISE CSV."""
    if not os.path.exists(path):
        raise FileNotFoundError(f"UDISE CSV not found: {path}")

    rows = []
    with open(path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        
        for i, raw_row in enumerate(reader):
            # Normalize headers using COLUMN_MAP
            normalized = {}
            for k, v in raw_row.items():
                target_key = COLUMN_MAP.get(k, k.lower())
                normalized[target_key] = v

            # Parse subject vacancies
            normalized["vacancy_subjects"] = _parse_vacancies(raw_row)
            normalized["total_vacancies"] = len(normalized["vacancy_subjects"])

            # Validate using Task 1.6 logic
            cleaned, warnings = validate_udise_row(normalized)
            
            if not cleaned["school_id"]:
                logger.warning("ingest.skip_row", index=i, reason="missing_school_id")
                continue

            # Task 1.1: Handling nulls per project rules
            is_insufficient = any(cleaned.get(col) is None for col in REQUIRED_COLUMNS)
            cleaned["di_data_quality"] = "INSUFFICIENT_DATA" if is_insufficient else "OK"
            
            cleaned["data_updated_at"] = datetime.utcnow().isoformat()
            cleaned["geocode_status"] = "PENDING"
            cleaned["is_synthetic"] = False
            
            # Ensure JSON serialization for lists
            cleaned["vacancy_subjects"] = json.dumps(cleaned["vacancy_subjects"])
            
            rows.append(cleaned)

    logger.info("ingest.processed", count=len(rows))
    return rows


async def ingest_udise(bq, maps=None) -> dict:
    """
    Full UDISE ingestion pipeline (Task 1).
    """
    csv_path = os.environ.get("UDISE_CSV_PATH", "./data/sample/udise_nandurbar.csv")
    logger.info("ingest.start", path=csv_path)

    rows = process_csv(csv_path)
    
    # Optional Geocoding (throttled)
    geocode_ok = 0
    if maps and rows:
        schools_to_geocode = [r for r in rows if not r.get("lat")][:10] # Limit geocoding in setup to avoid ORS timeout
        if schools_to_geocode:
            logger.info("ingest.geocoding", count=len(schools_to_geocode))
            geocoded = await maps.batch_geocode_schools(schools_to_geocode)
            geocode_ok = sum(1 for s in geocoded if s.get("geocode_status") == "OK")

    # Task 1.4 & 1.5: Idempotent BigQuery Load with Progress Tracking
    rows_loaded = 0
    if bq and bq._client:
        try:
            from google.cloud import bigquery
            # 1. DELETE existing rows to ensure idempotency (Task 1.4)
            school_ids = [r["school_id"] for r in rows]
            delete_query = f"DELETE FROM {bq._table('schools')} WHERE school_id IN UNNEST(@ids)"
            job_config = bigquery.QueryJobConfig(
                query_parameters=[bigquery.ArrayQueryParameter("ids", "STRING", school_ids)]
            )
            await bq._run(bq._client.query, delete_query, job_config)

            # 2. Batch Insert (Task 1.5)
            table_ref = bq._client.dataset(bq._dataset).table("schools")
            batch_size = 100
            for i in range(0, len(rows), batch_size):
                batch = rows[i : i + batch_size]
                errors = await bq._run(bq._client.insert_rows_json, table_ref, batch)
                if errors:
                    logger.error("ingest.bq_errors", batch=i//batch_size, errors=str(errors[:3]))
                else:
                    rows_loaded += len(batch)
                
                # Task 1.5: Log progress every 100 rows
                logger.info("ingest.progress", loaded=rows_loaded, total=len(rows))

        except Exception as e:
            logger.error("ingest.bq_error", error=str(e))

    summary = {
        "rows_loaded": rows_loaded,
        "total_processed": len(rows),
        "geocode_ok": geocode_ok,
    }
    logger.info("ingest.done", **summary)
    return summary


if __name__ == "__main__":
    import asyncio
    from services.bigquery_client import BigQueryClient
    bq = BigQueryClient.from_env()
    asyncio.run(ingest_udise(bq))
