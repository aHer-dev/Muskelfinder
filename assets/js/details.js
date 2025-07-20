// ✅ Dynamische Erkennung: GitHub Pages oder Localhost?
const isGitHub = window.location.hostname.includes("github.io");
const basePath = isGitHub ? "/Muskelfinder/" : "";

// Globale Elementreferenzen zentral verwalten
const elements = {
    licenseInfo: document.getElementById("licenseInfo"),
    muscleTitleName: document.getElementById("muscleTitlename"),
    muscleDetailsContainer: document.getElementById("muscleDetails"),
    modal: document.getElementById("imageModal"),
    modalImage: document.getElementById("modalImage"),
    closeButton: document.querySelector(".closeButton"),
    backButton: document.getElementById("backButton")
};

// Initialisierung nach DOM ready
document.addEventListener('DOMContentLoaded', () => {
    console.log("closeButton:", elements.closeButton);
    console.log("modal:", elements.modal);

    if (!checkElements()) {
        console.error("Nicht alle Elemente gefunden – Skript stoppt. Überprüfe IDs in muscle-details.html.");
        return;
    }
    initModal();
    if (elements.modal) elements.modal.style.display = "none";
    fetchMuscleData().then(loadMuscleDetails).catch(handleError);
});

function checkElements() {
    const required = {
        licenseInfo: 'licenseInfo',
        muscleTitleName: 'muscleTitlename',
        muscleDetailsContainer: 'muscleDetails',
        modal: 'imageModal',
        modalImage: 'modalImage',
        closeButton: '.closeButton (class)',
        backButton: 'backButton'
    };
    
    let allFound = true;
    Object.keys(required).forEach(key => {
        if (!elements[key]) {
            console.error(`Fehler: Element ${key} nicht gefunden. Überprüfe muscle-details.html auf ID/class '${required[key]}'.`);
            allFound = false;
        }
    });
    return allFound;
}

async function fetchMuscleData() {
    console.log("Fetching from:", basePath + 'data/muscles.json'); // Debug
    const response = await fetch(basePath + 'data/muscles.json');
    if (!response.ok) throw new Error('Netzwerkfehler beim Laden von muscles.json: ' + response.status);
    return response.json();
}

function handleError(error) {
    console.error("Fehler:", error.message);
    if (elements.muscleDetailsContainer) {
        elements.muscleDetailsContainer.innerHTML = '<p>Daten konnten nicht geladen werden. Überprüfe JSON oder URL.</p>';
    }
}

function initModal() {
    if (elements.closeButton) {
        elements.closeButton.addEventListener('click', closeModal);
    }
    if (elements.modal) {
        elements.modal.addEventListener('click', event => {
            if (event.target === elements.modal) closeModal();
        });
    }
}

function closeModal() {
    if (elements.modal) {
        elements.modal.style.display = "none";
    }
}

function openModal(imageSrc) {
    console.log("Original imageSrc:", imageSrc);

    if (!imageSrc.startsWith("http")) {
        imageSrc = (basePath ? basePath : '') + imageSrc.replace(/^\/+/, "");
        console.log("Adjusted imageSrc for modal:", imageSrc); // Debug
    }

    console.log("Bereinigter imageSrc:", imageSrc);

    setTimeout(() => {
        if (elements.modalImage) {
            console.log("Final imageSrc (im Modal):", elements.modalImage.src);
            if (elements.modalImage.src.includes("/sites/")) {
                elements.modalImage.src = elements.modalImage.src.replace("/sites/", "/");
                console.warn("Korrektur: /sites/ entfernt.");
            }
        }
    }, 50);

    if (elements.modalImage) {
        elements.modalImage.src = imageSrc;
    }
    if (elements.modal) {
        elements.modal.style.display = "block";
    }
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
        if (elements.muscleDetailsContainer) {
            elements.muscleDetailsContainer.innerHTML = "<p>Muskel nicht gefunden.</p>";
        }
        return;
    }

    if (elements.muscleTitleName) {
        elements.muscleTitleName.textContent = muscle.Name;
    }

    if (elements.muscleDetailsContainer) {
        const imageUrl = `${basePath}${muscle.Image.replace(/^\/+/, '')}`;
        console.log("Generated image URL:", imageUrl); // Debug
        if (!imageUrl.startsWith('http') && !imageUrl.includes('/Muskelfinder/')) {
            console.warn("Ungültiger Bildpfad, fallback verwendet:", basePath + 'assets/images/default.png');
            imageUrl = basePath + 'assets/images/default.png'; // Fallback-Bild
        }
        elements.muscleDetailsContainer.innerHTML = `
            <section class="details-section">
                <div class="image-container">
                    <img src="${imageUrl}" alt="${muscle.Name}" class="zoomable-image" style="max-width: 400px;">
                </div>
                <div class="info-container">
                    ${createInfoHTML('Ursprung', formatOrigin(muscle.Origin))}
                    ${createInfoHTML('Ansatz', formatInsertion(muscle.Insertion))}
                    ${createInfoHTML('Funktion', muscle.Function || "Keine Daten verfügbar")}
                    ${createInfoHTML('Innervation', muscle.Segments || "Keine Daten verfügbar")}
                </div>
            </section>
        `;

        const zoomableImage = document.querySelector('.zoomable-image');
        if (zoomableImage) {
            zoomableImage.addEventListener('click', () => openModal(muscle.Image));
        }
    }

    if (elements.licenseInfo) {
        elements.licenseInfo.innerHTML = muscle.Attribution 
            ? generateAttribution(muscle) 
            : "Keine Lizenzinformationen verfügbar";
    }
}

function formatOrigin(origin) {
    if (typeof origin === 'string') return "<p>" + origin + "</p>";
    if (!Array.isArray(origin)) return "<p>Keine Daten verfügbar</p>";
    return origin.map(item => 
        item.Part?.trim() 
            ? `<p><strong>${item.Part}:</strong> ${item.Location}</p>`
            : `<p>${item.Location}</p>`
    ).join('');
}

function formatInsertion(insertion) {
    if (typeof insertion === 'string') return "<p>" + insertion + "</p>";
    if (!Array.isArray(insertion)) return `<p>${insertion || "Keine Daten verfügbar"}</p>`;
    return insertion.map(item => `<p>${item}</p>`).join('');
}

function generateAttribution(muscle) {
    return `Bild von <a href="${muscle.ImageSource}" target="_blank" class="license-link">${muscle.Attribution.Author}</a>, 
            lizenziert unter <a href="${muscle.Attribution.Source}" target="_blank" class="license-link">${muscle.Attribution.License}</a>`;
}

if (elements.backButton) {
    elements.backButton.addEventListener('click', () => {
        window.location.href = basePath + 'index.html';
        console.log("Navigating to:", basePath + 'index.html'); // Debug
    });
}