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

// Filter- und Suchlogik
function filterResults() {
    const searchQuery = searchBar.value.toLowerCase(); // Eingabe aus Suchfeld
    const selectedJoint = jointFilter.value; // Ausgewähltes Gelenk
    const selectedMovement = movementFilter.value; // Ausgewählte Bewegung
    const selectedNerve = nerveFilter.value; // Ausgewählter Nerv

    // Filter anwenden
    const filtered = muscles.filter(muscle => {
        const matchesSearch = muscle.Name.toLowerCase().includes(searchQuery);
        const matchesJoint = !selectedJoint || muscle.Joints.includes(selectedJoint);
        const matchesMovement = !selectedMovement || muscle.Movements.includes(selectedMovement);
        const matchesNerve = !selectedNerve || muscle.Segments.includes(selectedNerve);
        return matchesSearch && matchesJoint && matchesMovement && matchesNerve;
    });

    // Ergebnisse anzeigen
    resultList.innerHTML = ""; // Alte Ergebnisse löschen
    if (filtered.length === 0) {
        // Nachricht anzeigen, wenn keine Ergebnisse gefunden wurden
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
