// ✅ Dynamische Erkennung: GitHub Pages oder Localhost?
const isGitHub = window.location.hostname.includes("github.io");
const basePath = isGitHub ? "/Muskelfinder/" : "";

// DOM-Elemente
const elements = {
    searchBar: document.getElementById('search-bar'),
    jointFilter: document.getElementById('joint-filter'),
    movementFilter: document.getElementById('movement-filter'),
    nerveFilter: document.getElementById('nerve-filter'),
    resultList: document.getElementById('result-list'),
    loading: document.getElementById('loading')
};

// Muskel-Daten und Konfiguration
let muscles = [];
const spinalSegments = {
    "Cervical": ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"],
    "Thoracal": ["TH1", "TH2", "TH3", "TH4", "TH5", "TH6", "TH7", "TH8", "TH9", "TH10", "TH11", "TH12"],
    "Lumbal": ["L1", "L2", "L3", "L4", "L5"],
    "Sacral": ["S1", "S2", "S3", "S4", "S5"]
};

// Initialisierung
document.addEventListener('DOMContentLoaded', () => {
    initFilters();
    loadMuscleData();
});

function initFilters() {
    generateNerveDropdown();
    setupEventListeners();
}

function matchesJoint(muscle, selectedJoint) {
    if (!selectedJoint) return true;

    const muscleJoints = muscle.Joints.split(',').map(j => j.trim());
    const jointGroups = {
        'Obere Extremitäten': ['Schultergürtel', 'Art. humeri', 'Art. cubiti', 'Art. manus'],
        'Fingergelenke': ['MCP', 'PIP', 'DIP', 'Daumensattelgelenk'],
        'Untere Extremitäten': ['Art. coxae', 'Art. genus', 'Art. talocruralis'],
        'Rumpf': ['Rumpf', 'Wirbelsäule']
    };

    if (jointGroups[selectedJoint]) {
        return jointGroups[selectedJoint].some(j => muscleJoints.includes(j));
    }
    return muscleJoints.includes(selectedJoint);
}

async function loadMuscleData() {
    try {
        elements.loading.style.display = 'block';
        const response = await fetch(basePath + 'data/muscles.json'); // Use basePath
        if (!response.ok) {
            // Try alternative path if the first fails
            const alternativeResponse = await fetch(basePath + 'data/muscles.json');
            if (!alternativeResponse.ok) throw new Error('JSON-Datei nicht gefunden: ' + response.status);
            const data = await alternativeResponse.json();
            muscles = data.Sheet1;
        } else {
            const data = await response.json();
            muscles = data.Sheet1;
        }
        if (!muscles || muscles.length === 0) throw new Error('Keine Muskeln in der JSON-Datei');
        filterResults();
    } catch (error) {
        console.error('Fehler:', error);
        elements.resultList.innerHTML = `<li>Fehler: ${error.message}. Stelle sicher, dass muscles.json im /data/ Ordner liegt.</li>`;
    } finally {
        elements.loading.style.display = 'none';
    }
}

function generateNerveDropdown() {
    const fragment = document.createDocumentFragment();
    const defaultOption = new Option('Alle Segmente', '');
    fragment.appendChild(defaultOption);

    Object.entries(spinalSegments).forEach(([group, segments]) => {
        const groupElement = document.createElement('optgroup');
        groupElement.label = group;
        segments.forEach(segment => {
            groupElement.appendChild(new Option(segment, segment));
        });
        fragment.appendChild(groupElement);
    });

    elements.nerveFilter.appendChild(fragment);
}

function setupEventListeners() {
    [elements.searchBar, elements.jointFilter, elements.movementFilter, elements.nerveFilter].forEach(element => {
        element.addEventListener('input' in element ? 'input' : 'change', () => {
            filterResults();
        });
    });

    let timeout;
    elements.searchBar.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(filterResults, 300);
    });
}

function filterResults() {
    const filters = {
        search: elements.searchBar.value.trim().toLowerCase(),
        joint: elements.jointFilter.value,
        movement: elements.movementFilter.value,
        nerve: elements.nerveFilter.value,
    };

    const filtered = muscles.filter(muscle => {
        return (
            matchesSearch(muscle, filters.search) &&
            matchesJoint(muscle, filters.joint) &&
            matchesMovement(muscle, filters.movement) &&
            matchesNerve(muscle, filters.nerve)
        );
    });

    displayResults(filtered);
}

// Filter-Hilfsfunktionen
function matchesSearch(muscle, query) {
    return muscle.Name.toLowerCase().includes(query);
}

function matchesJoint(muscle, selectedJoint) {
    if (!selectedJoint) return true;
    const muscleJoints = muscle.Joints.split(',').map(j => j.trim());
    const jointGroups = {
        'Obere Extremitäten': ['Schultergürtel', 'Art. humeri', 'Art. cubiti', 'Art. manus'],
        'Fingergelenke': ['MCP', 'PIP', 'DIP', 'Daumensattelgelenk']
    };
    if (jointGroups[selectedJoint]) {
        return jointGroups[selectedJoint].some(j => muscleJoints.includes(j));
    }
    return muscleJoints.includes(selectedJoint);
}

function matchesMovement(muscle, selectedMovement) {
    return !selectedMovement || muscle.Movements.includes(selectedMovement);
}

function matchesNerve(muscle, selectedNerve) {
    if (!selectedNerve) return true;
    const segmentsText = muscle.Segments.replace(/[^C,T,H,L,S,0-9, ]/g, '');
    const muscleSegments = segmentsText.split(',').map(s => s.trim());
    return muscleSegments.includes(selectedNerve);
}

// ✅ Korrigierte Funktion: Links zur Muskel-Detailseite sind dynamisch
function displayResults(results) {
    elements.resultList.innerHTML = results.length > 0
        ? results.map(muscle => `
            <li class="result-item">
                <a href="${basePath}muscle-details.html?name=${encodeURIComponent(muscle.Name)}" class="result-link">
                    ${muscle.Name}
                </a>
                <div class="result-info">
                    <p>Gelenke: ${muscle.Joints}</p>
                    <p>Bewegungen: ${muscle.Movements}</p>
                    <p>Innervation: ${muscle.Segments}</p>
                </div>
            </li>
        `).join('')
        : '<li class="no-results">Keine passenden Muskeln gefunden</li>';
}