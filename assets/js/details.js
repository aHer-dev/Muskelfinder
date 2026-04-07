const isGitHub = window.location.hostname.includes("github.io");
const basePath = isGitHub ? "/Muskelfinder" : "";

const elements = {
    licenseInfo: document.getElementById("licenseInfo"),
    muscleTitleName: document.getElementById("muscleTitlename"),
    muscleDetailsContainer: document.getElementById("muscleDetails"),
    modal: document.getElementById("imageModal"),
    modalImage: document.getElementById("modalImage"),
    modalPrevButton: document.getElementById("modalPrevButton"),
    modalNextButton: document.getElementById("modalNextButton"),
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
    if (elements.modalPrevButton) {
        elements.modalPrevButton.addEventListener('click', e => {
            e.stopPropagation();
            setActiveImage(_currentImageIndex - 1);
        });
    }
    if (elements.modalNextButton) {
        elements.modalNextButton.addEventListener('click', e => {
            e.stopPropagation();
            setActiveImage(_currentImageIndex + 1);
        });
    }
    if (elements.modal) {
        elements.modal.addEventListener('click', e => {
            if (e.target === elements.modal) closeModal();
        });
    }
    document.addEventListener('keydown', handleModalKeydown);
}

function closeModal() {
    if (elements.modal) elements.modal.style.display = "none";
}

function openModal(imageSrc) {
    if (elements.modalImage) elements.modalImage.src = imageSrc;
    if (elements.modal) elements.modal.style.display = "block";
    updateModalControls();
}

function isModalOpen() {
    return elements.modal?.style.display === "block";
}

function handleModalKeydown(event) {
    if (!isModalOpen()) return;

    if (event.key === 'Escape') {
        closeModal();
    } else if (event.key === 'ArrowLeft') {
        setActiveImage(_currentImageIndex - 1);
    } else if (event.key === 'ArrowRight') {
        setActiveImage(_currentImageIndex + 1);
    }
}

let _currentMuscle = null;
let _currentImages = [];
let _currentImageIndex = 0;

function isExpertMode() {
    return document.documentElement.dataset.expertMode === 'true';
}

// Wird von nav.js aufgerufen wenn der Modus gewechselt wird
function rerenderMuscleDetails() {
    if (_currentMuscle) renderMuscle(_currentMuscle);
}

function renderMuscle(muscle) {
    _currentMuscle = muscle;
    _currentImages = MuscleData.getImages(muscle);
    _currentImageIndex = 0;

    if (elements.muscleTitleName) {
        elements.muscleTitleName.textContent = muscle.Name;
    }

    const expert = isExpertMode();
    const easy = muscle.easy || {};
    const imageSrc = _currentImages[0] ? basePath + _currentImages[0] : "";

    const origin     = expert ? muscle.Origin    : (easy.Origin    || muscle.Origin);
    const insertion  = expert ? muscle.Insertion : (easy.Insertion || muscle.Insertion);
    const func       = expert ? muscle.Function  : (easy.Function  || muscle.Function);
    const segments   = expert ? muscle.Segments  : (easy.Segments  || muscle.Segments);

    elements.muscleDetailsContainer.innerHTML = `
        <section class="details-section">
            <div class="image-container${_currentImages.length === 0 ? ' image-container-empty' : ''}">
                ${renderImageBlock(muscle.Name, imageSrc)}
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

    bindImageGallery();

    if (elements.licenseInfo) {
        const attribution = muscle.Attribution;
        const authorLabel = attribution?.Author || 'Unbekannt';
        const licenseLabel = attribution?.License || 'Lizenz unbekannt';
        const authorHref = attribution?.AuthorUrl || '';
        const licenseHref = attribution?.LicenseUrl || '';
        const sourceHref = attribution?.SourceUrl || '';
        const authorMarkup = authorHref
            ? `<a href="${authorHref}" target="_blank" class="license-link">${authorLabel}</a>`
            : authorLabel;
        const licenseMarkup = licenseHref
            ? `<a href="${licenseHref}" target="_blank" class="license-link">${licenseLabel}</a>`
            : licenseLabel;
        const sourceMarkup = sourceHref
            ? ` · <a href="${sourceHref}" target="_blank" class="license-link">Quelle</a>`
            : '';

        elements.licenseInfo.innerHTML = attribution
            ? `Bild von ${authorMarkup}, lizenziert unter ${licenseMarkup}${sourceMarkup}`
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

function renderImageBlock(muscleName, imageSrc) {
    if (_currentImages.length === 0) {
        return `
            <div class="image-placeholder">
                Für diesen Muskel ist aktuell noch kein Bild hinterlegt.
            </div>
        `;
    }

    const controls = _currentImages.length > 1
        ? `
            <div class="image-controls" aria-label="Bildnavigation">
                <button
                    type="button"
                    class="image-nav image-nav-prev"
                    data-nav-direction="prev"
                    aria-label="Vorheriges Bild">
                    ‹
                </button>
                <div class="image-dots" aria-label="Alle Bilder">
                    ${_currentImages.map((src, index) => `
                        <button
                            type="button"
                            class="image-dot${index === 0 ? ' active' : ''}"
                            data-image-index="${index}"
                            aria-label="Bild ${index + 1} von ${_currentImages.length}">
                        </button>
                    `).join('')}
                </div>
                <button
                    type="button"
                    class="image-nav image-nav-next"
                    data-nav-direction="next"
                    aria-label="Nächstes Bild">
                    ›
                </button>
            </div>
        `
        : '';

    return `
        <div class="image-stage">
            <img src="${imageSrc}" alt="${muscleName}"
                 class="zoomable-image" loading="lazy">
        </div>
        ${controls}
    `;
}

function bindImageGallery() {
    const img = document.querySelector('.zoomable-image');
    if (img) {
        img.addEventListener('click', () => openModal(img.src));
    }

    document.querySelectorAll('[data-image-index]').forEach(button => {
        button.addEventListener('click', () => {
            setActiveImage(Number(button.dataset.imageIndex));
        });
    });

    document.querySelectorAll('[data-nav-direction]').forEach(button => {
        button.addEventListener('click', () => {
            const direction = button.dataset.navDirection;
            const nextIndex = direction === 'next'
                ? _currentImageIndex + 1
                : _currentImageIndex - 1;
            setActiveImage(nextIndex);
        });
    });

    updateGalleryControls();
}

function updateGalleryControls() {
    document.querySelectorAll('[data-image-index]').forEach(button => {
        const isActive = Number(button.dataset.imageIndex) === _currentImageIndex;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-current', isActive ? 'true' : 'false');
    });

    const prevButton = document.querySelector('[data-nav-direction="prev"]');
    const nextButton = document.querySelector('[data-nav-direction="next"]');
    const isFirst = _currentImageIndex === 0;
    const isLast = _currentImageIndex === _currentImages.length - 1;

    if (prevButton) prevButton.disabled = isFirst;
    if (nextButton) nextButton.disabled = isLast;
    updateModalControls();
}

function updateModalControls() {
    const isFirst = _currentImageIndex === 0;
    const isLast = _currentImageIndex === _currentImages.length - 1;
    const hasMultipleImages = _currentImages.length > 1;

    if (elements.modalPrevButton) {
        elements.modalPrevButton.disabled = !hasMultipleImages || isFirst;
        elements.modalPrevButton.hidden = !hasMultipleImages;
    }
    if (elements.modalNextButton) {
        elements.modalNextButton.disabled = !hasMultipleImages || isLast;
        elements.modalNextButton.hidden = !hasMultipleImages;
    }
}

function setActiveImage(index) {
    if (!_currentImages[index]) return;
    _currentImageIndex = index;

    const img = document.querySelector('.zoomable-image');
    if (img) {
        img.src = basePath + _currentImages[_currentImageIndex];
    }

    if (elements.modalImage && isModalOpen()) {
        elements.modalImage.src = basePath + _currentImages[_currentImageIndex];
    }

    updateGalleryControls();
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
