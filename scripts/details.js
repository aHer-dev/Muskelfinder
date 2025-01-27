// Muskel-Details laden
const muscleDetailsContainer = document.getElementById("muscle-details");
const licenseInfo = document.getElementById("license-info");
let muscles = [];

// JSON-Daten laden
fetch("data/muscles.json")
    .then(response => {
        if (!response.ok) {
            throw new Error("Fehler beim Laden der JSON-Datei");
        }
        return response.json();
    })
    .then(data => {
        muscles = data.Sheet1; // JSON-Daten speichern
        loadMuscleDetails(); // Muskel-Details laden
    })
    .catch(error => console.error("Fehler:", error));

// Funktion: Muskel-Details dynamisch laden und anzeigen
function loadMuscleDetails() {
    // Muskelname aus der URL lesen
    const params = new URLSearchParams(window.location.search);
    const muscleName = params.get("name");

    // Passenden Muskel aus JSON-Daten finden
    const muscle = muscles.find(m => m.Name === muscleName);

    if (muscle) {
        // Ursprung dynamisch erzeugen
        let originsHTML = "";
        if (Array.isArray(muscle.Origin)) {
            muscle.Origin.forEach(origin => {
                originsHTML += `<p><strong>${origin.Part}:</strong> ${origin.Location}</p>`;
            });
        } else {
            originsHTML = `<p>${muscle.Origin || "Keine Daten verfügbar"}</p>`;
        }

        // Ansatz dynamisch erzeugen
        let insertionsHTML = "";
        if (Array.isArray(muscle.Insertion)) {
            muscle.Insertion.forEach(insertion => {
                insertionsHTML += `<p><strong>${insertion.Part}:</strong> ${insertion.Location}</p>`;
            });
        } else {
            insertionsHTML = `<p>${muscle.Insertion || "Keine Daten verfügbar"}</p>`;
        }

        // Muskelinformationen dynamisch anzeigen
        muscleDetailsContainer.innerHTML = `
            <section class="details-section">
                <div class="image-container">
                    <img src="${muscle.Image}" alt="${muscle.Name}">
                </div>
                <div class="info-container">
                    <div class="info-box">
                        <h2>Ursprung</h2>
                        ${originsHTML}
                    </div>
                    <div class="info-box">
                        <h2>Ansatz</h2>
                        ${insertionsHTML}
                    </div>
                    <div class="info-box">
                        <h2>Funktion</h2>
                        <p>${muscle.Function || "Keine Daten verfügbar"}</p>
                    </div>
                    <div class="info-box">
                        <h2>Innervation</h2>
                        <p>${muscle.Segments || "Keine Daten verfügbar"}</p>
                    </div>
                </div>
            </section>
        `;

        // Lizenzinformationen dynamisch anzeigen
        licenseInfo.innerHTML = muscle.Attribution
            ? `Bild von <a href="${muscle.Attribution.Source}" target="_blank">${muscle.Attribution.Author}</a>, lizenziert unter <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank">${muscle.Attribution.License}</a>.`
            : "Keine Lizenzinformationen verfügbar.";
    
        // Modal-Elemente definieren
        const modal = document.getElementById("image-modal");
        const modalImage = document.getElementById("modal-image");
        const closeButton = document.querySelector(".close-button");
    
        // Event: Bild anklicken, um Modal zu öffnen
        const muscleImage = muscleDetailsContainer.querySelector(".image-container img");
        if (muscleImage) {
            muscleImage.addEventListener("click", () => {
                modal.style.display = "block";
                modalImage.src = muscleImage.src; // Bild in Modal laden
                modalImage.alt = muscleImage.alt;
            });
        }
    
        // Event: Modal schließen
        closeButton.addEventListener("click", () => {
            modal.style.display = "none";
        });
    
        // Event: Modal schließen bei Klick außerhalb des Bildes
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        });
    } else {
        muscleDetailsContainer.innerHTML = "<p>Muskel nicht gefunden.</p>";
    }

    // Event-Listener für den Zurück-Button
    document.getElementById("back-button").addEventListener("click", () => {
        window.location.href = "index.html"; // Navigiert zur Hauptsuchseite
    });
}