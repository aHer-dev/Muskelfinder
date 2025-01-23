csv_file = "/home/pepperboy8/projects/muskelfinder/data/muscles.csv"  # Pfad zur CSV-Datei
import csv
import json

csv_file = "muscles.csv"
json_file = "muscles.json"

data = []
with open(csv_file, encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        data.append(row)

with open(json_file, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=4)

print(f"CSV-Daten wurden in {json_file} konvertiert.")