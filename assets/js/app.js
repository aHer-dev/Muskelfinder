const isGitHub = window.location.hostname.includes("github.io");
const basePath = isGitHub ? "/Muskelfinder" : "";
const SEARCH_STATE_KEY = 'muskelfinder_search_state';


const el = {
    searchBar: document.getElementById('search-bar'),
    regionFilter: document.getElementById('region-filter'),
    jointFilter: document.getElementById('joint-filter'),
    movementFilter: document.getElementById('movement-filter'),
    nerveFilter: document.getElementById('nerve-filter'),
    resultList: document.getElementById('result-list'),
    resultCount: document.getElementById('result-count'),
    resetButton: document.getElementById('reset-filters'),
    loading: document.getElementById('loading')
};

document.addEventListener('DOMContentLoaded', async () => {
    el.loading.style.display = 'block';

    handleResetRequest();

    const config = await MuscleData.loadConfig();
    const allRegionIds = config.regions.map(r => r.id);
    await MuscleData.loadSelected(allRegionIds);

    el.loading.style.display = 'none';

    const restoredFilters = restoreFilters();
    updateFiltersAndResults(restoredFilters);
    setupEventListeners();
});

function setupEventListeners() {
    el.searchBar.addEventListener('input', () => updateFiltersAndResults());
    el.regionFilter.addEventListener('change', () => updateFiltersAndResults());
    el.jointFilter.addEventListener('change', () => updateFiltersAndResults());
    el.movementFilter.addEventListener('change', () => updateFiltersAndResults());
    el.nerveFilter.addEventListener('change', () => updateFiltersAndResults());
    el.resetButton.addEventListener('click', resetFilters);
}

function resetFilters() {
    el.searchBar.value = '';
    el.regionFilter.value = '';
    el.jointFilter.value = '';
    el.movementFilter.value = '';
    el.nerveFilter.value = '';
    clearSavedFilters();
    updateFiltersAndResults();
}

function handleResetRequest() {
    const url = new URL(window.location.href);
    if (url.searchParams.get('resetSearch') !== '1') return;

    clearSavedFilters();
    url.searchParams.delete('resetSearch');
    const query = url.searchParams.toString();
    window.history.replaceState({}, '', url.pathname + (query ? `?${query}` : '') + url.hash);
}

function restoreFilters() {
    try {
        const raw = sessionStorage.getItem(SEARCH_STATE_KEY);
        if (!raw) return null;

        const saved = JSON.parse(raw);
        el.searchBar.value = saved.search || '';
        return {
            searchInput: saved.search || '',
            search: (saved.search || '').trim().toLowerCase(),
            region: saved.region || '',
            joint: saved.joint || '',
            movement: saved.movement || '',
            nerve: saved.nerve || ''
        };
    } catch (error) {
        console.warn('Gespeicherte Suchfilter konnten nicht geladen werden:', error);
        clearSavedFilters();
        return null;
    }
}

function saveFilters() {
    const state = {
        search: el.searchBar.value.trim(),
        region: el.regionFilter.value,
        joint: el.jointFilter.value,
        movement: el.movementFilter.value,
        nerve: el.nerveFilter.value
    };
    sessionStorage.setItem(SEARCH_STATE_KEY, JSON.stringify(state));
}

function clearSavedFilters() {
    sessionStorage.removeItem(SEARCH_STATE_KEY);
}

function getActiveFilters() {
    return {
        search: el.searchBar.value.trim().toLowerCase(),
        region: el.regionFilter.value,
        joint: el.jointFilter.value,
        movement: el.movementFilter.value,
        nerve: el.nerveFilter.value
    };
}

function applyFilters({ search, region, joint, movement, nerve }) {
    return MuscleData.getAll().filter(m => {
        if (search && !m.Name.toLowerCase().includes(search)) return false;
        if (region && m.region !== region) return false;
        if (joint && !splitTrim(m.Joints).includes(joint)) return false;
        if (movement && !splitTrim(m.Movements).includes(movement)) return false;
        if (nerve && !splitTrim(m.Segments).includes(nerve)) return false;
        return true;
    });
}

// Returns muscles matching all filters except the one named in `exclude`
function getMusclesWithout(exclude, filters = getActiveFilters()) {
    const f = filters;
    return applyFilters({
        search: f.search,
        region: exclude === 'region' ? '' : f.region,
        joint: exclude === 'joint' ? '' : f.joint,
        movement: exclude === 'movement' ? '' : f.movement,
        nerve: exclude === 'nerve' ? '' : f.nerve
    });
}

function splitTrim(str) {
    return (str || '').split(',').map(s => s.trim()).filter(Boolean);
}

function updateFiltersAndResults(restoredFilters = null) {
    const hasOverride = restoredFilters
        && typeof restoredFilters === 'object'
        && !('target' in restoredFilters)
        && ['search', 'region', 'joint', 'movement', 'nerve'].some(key => key in restoredFilters);
    const f = hasOverride ? restoredFilters : getActiveFilters();
    const filtered = applyFilters(f);

    // Rebuild each dropdown: options come from muscles filtered by everything *except* that dropdown
    rebuildSelect(
        el.regionFilter, 'Alle Regionen',
        [...new Set(getMusclesWithout('region', f).map(m => m.region))].sort(),
        v => REGION_LABELS[v] || v,
        f.region
    );
    rebuildSelect(
        el.jointFilter, 'Alle Gelenke',
        [...new Set(getMusclesWithout('joint', f).flatMap(m => splitTrim(m.Joints)))].sort(),
        v => v,
        f.joint
    );
    rebuildSelect(
        el.movementFilter, 'Alle Bewegungen',
        [...new Set(getMusclesWithout('movement', f).flatMap(m => splitTrim(m.Movements)))].sort(),
        v => v,
        f.movement
    );
    rebuildSelect(
        el.nerveFilter, 'Alle Innervationen',
        [...new Set(getMusclesWithout('nerve', f).flatMap(m => splitTrim(m.Segments)))].sort(),
        v => v,
        f.nerve
    );

    if (hasOverride) {
        el.searchBar.value = restoredFilters.searchInput || '';
    }
    saveFilters();
    displayResults(filtered);
}

function rebuildSelect(selectEl, defaultLabel, options, labelFn, currentValue) {
    selectEl.innerHTML = `<option value="">${defaultLabel}</option>`;
    options.forEach(value => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = labelFn(value);
        if (value === currentValue) opt.selected = true;
        selectEl.appendChild(opt);
    });
}

function displayResults(results) {
    const count = results.length;
    el.resultCount.textContent = count === 1 ? '1 Muskel gefunden' : `${count} Muskeln gefunden`;

    if (count === 0) {
        el.resultList.innerHTML = '<li class="no-results">Keine passenden Muskeln gefunden</li>';
        return;
    }

    el.resultList.innerHTML = results.map(m => {
        const regionLabel = REGION_LABELS[m.region] || m.region;
        const subgroupLabel = SUBGROUP_LABELS[m.subgroup] || m.subgroup || '';
        const meta = subgroupLabel ? `${regionLabel} · ${subgroupLabel}` : regionLabel;
        return `
        <li class="result-item">
            <a href="${basePath}/muscle-details.html?name=${encodeURIComponent(m.Name)}" class="result-link">
                <span class="result-name">${m.Name}</span>
                <span class="result-meta">${meta}</span>
                <span class="result-movements">${m.Movements}</span>
            </a>
        </li>`;
    }).join('');
}
