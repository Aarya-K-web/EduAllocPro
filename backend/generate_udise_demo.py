import csv
import random
import os

def generate_full_district_csv(output_path: str, count: int = 847):
    headers = [
        "school_id", "school_name", "district_code", "district_name",
        "block_name", "enrollment_total", "lat", "lng", "stu_tea_ratio",
        "toilet_boys", "toilet_girls", "has_electricity", "num_classrooms",
        "nearest_town_km", "enrollment_boys", "enrollment_girls",
        "enrollment_3yr_ago", "district_aser_pct", "medium", "category",
        "management", "cluster_name",
        # Adding the vacancy flags required by the new ingestion logic
        "Vac_Math", "Vac_Sci", "Vac_Eng", "Vac_Mar", "Vac_Hin", "Vac_SST"
    ]
    
    blocks = ["Nandurbar Urban", "Shahada Rural", "Taloda Block", "Akkalkuwa", "Akrani", "Navapur"]
    
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        
        for i in range(count):
            school_id = f"2702{random.randint(1000000, 9999999)}"
            block = random.choice(blocks)
            enrollment = random.randint(50, 400)
            
            # Subject vacancies - roughly 10% chance for each subject to be vacant
            row = {
                "school_id": school_id,
                "school_name": f"ZP School {fake_school_name(i)}",
                "district_code": "NDB01",
                "district_name": "Nandurbar",
                "block_name": block,
                "enrollment_total": enrollment,
                "lat": round(21.3 + random.uniform(-0.5, 0.5), 4),
                "lng": round(74.2 + random.uniform(-0.5, 0.5), 4),
                "stu_tea_ratio": random.randint(20, 60),
                "toilet_boys": random.choice(["true", "false"]),
                "toilet_girls": random.choice(["true", "false"]),
                "has_electricity": random.choice(["true", "false"]),
                "num_classrooms": random.randint(2, 10),
                "nearest_town_km": random.randint(1, 40),
                "enrollment_boys": enrollment // 2,
                "enrollment_girls": enrollment // 2,
                "enrollment_3yr_ago": int(enrollment * random.uniform(0.8, 1.2)),
                "district_aser_pct": 45.5,
                "medium": "Marathi",
                "category": "Primary",
                "management": "Government",
                "cluster_name": f"{block} Center",
                "Vac_Math": "1" if random.random() < 0.15 else "0",
                "Vac_Sci": "1" if random.random() < 0.12 else "0",
                "Vac_Eng": "1" if random.random() < 0.10 else "0",
                "Vac_Mar": "1" if random.random() < 0.05 else "0",
                "Vac_Hin": "1" if random.random() < 0.08 else "0",
                "Vac_SST": "1" if random.random() < 0.07 else "0",
            }
            writer.writerow(row)

def fake_school_name(i):
    suffixes = ["Pura", "Gaon", "Wadi", "Khed", "Nagar"]
    names = ["Amba", "Pimpal", "Wagh", "Koli", "Mali", "Dhan", "Bhor"]
    return f"{random.choice(names)}{random.choice(suffixes)} {i}"

if __name__ == "__main__":
    path = "./backend/data/sample/udise_nandurbar.csv"
    os.makedirs(os.path.dirname(path), exist_ok=True)
    generate_full_district_csv(path)
    print(f"Generated 847 schools at {path}")
