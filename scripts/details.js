const licenseInfo = document.getElementById("license-info");

if (!licenseInfo) {
    console.error("Fehler: Das Element #license-info wurde nicht gefunden.");
}

const muscleTitleName = document.getElementById("muscle-Titlename");

if (!licenseInfo) {
    console.error("Fehler: Das Element #license-info wurde nicht gefunden.");
}

const muscleDetailsContainer = document.getElementById("muscle-details");

function loadMuscleDetails() {
    if (!muscleDetailsContainer) {
        console.error("Fehler: Das Element #muscle-details wurde nicht gefunden.");
        return;
    }
    console.log("muscleDetailsContainer erfolgreich gefunden:", muscleDetailsContainer);
}

    // JSON-Daten laden und verarbeiten
    fetch("data/muscles.json")
        .then(response => response.json())
        .then(data => {
            muscles = data.Sheet1;
            loadMuscleDetails();
        })
        .catch(error => console.error("Fehler beim Laden der JSON-Datei:", error));

function loadMuscleDetails() {
    const params = new URLSearchParams(window.location.search);
    const muscleName = params.get("name");

    const muscle = muscles.find(m => m.Name === muscleName);

    muscleTitleName.innerHTML = muscle.Name

    if (muscle) {
       let originsHTML = "";
if (Array.isArray(muscle.Origin)) {
    muscle.Origin.forEach(origin => {
        if (origin.Part) {
            originsHTML += `<p><strong>${origin.Part}:</strong> ${origin.Location}</p>`;
        } else {
            originsHTML += `<p>${origin.Location}</p>`; // Falls Part leer ist, kein ":" anzeigen
        }
    });
}

        let insertionsHTML = "";
        if (Array.isArray(muscle.Insertion)) {
            muscle.Insertion.forEach(insertion => {
                insertionsHTML += `<p>${insertion}</p>`; // Insertion wird korrekt dargestellt
            });
        } else {
            insertionsHTML = `<p>${muscle.Insertion || "Keine Daten verfügbar"}</p>`;
        }

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
                        ${insertionsHTML} <!-- Korrigierter Ansatz -->
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

        licenseInfo.innerHTML = muscle.Attribution
            ? `Bild von <a href="${muscle.ImageSource}" target="_blank">${muscle.Attribution.Author}</a>, lizenziert unter <a href="${muscle.Attribution.Source}" target="_blank">${muscle.Attribution.License}</a>.`
            : "Keine Lizenzinformationen verfügbar.";

        // Modal-Logik bleibt gleich ...
    } else {
        muscleDetailsContainer.innerHTML = "<p>Muskel nicht gefunden.</p>";
    }

    document.getElementById("back-button").addEventListener("click", () => {
        window.location.href = "index.html";
    });
}
