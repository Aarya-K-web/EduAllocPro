"""
EduAllocPro — Synthetic Teacher Generator
Generates exactly 300 realistic Maharashtra teacher profiles for Nandurbar district.
Uses Faker for realistic Indian names.
Run: python -m data.gen_teachers
"""
import json
import random
import uuid
from datetime import datetime

import structlog
from faker import Faker
from ai.matching import build_teacher_embedding_str

logger = structlog.get_logger()
fake = Faker('en_IN')

# Task 2 Requirements: Subject Distribution
SUBJECT_COUNTS = (
    ["Science"] * 35 +
    ["Mathematics"] * 40 +
    ["Hindi"] * 30 +
    ["English"] * 30 +
    ["Marathi"] * 25 +
    ["Social Science"] * 25 +
    ["General Science"] * 40 +
    ["Primary"] * 75
)
random.shuffle(SUBJECT_COUNTS)

QUALIFICATIONS = [
    ("BSc BEd", 0.30),
    ("MSc BEd", 0.35),
    ("BA BEd",  0.20),
    ("MA BEd",  0.15),
]

def _weighted_choice(choices):
    items, weights = zip(*choices)
    return random.choices(items, weights=weights, k=1)[0]

def generate_teacher(idx: int) -> dict:
    gender = random.choice(["M", "F"])
    name = fake.name_male() if gender == "M" else fake.name_female()

    qualification = _weighted_choice(QUALIFICATIONS)
    subjects = [SUBJECT_COUNTS[idx]] # Each teacher gets exactly one primary subject from the pool
    
    # District logic (Task 2)
    # home_district: 40% Nandurbar, 30% Dhule, 15% Nashik, 15% other
    home_dist = random.choices(
        ["Nandurbar", "Dhule", "Nashik", "Other"],
        weights=[0.40, 0.30, 0.15, 0.15],
        k=1
    )[0]
    
    # current_district: 50% Nandurbar, 50% spread across neighbouring
    current_dist = random.choices(
        ["Nandurbar", "Dhule", "Nashik", "Jalgaon"],
        weights=[0.50, 0.20, 0.20, 0.10],
        k=1
    )[0]

    # Service years: weighted toward 0-3 for rural avoidance (Task 2)
    rural_years = random.choices(
        [0, 1, 2, 3, 5, 8],
        weights=[0.40, 0.20, 0.15, 0.10, 0.10, 0.05],
        k=1
    )[0]
    years_service = rural_years + random.randint(0, 15)
    
    # transfer_request_count: Poisson distribution, lambda=1.2 (Task 2)
    import numpy as np
    transfer_count = np.random.poisson(1.2)
    
    # long_dist_consent: 15% True (Task 2)
    long_dist_consent = random.random() < 0.15

    # Languages (Task 2)
    # ALL must include 'mr'. 60% include 'hi'. 20% include 'gn'.
    languages = ["mr"]
    if random.random() < 0.60:
        languages.append("hi")
    if random.random() < 0.20:
        languages.append("gn")

    teacher = {
        "teacher_id": str(uuid.uuid4()),
        "teacher_name": name,
        "gender": gender,
        "qualification": qualification,
        "subject_specialization": json.dumps(subjects),
        "languages_known": json.dumps(languages),
        "current_district": current_dist,
        "home_district": home_dist,
        "years_of_service": years_service,
        "rural_posting_years": rural_years,
        "transfer_request_count": transfer_count,
        "long_dist_consent": long_dist_consent,
        "is_synthetic": True,
        "consent_given": True,
        "current_school_id": None,
        "created_at": datetime.utcnow().isoformat(),
    }
    
    # Generate and store embedding text (Task 2)
    teacher["embedding_text"] = build_teacher_embedding_str({
        **teacher,
        "subject_specialization": subjects,
        "languages_known": languages
    })
    
    return teacher

async def compute_all_embeddings(bq, vertex):
    """Generate Vertex AI vectors for all teachers and store in BigQuery."""
    logger.info("gen_teachers.compute_embeddings.start")
    
    # 1. Fetch all teachers missing embeddings
    query = f"SELECT teacher_id, embedding_text FROM {bq._table('teachers')} WHERE embedding IS NULL"
    rows = await bq._run(lambda: [dict(r) for r in bq._client.query(query).result()])
    
    if not rows:
        logger.info("gen_teachers.compute_embeddings.none_needed")
        return

    # 2. Batch embed in chunks of 50 (Vertex limit is usually around 50-100)
    batch_size = 50
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        texts = [r["embedding_text"] for r in batch]
        vectors = await vertex.embed(texts)
        
        # 3. Update BQ
        # BigQuery doesn't support easy batch UPDATEs, so we use a temp table or CASE
        # For 300 rows, individual updates in the thread pool is acceptable if throttled
        for r, vec in zip(batch, vectors):
            update_query = f"UPDATE {bq._table('teachers')} SET embedding = @vec WHERE teacher_id = @id"
            params = [
                bq.bigquery.ScalarQueryParameter("vec", "JSON", json.dumps(vec)),
                bq.bigquery.ScalarQueryParameter("id", "STRING", r["teacher_id"])
            ]
            await bq._run(bq._client.query, update_query, bq.bigquery.QueryJobConfig(query_parameters=params))
            
    logger.info("gen_teachers.compute_embeddings.done", count=len(rows))

async def load_to_bigquery(teachers: list[dict], bq) -> None:
    """Load generated teachers to BigQuery teachers table in batches."""
    logger.info("gen_teachers.bq_load.start", count=len(teachers))
    
    # Ensure idempotency by clearing existing synthetic teachers first
    delete_query = f"DELETE FROM {bq._table('teachers')} WHERE is_synthetic = TRUE"
    await bq._run(bq._client.query, delete_query)

    # Free-Tier Friendly Load Job (Task 2 fix)
    # Streaming inserts (insert_rows_json) are blocked in BigQuery Sandbox.
    table_id = f"{bq._project_id}.{bq._dataset}.teachers"
    from google.cloud import bigquery
    job_config = bigquery.LoadJobConfig(
        write_disposition="WRITE_APPEND",
        source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
        ignore_unknown_values=True,
        autodetect=False,
    )
    
    job = bq._client.load_table_from_json(teachers, table_id, job_config=job_config)
    await bq._run(job.result) # Wait for completion
    logger.info("gen_teachers.load_job.done", loaded=len(teachers))

if __name__ == "__main__":
    import asyncio
    from services.bigquery_client import BigQueryClient
    from services.vertex_client import VertexClient
    
    async def main():
        bq = BigQueryClient.from_env()
        vertex = VertexClient.from_env()
        
        teachers = [generate_teacher(i) for i in range(300)]
        await load_to_bigquery(teachers, bq)
        await compute_all_embeddings(bq, vertex)
        
    asyncio.run(main())
