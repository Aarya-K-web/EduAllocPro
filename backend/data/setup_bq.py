"""
EduAllocPro — One-Time BigQuery Setup Script
Run before first demo: python -m data.setup_bq

Steps:
1. Run UDISE ingestion
2. Generate synthetic teachers
3. Geocode all schools
4. Compute DI for NDB01
5. Compute teacher embeddings
6. Create BigQuery views
7. Print setup summary
"""
import asyncio
import os
import sys

# Add backend root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import structlog
logger = structlog.get_logger()


async def setup():
    from config import config
    from services.bigquery_client import BigQueryClient
    from services.vertex_client import VertexClient
    from services.maps_client import MapsClient

    print("=" * 60)
    print("EduAllocPro — BigQuery Setup")
    print("=" * 60)
    print(f"Project:  {config.gcp_project}")
    print(f"Dataset:  {config.bq_dataset}")
    print(f"District: {config.district_code}")
    print()

    bq     = BigQueryClient.from_env()
    vertex = VertexClient.from_env()
    maps   = MapsClient.from_env()

    # Step 1: UDISE ingestion
    print("Step 1: Ingesting UDISE data...")
    try:
        from data.ingest_udise import ingest_udise
        summary = await ingest_udise(bq, maps)
        print(f"  [OK] Loaded {summary['rows_loaded']} schools")
        print(f"  [OK] Geocoded {summary['geocode_ok']} schools")
    except FileNotFoundError as e:
        print(f"  [WARN] UDISE CSV not found: {e}")
        print(f"  -> Download from udiseplus.gov.in and place at {config.udise_csv_path}")

    # Step 2: Generate synthetic teachers
    print("\nStep 2: Generating synthetic teachers...")
    from data.gen_teachers import generate_teachers, load_to_bigquery
    teachers = generate_teachers(300)
    await load_to_bigquery(teachers, bq)
    print(f"  [OK] Generated {len(teachers)} synthetic teachers")

    # Step 3: Compute DI scores
    print("\nStep 3: Computing Deprivation Index scores...")
    from ai.deprivation import compute_di_for_district
    count = await compute_di_for_district(bq, config.district_code)
    print(f"  [OK] Computed DI for {count} schools")

    # Step 4: Compute teacher embeddings
    print("\nStep 4: Computing teacher embeddings...")
    from ai.embeddings_cache import EmbeddingsCache
    cache = EmbeddingsCache()
    loaded = await cache.warm_up(bq, vertex)
    print(f"  [OK] Cached {loaded} teacher embeddings")

    # Step 5: Create BigQuery views
    print("\nStep 5: Creating BigQuery views...")
    if bq._client:
        views = [
            ("vw_school_priority",
             f"SELECT * FROM `{bq._project_id}.{bq._dataset}.schools` WHERE di_score IS NOT NULL ORDER BY di_score DESC"),
            ("vw_rte_violations",
             f"SELECT * FROM `{bq._project_id}.{bq._dataset}.schools` WHERE rte_violation = TRUE"),
            ("vw_deployment_summary",
             f"SELECT d.*, s.school_name, s.di_score, t.teacher_name FROM `{bq._project_id}.{bq._dataset}.deployments` d LEFT JOIN `{bq._project_id}.{bq._dataset}.schools` s ON d.school_id = s.school_id LEFT JOIN `{bq._project_id}.{bq._dataset}.teachers` t ON d.teacher_id = t.teacher_id"),
        ]
        for view_name, view_query in views:
            try:
                view_ref = bq._client.dataset(bq._dataset).table(view_name)
                view = bq._client.get_table(view_ref) if False else None
                # Create view
                from google.cloud.bigquery import Table, TableReference
                view_table = Table(f"{bq._project_id}.{bq._dataset}.{view_name}")
                view_table.view_query = view_query
                bq._client.create_table(view_table, exists_ok=True)
                print(f"  [OK] Created view: {view_name}")
            except Exception as e:
                print(f"  [WARN] View {view_name}: {e}")
    else:
        print("  [WARN] BigQuery not connected — skipping views")

    print("\n" + "=" * 60)
    print("Setup complete! Run: uvicorn api.main:app --reload")
    print("=" * 60)

    bq.close()
    vertex.close()
    maps.close()


if __name__ == "__main__":
    asyncio.run(setup())
