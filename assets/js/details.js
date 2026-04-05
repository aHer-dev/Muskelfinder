const isGitHub = window.location.hostname.includes("github.io");
const basePath = isGitHub ? "/Muskelfinder" : "";

const elements = {
    licenseInfo: document.getElementById("licenseInfo"),
    muscleTitleName: document.getElementById("muscleTitlename"),
    muscleDetailsContainer: document.getElementById("muscleDetails"),
    modal: document.getElementById("imageModal"),
    modalImage: document.getElementById("modalImage"),
    closeButton: document.querySelector(".closeButton"),
    backButton: document.getElementById("backButton")
};

document.addEventListener('DOMContentLoaded', async () => {
    if (elements.modal) elements.modal.style.display = "none";
    initModal();

    try {
        await MuscleData.loadConfig();
        const config = MuscleData.getConfig();
        const allRegions = config.regions.map(r => r.id);
        await MuscleData.loadSelected(allRegions);
        const params = new URLSearchParams(window.location.search);
        const name = params.get("name");
        const muscle = MuscleData.getAll().find(m => m.Name === name);
        if (muscle) {
            renderMuscle(muscle);
        } else {
            elements.muscleDetailsContainer.innerHTML = "<p>Muskel nicht gefunden.</p>";
        }
    } catch (error) {
        console.error("Fehler:", error);
        elements.muscleDetailsContainer.innerHTML = '<p>Daten konnten nicht geladen werden.</p>';
    }
});

function initModal() {
    if (elements.closeButton) {
        elements.closeButton.addEventListener('click', closeModal);
    }
    if (elements.modal) {
        elements.modal.addEventListener('click', e => {
            if (e.target === elements.modal) closeModal();
        });
    }
}

function closeModal() {
    if (elements.modal) elements.modal.style.display = "none";
}

function openModal(imageSrc) {
    if (elements.modalImage) elements.modalImage.src = imageSrc;
    if (elements.modal) elements.modal.style.display = "block";
}

let _currentMuscle = null;

function isExpertMode() {
    return document.documentElement.dataset.expertMode === 'true';
}

// Wird von nav.js aufgerufen wenn der Modus gewechselt wird
function rerenderMuscleDetails() {
    if (_currentMuscle) renderMuscle(_currentMuscle);
}

function renderMuscle(muscle) {
    _currentMuscle = muscle;

    if (elements.muscleTitleName) {
        elements.muscleTitleName.textContent = muscle.Name;
    }

    const expert = isExpertMode();
    const easy = muscle.easy || {};
    const imageSrc = basePath + muscle.Image;

    const origin     = expert ? muscle.Origin    : (easy.Origin    || muscle.Origin);
    const insertion  = expert ? muscle.Insertion : (easy.Insertion || muscle.Insertion);
    const func       = expert ? muscle.Function  : (easy.Function  || muscle.Function);
    const segments   = expert ? muscle.Segments  : (easy.Segments  || muscle.Segments);

    elements.muscleDetailsContainer.innerHTML = `
        <section class="details-section">
            <div class="image-container">
                <img src="${imageSrc}" alt="${muscle.Name}"
                     class="zoomable-image" loading="lazy">
            </div>
            <div class="info-container">
                ${infoBox('Ursprung', expert ? formatOrigin(origin) : formatText(origin))}
                ${infoBox('Ansatz', expert ? formatOrigin(insertion) : formatText(insertion))}
                ${muscle.Movements ? infoBox('Bewegung', formatText(muscle.Movements)) : ''}
                ${infoBox('Funktion', formatText(func))}
                ${infoBox('Innervation', formatText(segments))}
                ${muscle.clinicalNote ? infoBox('Klinischer Bezug', formatText(muscle.clinicalNote)) : ''}
            </div>
        </section>
    `;

    const img = document.querySelector('.zoomable-image');
    if (img) img.addEventListener('click', () => openModal(imageSrc));

    if (elements.licenseInfo) {
        elements.licenseInfo.innerHTML = muscle.Attribution
            ? `Bild von <a href="${muscle.ImageSource}" target="_blank" class="license-link">
               ${muscle.Attribution.Author}</a>, lizenziert unter
               <a href="${muscle.Attribution.Source}" target="_blank" class="license-link">
               ${muscle.Attribution.License}</a>`
            : "Keine Lizenzinformationen verfügbar";
    }
}

function infoBox(title, content) {
    return `
        <div class="info-box">
            <h2>${title}</h2>
            ${content}
        </div>
    `;
}

function formatOrigin(origin) {
    if (typeof origin === 'string') return `<p>${origin}</p>`;
    if (!Array.isArray(origin)) return "<p>Keine Daten verfügbar</p>";
    return origin.map(item => {
        if (typeof item === 'string') return `<p>${item}</p>`;
        return item.Part?.trim()
            ? `<p><strong>${item.Part}:</strong> ${item.Location}</p>`
            : `<p>${item.Location}</p>`;
    }).join('');
}

function formatText(text) {
    return `<p>${text || 'Keine Daten verfügbar'}</p>`;
}