"""
EduAllocPro — BigQuery Setup & Re-seed Script
Usage: python -m data.setup_bq --mode [full|di-only|teachers-only|validate]
"""
import asyncio
import argparse
import os
import sys
import time
from datetime import datetime

# Add backend root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import structlog
logger = structlog.get_logger()

async def run_validate(bq):
    """Run data quality report query and print results (Task 4)."""
    print("\n" + "-"*40)
    print("DATA QUALITY VALIDATION")
    print("-"*40)
    
    # Check schools
    q_schools = f"SELECT count(*) as count, countif(di_score IS NOT NULL) as scored FROM {bq._table('schools')}"
    res_schools = await bq._run(lambda: [dict(r) for r in bq._client.query(q_schools).result()])
    count = res_schools[0]['count']
    scored = res_schools[0]['scored']
    
    # Check teachers
    q_teachers = f"SELECT count(*) as count, countif(embedding IS NOT NULL) as embedded FROM {bq._table('teachers')}"
    res_teachers = await bq._run(lambda: [dict(r) for r in bq._client.query(q_teachers).result()])
    t_count = res_teachers[0]['count']
    embedded = res_teachers[0]['embedded']
    
    print(f"Schools Loaded:  {count} (Goal: >500)")
    print(f"Schools Scored:  {scored}")
    print(f"Teachers Total:  {t_count}")
    print(f"Teachers Vector: {embedded} (Goal: >200)")
    
    # P0 Checks (Task 4)
    if count < 500:
        print(" [!] FAIL: Less than 500 schools loaded")
        return False
    if embedded < 200:
        print(" [!] FAIL: Less than 200 teachers with embeddings")
        return False
        
    print(" [OK] All P0 checks passed")
    return True

async def main():
    parser = argparse.ArgumentParser(description="EduAllocPro Setup")
    parser.add_argument("--mode", choices=["full", "di-only", "teachers-only", "validate"], default="full")
    args = parser.parse_args()

    from config import config
    from services.bigquery_client import BigQueryClient
    from services.vertex_client import VertexClient
    from services.maps_client import MapsClient
    
    bq = BigQueryClient.from_env()
    vertex = VertexClient.from_env()
    maps = MapsClient.from_env()

    start_time = time.time()
    results = {"mode": args.mode, "status": "OK", "steps": []}

    try:
        if args.mode in ["full"]:
            print("Step 1: Ingesting UDISE data...")
            from data.ingest_udise import ingest_udise
            summary = await ingest_udise(bq, maps)
            results["steps"].append(f"Ingested {summary['rows_loaded']} schools")

        if args.mode in ["full", "di-only"]:
            print("\nStep 2: Computing Deprivation Index...")
            from ai.deprivation import compute_di_for_district
            count = await compute_di_for_district(bq, config.district_code)
            results["steps"].append(f"Computed DI for {count} schools")

        if args.mode in ["full", "teachers-only"]:
            print("\nStep 3: Generating Teachers & Embeddings...")
            from data.gen_teachers import generate_teachers, load_to_bigquery, compute_all_embeddings
            teachers = [generate_teachers(300)] # Wait, gen_teachers.py's generate_teachers(300) returns list[dict]
            # My bad, I'll fix the call
            from data.gen_teachers import generate_teacher
            teacher_list = [generate_teacher(i) for i in range(300)]
            await load_to_bigquery(teacher_list, bq)
            await compute_all_embeddings(bq, vertex)
            results["steps"].append(f"Generated 300 teachers + embeddings")

        # Always validate at the end unless it was only validation
        ok = await run_validate(bq)
        if not ok:
            sys.exit(1)

    except Exception as e:
        print(f"\n [CRITICAL ERROR] {e}")
        results["status"] = "ERROR"
        sys.exit(1)
    finally:
        elapsed = time.time() - start_time
        print("\n" + "="*60)
        print(f"Setup {args.mode} complete in {elapsed:.1f}s")
        for step in results["steps"]:
            print(f" - {step}")
        print("="*60)
        bq.close()
        vertex.close()
        maps.close()

if __name__ == "__main__":
    asyncio.run(main())
