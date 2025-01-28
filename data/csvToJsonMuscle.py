import csv
import json

def csv_to_json(csv_file_path, json_file_path):
    with open(csv_file_path, mode='r', encoding='utf-8-sig') as csv_file:
        reader = csv.DictReader(csv_file, delimiter=';')  # Semikolon als Trenner
        reader.fieldnames = [field.strip() for field in reader.fieldnames]  # Spaltennamen bereinigen

        data = []
        for row in reader:
            try:
                # Erstellung der Grundstruktur für jeden Muskel
                muscle = {
                    "Name": row["Name"].strip(),
                    "Joints": row["Joints"].strip() if row["Joints"] else "",
                    "Movements": row["Movements"].strip() if row["Movements"] else "",
                    "Segments": row["Segments"].strip() if row["Segments"] else "",
                    "Image": f"assets/images/{row['Image'].strip()}" if row["Image"] else "",
                    "Origin": [],
                    "Insertion": [],
                    "Function": row["Function"].strip() if row["Function"] else "",
                    "Attribution": {
                        "Author": row["Attribution_Author"].strip() if row["Attribution_Author"] else "",
                        "License": row["Attribution_License"].strip() if row["Attribution_License"] else "",
                        "Source": row["Attribution_Source"].strip() if row["Attribution_Source"] else "",
                    },
                    "ImageSource": row["Image_Source"].strip() if row["Image_Source"] else "",
                }

                # Ursprung hinzufügen
                for i in range(1, 5):  # Gehe durch alle möglichen Ursprungsfelder
                    part_key = f"Origin_Part_{i}"
                    location_key = f"Origin_Location_{i}"
                    if row.get(location_key):  # Nur hinzufügen, wenn `Location` gefüllt ist
                        muscle["Origin"].append({
                            "Part": row.get(part_key, "").strip() if row.get(part_key) else "",
                            "Location": row[location_key].strip()
                        })

                # Ansatz hinzufügen
                for i in range(1, 4):  # Gehe durch alle möglichen Ansatzfelder
                    if row.get(f"Insertion_{i}") and row[f"Insertion_{i}"].strip():
                        muscle["Insertion"].append(row[f"Insertion_{i}"].strip())

                # Muskel zur Liste hinzufügen
                data.append(muscle)
            except KeyError as e:
                print(f"Fehlender Schlüssel: {e} in Zeile {row}")
                continue

    # JSON-Datei schreiben
    with open(json_file_path, mode='w', encoding='utf-8') as json_file:
        json.dump({"Sheet1": data}, json_file, ensure_ascii=False, indent=4)

# Beispielaufruf
csv_file_path = "Muskel-Liste Datenbank.csv"  # Ersetze durch deinen Dateinamen
json_file_path = "Muskel-Datenbank.json"
csv_to_json(csv_file_path, json_file_path)
