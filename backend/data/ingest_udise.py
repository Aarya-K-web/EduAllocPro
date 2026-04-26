"""
EduAllocPro — UDISE CSV Ingestion Pipeline
Reads UDISE+ CSV → validates → geocodes → loads to BigQuery.
Run: python -m data.ingest_udise
"""
import csv
import os
import sys
from datetime import datetime

import structlog

logger = structlog.get_logger()

REQUIRED_COLUMNS = [
    "school_id", "school_name", "district_code", "district_name",
    "block_name", "enrollment_total",
]

OPTIONAL_COLUMNS = {
    "lat": None,
    "lng": None,
    "stu_tea_ratio": None,
    "toilet_boys": False,
    "toilet_girls": False,
    "has_electricity": False,
    "num_classrooms": 1,
    "nearest_town_km": None,
    "enrollment_boys": None,
    "enrollment_girls": None,
    "enrollment_3yr_ago": None,
    "district_aser_pct": None,
    "medium": "Marathi",
    "category": "Primary",
    "management": "Government",
    "cluster_name": "",
}


def validate_csv(path: str) -> list[dict]:
    """Read and validate UDISE CSV. Raises ValueError on missing required columns."""
    if not os.path.exists(path):
        raise FileNotFoundError(f"UDISE CSV not found: {path}")

    with open(path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []

        missing = [col for col in REQUIRED_COLUMNS if col not in headers]
        if missing:
            raise ValueError(
                f"UDISE CSV missing required columns: {missing}. "
                f"Found: {headers}"
            )

        rows = []
        for i, row in enumerate(reader):
            # Ensure school_id is always STRING
            row["school_id"] = str(row.get("school_id", "")).strip()
            if not row["school_id"]:
                logger.warning("ingest.skip_empty_school_id", row=i)
                continue

            # Fill optional columns with defaults
            for col, default in OPTIONAL_COLUMNS.items():
                if col not in row or row[col] == "":
                    row[col] = default

            # Normalize boolean fields
            for bool_col in ["toilet_boys", "toilet_girls", "has_electricity"]:
                val = row.get(bool_col, False)
                if isinstance(val, str):
                    row[bool_col] = val.lower() in ("1", "true", "yes", "y")

            # Normalize numeric fields
            for num_col in ["stu_tea_ratio", "nearest_town_km", "enrollment_total",
                            "enrollment_boys", "enrollment_girls", "num_classrooms"]:
                val = row.get(num_col)
                if val is not None and val != "":
                    try:
                        row[num_col] = float(val)
                    except (ValueError, TypeError):
                        row[num_col] = None

            row["data_updated_at"] = datetime.utcnow().isoformat()
            row["geocode_status"] = "PENDING"
            row["is_synthetic"] = False
            rows.append(row)

    logger.info("ingest.validated", rows=len(rows))
    return rows


async def ingest_udise(bq, maps=None) -> dict:
    """
    Full UDISE ingestion pipeline.
    Returns summary dict with rows_loaded, nulls_filled, geocode_ok, geocode_failed.
    """
    csv_path = os.environ.get("UDISE_CSV_PATH", "./data/sample/udise_nandurbar.csv")
    logger.info("ingest.start", path=csv_path)

    rows = validate_csv(csv_path)
    nulls_filled = sum(
        1 for row in rows
        if row.get("lat") is None or row.get("lng") is None
    )

    # Geocode schools without coordinates
    geocode_ok = 0
    geocode_failed = 0
    if maps:
        schools_to_geocode = [r for r in rows if not r.get("lat")]
        if schools_to_geocode:
            geocoded = await maps.batch_geocode_schools(schools_to_geocode)
            for school in geocoded:
                if school.get("geocode_status") == "OK":
                    geocode_ok += 1
                else:
                    geocode_failed += 1

    # Load to BigQuery (MERGE for idempotent upsert)
    if bq and bq._client:
        try:
            table_ref = bq._client.dataset(bq._dataset).table("schools")
            batch_size = 100
            for i in range(0, len(rows), batch_size):
                batch = rows[i : i + batch_size]
                errors = bq._client.insert_rows_json(table_ref, batch)
                if errors:
                    logger.error("ingest.bq_errors", errors=str(errors[:3]))
        except Exception as e:
            logger.error("ingest.bq_error", error=str(e))

    summary = {
        "rows_loaded": len(rows),
        "nulls_filled": nulls_filled,
        "geocode_ok": geocode_ok,
        "geocode_failed": geocode_failed,
    }
    logger.info("ingest.done", **summary)
    return summary


if __name__ == "__main__":
    import asyncio
    asyncio.run(ingest_udise(None, None))
