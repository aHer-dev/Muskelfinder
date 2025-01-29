const licenseInfo = document.getElementById("license-info");
const muscleTitleName = document.getElementById("muscle-Titlename");
const muscleDetailsContainer = document.getElementById("muscle-details");

// Modal-Elemente auswählen
const modal = document.getElementById("image-modal");
const modalImage = document.getElementById("modal-image");
const closeButton = document.querySelector(".close-button");

window.onload = function() {
    document.getElementById("image-modal").style.display = "none";
};

// Fehlerbehandlung: Existenz der Elemente prüfen
if (!muscleDetailsContainer) {
    console.error("Fehler: Das Element #muscle-details wurde nicht gefunden.");
}
if (!modal || !modalImage || !closeButton) {
    console.error("Fehler: Modal-Elemente fehlen.");
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

    if (!muscle) {
        muscleDetailsContainer.innerHTML = "<p>Muskel nicht gefunden.</p>";
        return;
    }

    muscleTitleName.innerHTML = muscle.Name;

    // Ursprung korrekt formatieren
    let originsHTML = "";
    if (Array.isArray(muscle.Origin)) {
        muscle.Origin.forEach(origin => {
            if (origin.Part && origin.Part.trim() !== "") {
                originsHTML += `<p><strong>${origin.Part}:</strong> ${origin.Location}</p>`;
            } else {
                originsHTML += `<p>${origin.Location}</p>`; // Falls "Part" leer ist, kein ":" anzeigen
            }
        });
    }

    // Ansatz korrekt formatieren
    let insertionsHTML = "";
    if (Array.isArray(muscle.Insertion)) {
        muscle.Insertion.forEach(insertion => {
            insertionsHTML += `<p>${insertion}</p>`; // Direkt als Liste darstellen
        });
    } else {
        insertionsHTML = `<p>${muscle.Insertion || "Keine Daten verfügbar"}</p>`;
    }

    // Muskelinformationen in HTML einfügen
    muscleDetailsContainer.innerHTML = `
        <section class="details-section">
            <div class="image-container">
                <img src="${muscle.Image}" alt="${muscle.Name}" id="muscle-image" style="cursor: pointer; max-width: 400px;">
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

    // Lizenzinformationen einfügen
    licenseInfo.innerHTML = muscle.Attribution
        ? `Bild von <a href="${muscle.ImageSource}" target="_blank">${muscle.Attribution.Author}</a>, lizenziert unter <a href="${muscle.Attribution.Source}" target="_blank">${muscle.Attribution.License}</a>.`
        : "Keine Lizenzinformationen verfügbar.";

    // ** MODAL FUNKTIONIEREND MACHEN **
    const muscleImage = document.getElementById("muscle-image"); // Bild erneut auswählen
    if (muscleImage) {
        function openModal() {
            modal.style.display = "block";
            modalImage.src = document.getElementById("muscle-image").src;
        }
        
        function closeModal() {
            modal.style.display = "none";
        }
        
        function outsideClick(event) {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        }
    }

    // Event: Modal schließen mit "X"
    closeButton.addEventListener("click", () => {
        modal.style.display = "none";
    });

    // Event: Modal schließen bei Klick außerhalb
    modal.addEventListener("click", event => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });

    // Event: Zurück-Button
    document.getElementById("back-button").addEventListener("click", () => {
        window.location.href = "index.html";
    });
}