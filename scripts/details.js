function loadMuscleDetails() {
    const params = new URLSearchParams(window.location.search);
    const muscleName = params.get("name");

    const muscle = muscles.find(m => m.Name === muscleName);

    if (muscle) {
        let originsHTML = "";
        if (Array.isArray(muscle.Origin)) {
            muscle.Origin.forEach(origin => {
                originsHTML += `<p><strong>${origin.Part}:</strong> ${origin.Location}</p>`;
            });
        } else {
            originsHTML = `<p>${muscle.Origin || "Keine Daten verfügbar"}</p>`;
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
            ? `Bild von <a href="${muscle.Attribution.Source}" target="_blank">${muscle.Attribution.Author}</a>, lizenziert unter <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank">${muscle.Attribution.License}</a>.`
            : "Keine Lizenzinformationen verfügbar.";

        // Modal-Logik bleibt gleich ...
    } else {
        muscleDetailsContainer.innerHTML = "<p>Muskel nicht gefunden.</p>";
    }

    document.getElementById("back-button").addEventListener("click", () => {
        window.location.href = "index.html";
    });
}
