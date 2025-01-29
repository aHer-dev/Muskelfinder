// HTML-Elemente auswählen
const searchBar = document.getElementById("search-bar");
const jointFilter = document.getElementById("joint-filter");
const movementFilter = document.getElementById("movement-filter");
const nerveFilter = document.getElementById("nerve-filter");
const resultList = document.getElementById("result-list");

// Variable für die JSON-Daten
let muscles = [];

// JSON-Datei laden
fetch("data/muscles.json")
    .then(response => {
        if (!response.ok) {
            throw new Error("Fehler beim Laden der JSON-Datei");
        }
        return response.json();
    })
    .then(data => {
        muscles = data.Sheet1; // JSON-Daten in die Variable speichern
        console.log("Daten erfolgreich geladen:", muscles);
    })
    .catch(error => console.error("Fehler:", error));

    // **Spinalsegmente einmalig beim Seitenaufbau ins Dropdown einfügen**
 const spinalSegments = {
    "Cervical (Alle)": ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"],
    "Thoracal (Alle)": ["TH1", "TH2", "TH3", "TH4", "TH5", "TH6", "TH7", "TH8", "TH9", "TH10", "TH11", "TH12"],
    "Lumbal (Alle)": ["L1", "L2", "L3", "L4", "L5"],
    "Sacral (Alle)": ["S1", "S2", "S3", "S4", "S5"]
 };

// **Dropdown-Menü für Nerven generieren**
function generateNerveDropdown() {
    const nerveFilter = document.getElementById("nerve-filter");
    nerveFilter.innerHTML = '<option value="">Alle Segmente</option>'; // Standardoption

    // Hauptgruppen und Segmente hinzufügen
    Object.entries(spinalSegments).forEach(([group, segments]) => {
        // Hauptgruppe als auswählbare Option
        let groupOption = document.createElement("option");
        groupOption.value = group;  // Jetzt auswählbar
        groupOption.textContent = group;
        groupOption.style.fontWeight = "bold"; // Fett machen zur Unterscheidung
        nerveFilter.appendChild(groupOption);

        // Einzelne Segmente der Gruppe hinzufügen
        segments.forEach(segment => {
            let option = document.createElement("option");
            option.value = segment;
            option.textContent = `  ${segment}`; // Einrückung für bessere Übersicht
            nerveFilter.appendChild(option);
        });
    });
}

// Dropdown-Menü beim Laden der Seite einmal erstellen
generateNerveDropdown();


// Filter- und Suchlogik
function filterResults() {
    const searchQuery = searchBar.value.toLowerCase(); // Eingabe aus Suchfeld
    const selectedJoint = jointFilter.value; // Ausgewähltes Gelenk
    const selectedMovement = movementFilter.value; // Ausgewählte Bewegung
    const selectedNerve = nerveFilter.value; // Ausgewählter Nerv

    let filtered = muscles;

    // Falls "Obere Extremitäten" gewählt wurde, mehrere Gelenke berücksichtigen
    if (selectedJoint === "Schultergürtel, Art. humeri, Art. cubiti, Art. manus, MCP, PIP, DIP, Daumensattelgelenk") {
        const jointList = ["Schultergürtel", "Art. humeri", "Art. cubiti", "Art. manus", "MCP", "PIP", "DIP", "Daumensattelgelenk"]; // Einzelne Gelenke als Liste
filtered = filtered.filter(muscle => 
        jointList.some(joint => muscle.Joints.split(",").map(j => j.trim()).includes(joint))
    );
} 
    else if (selectedJoint === "MCP, PIP, DIP, Daumensattelgelenk") {
        const jointListFinger = ["MCP", "PIP", "DIP", "Daumensattelgelenk"]; // Einzelne Gelenke als Liste
        filtered = filtered.filter(muscle => 
            jointListFinger.some(joint => muscle.Joints.split(",").map(j => j.trim()).includes(joint))
        );
    }
    else if (selectedJoint) {
    // Falls ein einzelnes Gelenk gewählt wurde
    filtered = filtered.filter(muscle => muscle.Joints.split(",").map(j => j.trim()).includes(selectedJoint));
}

    // Bewegung filtern
    if (selectedMovement) {
        filtered = filtered.filter(muscle => muscle.Movements.includes(selectedMovement));
    }

    // **Innervation filtern**
    if (selectedNerve) {
        if (spinalSegments[selectedNerve]) {
            // Falls eine Gruppe (z. B. "Thoracal (Alle)") ausgewählt wurde, alle darunterliegenden Segmente filtern
            const segmentList = spinalSegments[selectedNerve]; 
            filtered = filtered.filter(muscle => muscle.Segments.split(",").some(seg => segmentList.includes(seg.trim())));
        } else {
            // Falls ein einzelnes Segment (z. B. "Th5") ausgewählt wurde
            filtered = filtered.filter(muscle => muscle.Segments.split(",").map(s => s.trim()).includes(selectedNerve));
        }
    }

    // Suchbegriff filtern
    filtered = filtered.filter(muscle => muscle.Name.toLowerCase().includes(searchQuery));

    // Ergebnisse anzeigen
    resultList.innerHTML = ""; // Alte Ergebnisse löschen
    if (filtered.length === 0) {
        resultList.innerHTML = "<li>Keine Ergebnisse gefunden</li>";
        return;
    }
    
     // Ergebnisse dynamisch erstellen
     filtered.forEach(muscle => {
        const li = document.createElement("li"); // Neues Listenelement erstellen
        li.className = "result-item"; // Styling-Klasse hinzufügen
        
        // Link erstellen
        const link = document.createElement("a");
        link.href = `muscle-details.html?name=${encodeURIComponent(muscle.Name)}`; // Detailseite-Link
        link.textContent = muscle.Name; // Muskelname als Link-Text
        link.className = "result-link"; // Styling-Klasse für den Link

        // Muskelinformationen als Vorschau
        const info = document.createElement("p");
        info.textContent = `Gelenke: ${muscle.Joints} | Bewegungen: ${muscle.Movements} | Innervation: ${muscle.Segments}`;
        info.className = "result-info"; // Styling-Klasse für die Vorschau

        // Link und Vorschau hinzufügen
        li.appendChild(link);
        li.appendChild(info);

        // Element zur Ergebnisliste hinzufügen
        resultList.appendChild(li);
    });
}
// Event-Listener hinzufügen
searchBar.addEventListener("input", filterResults); // Auf Eingabe reagieren
document.getElementById("filter-button").addEventListener("click", filterResults); // Auf Button-Klick reagieren
