// Globale Elementreferenzen zentral verwalten
const elements = {
    licenseInfo: document.getElementById("license-info"),
    muscleTitleName: document.getElementById("muscle-Titlename"),
    muscleDetailsContainer: document.getElementById("muscle-details"),
    modal: document.getElementById("image-modal"),
    modalImage: document.getElementById("modal-image"),
    closeButton: document.querySelector(".close-button"),
    backButton: document.getElementById("back-button")
};

// Initialisierung nach DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Elemente auf Existenz prüfen
    if (!checkElements()) return;

    // Event-Listener für Modal initialisieren
    initModal();
    
    // Modal load BUG - opens instantly without this
    window.onload = function() {
        document.getElementById("image-modal").style.display = "none";
    };
    
    // Daten laden und verarbeiten
    fetchMuscleData().then(loadMuscleDetails).catch(handleError);
});

function checkElements() {
    const requiredElements = [
        'muscleDetailsContainer', 'modal', 'modalImage', 
        'closeButton', 'backButton', 'licenseInfo'
    ];
    
    return requiredElements.every(key => {
        if (!elements[key]) {
            console.error(`Fehler: Element ${key} nicht gefunden`);
            return false;
        }
        return true;
    });
}

async function fetchMuscleData() {
    const response = await fetch("/data/muscles.json");
    if (!response.ok) throw new Error('Netzwerkfehler');
    return response.json();
}

function handleError(error) {
    console.error("Fehler:", error.message);
    elements.muscleDetailsContainer.innerHTML = 
        '<p>Daten konnten nicht geladen werden</p>';
}

function initModal() {
    // Event-Listener für Schließen
    elements.closeButton.addEventListener('click', closeModal);
    elements.modal.addEventListener('click', event => 
        event.target === elements.modal && closeModal()
    );
}

function closeModal() {
    elements.modal.style.display = "none";
}

function openModal(imageSrc) {
    elements.modalImage.src = imageSrc;
    elements.modal.style.display = "block";
}

function createInfoHTML(title, content) {
    return `
        <div class="info-box">
            <h2>${title}</h2>
            ${content}
        </div>
    `;
}

function loadMuscleDetails(data) {
    const params = new URLSearchParams(window.location.search);
    const muscle = data.Sheet1.find(m => m.Name === params.get("name"));

    if (!muscle) {
        elements.muscleDetailsContainer.innerHTML = "<p>Muskel nicht gefunden</p>";
        return;
    }

    // Seitentitel aktualisieren
    elements.muscleTitleName.textContent = muscle.Name;

    // HTML Generierung
    elements.muscleDetailsContainer.innerHTML = `
        <section class="details-section">
            <div class="image-container">
                <img src="/${muscle.Image}" alt="${muscle.Name}" 
                     class="zoomable-image" style="max-width: 400px;">
            </div>
            <div class="info-container">
                ${createInfoHTML('Ursprung', formatOrigin(muscle.Origin))}
                ${createInfoHTML('Ansatz', formatInsertion(muscle.Insertion))}
                ${createInfoHTML('Funktion', muscle.Function || "Keine Daten verfügbar")}
                ${createInfoHTML('Innervation', muscle.Segments || "Keine Daten verfügbar")}
            </div>
        </section>
    `;

    // Lizenzinformationen
    elements.licenseInfo.innerHTML = muscle.Attribution 
        ? generateAttribution(muscle) 
        : "Keine Lizenzinformationen verfügbar";

    // Event-Listener für Bild hinzufügen
    document.querySelector('.zoomable-image')?.addEventListener('click', () => 
        openModal(muscle.Image)
    );
}

function formatOrigin(origin) {
    if (!Array.isArray(origin)) return "<p>Keine Daten verfügbar</p>";
    
    return origin.map(item => 
        item.Part?.trim() 
            ? `<p><strong>${item.Part}:</strong> ${item.Location}</p>`
            : `<p>${item.Location}</p>`
    ).join('');
}

function formatInsertion(insertion) {
    if (!Array.isArray(insertion)) return `<p>${insertion || "Keine Daten verfügbar"}</p>`;
    
    return insertion.map(item => `<p>${item}</p>`).join('');
}

function generateAttribution(muscle) {
    return `Bild von <a href="${muscle.ImageSource}" target="_blank">${muscle.Attribution.Author}</a>, 
            lizenziert unter <a href="${muscle.Attribution.Source}" target="_blank">${muscle.Attribution.License}</a>`;
}

// Back-Button Event-Listener
elements.backButton.addEventListener('click', () => 
    window.location.href = "/sites/index.html"
);