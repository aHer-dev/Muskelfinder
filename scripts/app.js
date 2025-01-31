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

async function loadMuscleData() {
    try {
        elements.loading.style.display = 'block';
        const response = await fetch('data/muscles.json');
        
        if (!response.ok) throw new Error('Netzwerkfehler');
        
        const data = await response.json();
        muscles = data.Sheet1;
        filterResults();
    } catch (error) {
        console.error('Fehler:', error);
        elements.resultList.innerHTML = '<li>Daten konnten nicht geladen werden</li>';
    } finally {
        elements.loading.style.display = 'none';
    }
}

function generateNerveDropdown() {
    const fragment = document.createDocumentFragment();
    
    // Standardoption
    const defaultOption = new Option('Alle Segmente', '');
    fragment.appendChild(defaultOption);

    // Gruppen und Segmente hinzufügen
    Object.entries(spinalSegments).forEach(([group, segments]) => {
        // Optgroup für die Kategorie
        const groupElement = document.createElement('optgroup');
        groupElement.label = group;
        
        // Einzelne Segmente
        segments.forEach(segment => {
            groupElement.appendChild(new Option(segment, segment));
        });
        
        fragment.appendChild(groupElement);
    });

    elements.nerveFilter.appendChild(fragment);
}

function setupEventListeners() {
    // Sofortiges Filtern bei Änderungen
    [elements.searchBar, elements.jointFilter, 
     elements.movementFilter, elements.nerveFilter].forEach(element => {
        element.addEventListener('input' in element ? 'input' : 'change', () => {
            filterResults();
        });
    });

    // Debounce für Suchfeld
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
    
    const muscleSegments = muscle.Segments.split(',').map(s => s.trim());
    const segmentCategory = Object.values(spinalSegments)
                               .find(segments => segments.includes(selectedNerve));
    
    return segmentCategory 
        ? segmentCategory.some(s => muscleSegments.includes(s))
        : muscleSegments.includes(selectedNerve);
}

function displayResults(results) {
    elements.resultList.innerHTML = results.length > 0 
        ? results.map(muscle => `
            <li class="result-item">
                <a href="muscle-details.html?name=${encodeURIComponent(muscle.Name)}" 
                   class="result-link">
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