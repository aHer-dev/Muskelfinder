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
    filtered.forEach(muscle => {
        const li = document.createElement("li");
        li.textContent = `${muscle.Name} - Gelenke: ${muscle.Joints}, Bewegungen: ${muscle.Movements}, Innervation: ${muscle.Segments}`;
        resultList.appendChild(li);
    });
}

// Event-Listener hinzufügen
searchBar.addEventListener("input", filterResults); // Auf Eingabe reagieren
document.getElementById("filter-button").addEventListener("click", filterResults); // Auf Button-Klick reagieren
