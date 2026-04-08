function getBasePath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return '';

    const first = parts[0];
    if (first.endsWith('.html') || ['quizzes', 'assets', 'data'].includes(first)) {
        return '';
    }

    return `/${first}`;
}

const basePath = getBasePath();
const SEARCH_STATE_KEY = 'muskelfinder_search_state';
const THREE_ANATOMY_PROD_URL = 'https://aher-dev.github.io/3DAnatomy/';
let supported3DMuscleKeysPromise = null;

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
    initBackButton();

    try {
        await MuscleData.loadConfig();
        const config = MuscleData.getConfig();
        const allRegions = config.regions.map(r => r.id);
        await MuscleData.loadSelected(allRegions);
        const params = new URLSearchParams(window.location.search);
        const name = params.get("name");
        const muscle = MuscleData.getAll().find(m => m.Name === name);
        if (muscle) {
            await renderMuscle(muscle);
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

function initBackButton() {
    if (!elements.backButton) return;

    elements.backButton.addEventListener('click', event => {
        const hasSearchState = sessionStorage.getItem(SEARCH_STATE_KEY);
        if (!hasSearchState) return;

        event.preventDefault();
        window.location.href = `${basePath}/index.html`;
    });
}

function closeModal() {
    if (elements.modal) elements.modal.style.display = "none";
}

function openModal(imageSrc, altText = 'Vergrößertes Muskelbild') {
    if (elements.modalImage) {
        elements.modalImage.src = imageSrc;
        elements.modalImage.alt = altText;
    }
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
let _imageLoadToken = 0;

function isExpertMode() {
    return document.documentElement.dataset.expertMode === 'true';
}

// Wird von nav.js aufgerufen wenn der Modus gewechselt wird
function rerenderMuscleDetails() {
    if (_currentMuscle) renderMuscle(_currentMuscle);
}

function buildMuscleKey(name = '') {
    const normalized = String(name)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/^m\.\s*/, '')
        .replace(/^musculus\s+/, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/_+/g, '_');

    return normalized ? `m_${normalized}` : '';
}

function get3DAnatomyBaseUrl() {
    if (window.location.hostname.includes('github.io')) {
        return THREE_ANATOMY_PROD_URL;
    }

    try {
        return new URL('../3DAnatomy/index.html', window.location.href).href;
    } catch (error) {
        return THREE_ANATOMY_PROD_URL;
    }
}

function build3DAnatomyUrl(muscleName) {
    const url = new URL(get3DAnatomyBaseUrl(), window.location.href);
    const muscleKey = buildMuscleKey(muscleName);

    if (muscleKey) {
        url.searchParams.set('muscleKey', muscleKey);
    }
    if (muscleName) {
        url.searchParams.set('muscle', muscleName);
    }
    url.searchParams.set('source', 'muskelfinder');
    url.searchParams.set('returnTo', window.location.href);

    return url.toString();
}

function get3DMappingUrl() {
    return new URL('data/muskelfinder-map.json', get3DAnatomyBaseUrl()).toString();
}

async function getSupported3DMuscleKeys() {
    if (!supported3DMuscleKeysPromise) {
        supported3DMuscleKeysPromise = fetch(get3DMappingUrl())
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Mapping konnte nicht geladen werden (${response.status})`);
                }
                return response.json();
            })
            .then(mapping => {
                const entries = Array.isArray(mapping?.entries) ? mapping.entries : [];
                return new Set(entries.map(entry => entry?.muscleKey).filter(Boolean));
            })
            .catch(error => {
                console.warn('3D-Mapping nicht verfügbar:', error);
                return new Set();
            });
    }

    return supported3DMuscleKeysPromise;
}

async function isMuscleSupportedIn3D(muscleName) {
    const muscleKey = buildMuscleKey(muscleName);
    if (!muscleKey) return false;

    const supportedKeys = await getSupported3DMuscleKeys();
    return supportedKeys.has(muscleKey);
}

function renderDetailsActions(muscle, is3DSupported) {
    const muscleName = muscle?.Name || '';
    if (!muscleName || !is3DSupported) {
        return '';
    }

    const url = build3DAnatomyUrl(muscleName);
    return `
        <div class="details-actions" aria-label="Aktionen zur Muskelansicht">
        <a href="${url}"
           class="quiz-button detail-3d-link"
           aria-label="${muscleName} in 3D ansehen">
            In 3D ansehen
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
        </a>
        </div>
    `;
}

async function renderMuscle(muscle) {
    _currentMuscle = muscle;
    _currentImages = MuscleData.getImages(muscle);
    _currentImageIndex = 0;
    const is3DSupported = await isMuscleSupportedIn3D(muscle.Name);

    if (elements.muscleTitleName) {
        elements.muscleTitleName.textContent = muscle.Name;
    }

    const expert = isExpertMode();
    const easy = muscle.easy || {};
    const origin     = expert ? muscle.Origin    : (easy.Origin    || muscle.Origin);
    const insertion  = expert ? muscle.Insertion : (easy.Insertion || muscle.Insertion);
    const func       = expert ? muscle.Function  : (easy.Function  || muscle.Function);
    const segments   = expert ? muscle.Segments  : (easy.Segments  || muscle.Segments);

    elements.muscleDetailsContainer.innerHTML = `
        <section class="details-section">
            <div class="image-container${_currentImages.length === 0 ? ' image-container-empty' : ''}">
                ${renderImageBlock(muscle.Name)}
                ${renderDetailsActions(muscle, is3DSupported)}
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
    void renderActiveImage({ fetchPriority: 'high' });
    void MuscleData.preloadImages(_currentImages.slice(1));

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
        const overviewMarkup = ` · <a href="${basePath}/quellen-lizenzen.html" class="license-link">Mehr zu Quellen & Lizenzen</a>`;

        elements.licenseInfo.innerHTML = attribution
            ? `Bild von ${authorMarkup}, lizenziert unter ${licenseMarkup}${sourceMarkup}${overviewMarkup}`
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

function renderImageBlock(muscleName) {
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
        <div class="image-stage is-loading">
            <img alt="${muscleName}"
                 class="zoomable-image"
                 decoding="async"
                 fetchpriority="high">
        </div>
        ${controls}
    `;
}

function bindImageGallery() {
    const img = document.querySelector('.zoomable-image');
    if (img) {
        img.addEventListener('click', () => {
            if (img.src) openModal(img.src, _currentMuscle?.Name || 'Vergrößertes Muskelbild');
        });
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

function normalizeImageIndex(index) {
    const imageCount = _currentImages.length;
    if (imageCount === 0) return -1;

    return ((index % imageCount) + imageCount) % imageCount;
}

function updateGalleryControls() {
    document.querySelectorAll('[data-image-index]').forEach(button => {
        const isActive = Number(button.dataset.imageIndex) === _currentImageIndex;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-current', isActive ? 'true' : 'false');
    });

    const prevButton = document.querySelector('[data-nav-direction="prev"]');
    const nextButton = document.querySelector('[data-nav-direction="next"]');
    const hasMultipleImages = _currentImages.length > 1;

    if (prevButton) prevButton.disabled = !hasMultipleImages;
    if (nextButton) nextButton.disabled = !hasMultipleImages;
    updateModalControls();
}

function updateModalControls() {
    const hasMultipleImages = _currentImages.length > 1;

    if (elements.modalPrevButton) {
        elements.modalPrevButton.disabled = !hasMultipleImages;
        elements.modalPrevButton.hidden = !hasMultipleImages;
    }
    if (elements.modalNextButton) {
        elements.modalNextButton.disabled = !hasMultipleImages;
        elements.modalNextButton.hidden = !hasMultipleImages;
    }
}

function setActiveImage(index) {
    const normalizedIndex = normalizeImageIndex(index);
    if (normalizedIndex < 0 || !_currentImages[normalizedIndex]) return;

    _currentImageIndex = normalizedIndex;
    updateGalleryControls();
    void renderActiveImage();
}

async function renderActiveImage(options = {}) {
    const imagePath = _currentImages[_currentImageIndex];
    const img = document.querySelector('.zoomable-image');
    const stage = img?.closest('.image-stage');
    if (!imagePath || !img) return;

    const token = ++_imageLoadToken;
    img.dataset.imagePath = imagePath;
    img.classList.remove('is-ready');
    stage?.classList.add('is-loading');

    try {
        const resolvedPath = await MuscleData.preloadImage(imagePath, options);
        if (token !== _imageLoadToken || img.dataset.imagePath !== imagePath) return;

        img.src = resolvedPath;
        img.alt = _currentMuscle?.Name || 'Muskelbild';
        img.classList.add('is-ready');

        if (elements.modalImage && isModalOpen()) {
            elements.modalImage.src = resolvedPath;
            elements.modalImage.alt = _currentMuscle?.Name || 'Vergrößertes Muskelbild';
        }
    } catch (error) {
        console.warn('Bild konnte nicht geladen werden:', imagePath, error);
    } finally {
        if (token === _imageLoadToken) {
            stage?.classList.remove('is-loading');
        }
    }
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
