import pandas as pd

import os
if not os.path.exists(excel_file):
    print(f"Fehler: Die Datei '{excel_file}' wurde nicht gefunden.")
    exit(1)

# Excel-Datei laden
excel_file = 'muscles.xlsx'  # Name deiner Excel-Datei
data = pd.read_excel(excel_file)

# Daten in JSON konvertieren
json_file = 'muscles.json'  # Ziel-Datei
data.to_json(json_file, orient='records', indent=4)

print(f"Die JSON-Datei wurde erstellt: {json_file}")