"""
EduAllocPro — Synthetic Teacher Generator
Generates 300 realistic Maharashtra teacher profiles for Nandurbar district.
Run: python -m data.gen_teachers
"""
import json
import random
import uuid
from datetime import datetime

import structlog

logger = structlog.get_logger()

# Maharashtra teacher name components
FIRST_NAMES_M = [
    "Rajesh", "Suresh", "Pradeep", "Anil", "Ramesh", "Vijay", "Santosh",
    "Mahesh", "Dinesh", "Ganesh", "Nilesh", "Umesh", "Yogesh", "Rakesh",
    "Naresh", "Girish", "Harish", "Manish", "Paresh", "Rupesh",
]
FIRST_NAMES_F = [
    "Sunita", "Kavita", "Anita", "Meena", "Priya", "Rekha", "Sushma",
    "Vandana", "Archana", "Madhuri", "Swati", "Pooja", "Neha", "Sneha",
    "Manisha", "Varsha", "Deepa", "Shobha", "Usha", "Lata",
]
SURNAMES = [
    "Patil", "Desai", "Jadhav", "Bhosale", "Shinde", "Pawar", "Kulkarni",
    "Chaudhari", "Wagh", "Nikam", "More", "Gaikwad", "Salve", "Gavit",
    "Tadvi", "Valvi", "Pawara", "Naik", "Borse", "Sonawane",
]
MIDDLE_NAMES = [
    "Kumar", "Ramesh", "Vishnu", "Suresh", "Dattatray", "Mohan",
    "Prakash", "Shankar", "Govind", "Narayan", "Balu", "Kisan",
]

SUBJECTS = [
    "Mathematics", "Science", "Physics", "Chemistry", "Biology",
    "English", "Marathi", "Hindi", "Social Studies", "History",
]
SUBJECT_COMBOS = [
    ["Mathematics", "Science"],
    ["Physics", "Chemistry"],
    ["Biology", "Chemistry"],
    ["Mathematics", "Physics"],
    ["English", "History"],
    ["Marathi", "Hindi"],
    ["Social Studies", "History"],
    ["Science", "Mathematics"],
    ["English", "Social Studies"],
    ["Mathematics"],
]

QUALIFICATIONS = [
    ("BSc BEd", 0.30),
    ("MSc BEd", 0.35),
    ("BA BEd",  0.20),
    ("MA BEd",  0.15),
]

DISTRICTS = [
    ("Nandurbar", 0.40),
    ("Dhule",     0.20),
    ("Nashik",    0.20),
    ("Jalgaon",   0.10),
    ("Pune",      0.05),
    ("Mumbai",    0.05),
]


def _weighted_choice(choices):
    items, weights = zip(*choices)
    return random.choices(items, weights=weights, k=1)[0]


def generate_teacher(idx: int) -> dict:
    gender = random.choice(["M", "F"])
    first = random.choice(FIRST_NAMES_M if gender == "M" else FIRST_NAMES_F)
    middle = random.choice(MIDDLE_NAMES)
    surname = random.choice(SURNAMES)
    name = f"{first} {middle} {surname}"

    qualification = _weighted_choice(QUALIFICATIONS)
    subjects = random.choice(SUBJECT_COMBOS)
    current_district = _weighted_choice(DISTRICTS)
    home_district = _weighted_choice(DISTRICTS)

    years_service = random.randint(1, 28)
    rural_years = random.randint(0, min(years_service, 10))
    transfer_count = max(0, int(random.expovariate(1.5)))  # Poisson-like
    transfer_count = min(transfer_count, 4)

    long_dist_consent = random.random() < 0.20

    # Languages: mr always, hi often, gn for tribal area teachers
    languages = ["mr"]
    if random.random() < 0.70:
        languages.append("hi")
    if random.random() < 0.15:
        languages.append("en")
    if current_district == "Nandurbar" and random.random() < 0.25:
        languages.append("gn")  # Gondi

    # Approximate lat/lng for current district
    district_coords = {
        "Nandurbar": (21.3661, 74.2167),
        "Dhule":     (20.9042, 74.7749),
        "Nashik":    (20.0059, 73.7898),
        "Jalgaon":   (21.0077, 75.5626),
        "Pune":      (18.5204, 73.8567),
        "Mumbai":    (19.0760, 72.8777),
    }
    base_lat, base_lng = district_coords.get(current_district, (21.0, 74.0))
    lat = base_lat + random.uniform(-0.5, 0.5)
    lng = base_lng + random.uniform(-0.5, 0.5)

    return {
        "teacher_id": str(uuid.uuid4()),
        "teacher_name": name,
        "gender": gender,
        "qualification": qualification,
        "subject_specialization": json.dumps(subjects),
        "languages_known": json.dumps(languages),
        "current_district": current_district,
        "home_district": home_district,
        "years_of_service": years_service,
        "rural_posting_years": rural_years,
        "transfer_request_count": transfer_count,
        "long_dist_consent": long_dist_consent,
        "is_synthetic": True,
        "consent_given": True,
        "current_school_id": None,
        "lat": round(lat, 4),
        "lng": round(lng, 4),
        "created_at": datetime.utcnow().isoformat(),
    }


def generate_teachers(count: int = 300) -> list[dict]:
    """Generate `count` synthetic teacher profiles."""
    random.seed(42)  # Reproducible for Phase 1
    teachers = [generate_teacher(i) for i in range(count)]
    logger.info("gen_teachers.done", count=len(teachers))
    return teachers


async def load_to_bigquery(teachers: list[dict], bq) -> None:
    """Load generated teachers to BigQuery teachers table."""
    logger.info("gen_teachers.bq_load.start", count=len(teachers))
    # BQ streaming insert in batches of 100
    batch_size = 100
    for i in range(0, len(teachers), batch_size):
        batch = teachers[i : i + batch_size]
        try:
            table_ref = bq._client.dataset(bq._dataset).table("teachers")
            errors = bq._client.insert_rows_json(table_ref, batch)
            if errors:
                logger.error("gen_teachers.bq_load.errors", errors=str(errors[:3]))
        except Exception as e:
            logger.error("gen_teachers.bq_load.error", error=str(e))
    logger.info("gen_teachers.bq_load.done")


if __name__ == "__main__":
    import csv
    import os

    teachers = generate_teachers(300)
    output_path = os.environ.get("TEACHER_CSV_PATH", "./data/sample/teachers_synth.csv")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        if teachers:
            writer = csv.DictWriter(f, fieldnames=teachers[0].keys())
            writer.writeheader()
            writer.writerows(teachers)

    print(f"Generated {len(teachers)} teachers → {output_path}")
