/**
 * muscle-selection.js
 * Verwaltet welche Muskeln im Karteikasten sind.
 *
 * OBEN:  Muskeln im Karteikasten (Fach, Fälligkeit, Entfernen)
 * UNTEN: Muskeln noch nicht im Karteikasten (Checkboxen, Suche, Subgruppen-Filter)
 */


const FACH_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#06b6d4'];

let allMuscles     = [];
let activeSubgroup = 'all'; // Filter für "nicht im Deck"

// ── Init ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const loading  = document.getElementById('loading');
    const content  = document.getElementById('ms-content');
    loading.style.display = 'block';

    try {
        await MuscleData.loadConfig();
        const config = MuscleData.getConfig();
        await MuscleData.loadSelected(config.regions.map(r => r.id));
        allMuscles = MuscleData.getAll();

        buildSubgroupTabs(config.regions);
        render();
        bindEvents();

        loading.style.display = 'none';
        content.hidden = false;
    } catch (err) {
        loading.textContent = '⚠️ Fehler: ' + err.message;
        loading.style.color = '#ef4444';
        console.error('muscle-selection init error:', err);
    }
});

// ── Render ────────────────────────────────────────────────────────
function render() {
    renderInDeck();
    renderNotInDeck();
}

function renderInDeck() {
    const inDeck = allMuscles.filter(m => ProgressManager.isInDeck(m.Name));
    const badge  = document.getElementById('in-deck-count');
    const wrap   = document.getElementById('in-deck-table-wrap');
    const empty  = document.getElementById('in-deck-empty');
    const tbody  = document.getElementById('in-deck-tbody');

    badge.textContent = inDeck.length;

    if (inDeck.length === 0) {
        wrap.hidden  = true;
        empty.hidden = false;
        return;
    }
    wrap.hidden  = false;
    empty.hidden = true;

    // Sortiert: erst nach Fach (aufsteigend), dann nach Fälligkeit
    inDeck.sort((a, b) => {
        const ca = ProgressManager.getCardState(a.Name);
        const cb = ProgressManager.getCardState(b.Name);
        if (ca.fach !== cb.fach) return ca.fach - cb.fach;
        return new Date(ca.nextDue) - new Date(cb.nextDue);
    });

    tbody.innerHTML = inDeck.map(m => {
        const cs    = ProgressManager.getCardState(m.Name);
        const color = FACH_COLORS[cs.fach];
        const sgLabel = SUBGROUP_LABELS[m.subgroup] || m.subgroup;
        return `
        <tr>
            <td class="ms-muscle-name">${m.Name}</td>
            <td class="ms-subgroup">${sgLabel}</td>
            <td>
                <span class="ms-fach-badge" style="background:${color}22;color:${color};border-color:${color}55">
                    Fach ${cs.fach}
                </span>
            </td>
            <td class="ms-due">${formatDue(cs.nextDue)}</td>
            <td>
                <button class="ms-remove-btn" data-name="${escHtml(m.Name)}" title="Aus Karteikasten entfernen">✕</button>
            </td>
        </tr>`;
    }).join('');

    document.getElementById('in-deck-count').textContent = inDeck.length;
}

function renderNotInDeck() {
    const search   = document.getElementById('ms-search').value.trim().toLowerCase();
    const notInDeck = allMuscles.filter(m => !ProgressManager.isInDeck(m.Name));

    const filtered = notInDeck.filter(m => {
        if (activeSubgroup !== 'all' && m.subgroup !== activeSubgroup) return false;
        if (search && !m.Name.toLowerCase().includes(search)) return false;
        return true;
    });

    document.getElementById('not-in-deck-count').textContent = notInDeck.length;
    updateSelectedCount();

    const list = document.getElementById('not-in-deck-list');
    if (filtered.length === 0) {
        list.innerHTML = '<p class="ms-empty-hint">Keine Muskeln gefunden.</p>';
        return;
    }

    list.innerHTML = filtered.map(m => {
        const sgLabel = SUBGROUP_LABELS[m.subgroup] || m.subgroup;
        return `
        <label class="ms-check-item">
            <input type="checkbox" class="ms-muscle-cb" value="${escHtml(m.Name)}">
            <span class="ms-check-name">${m.Name}</span>
            <span class="ms-check-sg">${sgLabel}</span>
        </label>`;
    }).join('');

    // Checkbox-Events
    document.querySelectorAll('.ms-muscle-cb').forEach(cb => {
        cb.addEventListener('change', updateSelectedCount);
    });
}

// ── Subgruppen-Tabs ───────────────────────────────────────────────
function buildSubgroupTabs(regions) {
    const tabs = document.getElementById('subgroup-tabs');

    const allBtn = document.createElement('button');
    allBtn.className = 'ms-tab active';
    allBtn.dataset.sg = 'all';
    allBtn.textContent = 'Alle';
    tabs.appendChild(allBtn);

    regions.forEach(region => {
        region.subgroups.forEach(sg => {
            const btn = document.createElement('button');
            btn.className = 'ms-tab';
            btn.dataset.sg = sg.id;
            btn.textContent = SUBGROUP_LABELS[sg.id] || sg.name;
            tabs.appendChild(btn);
        });
    });
}

// ── Hilfsfunktionen ───────────────────────────────────────────────
function formatDue(isoString) {
    const due  = new Date(isoString);
    const now  = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = Math.round((due - now) / 86400000);

    if (diff <= 0)  return '<span class="due-today">Heute</span>';
    if (diff === 1) return '<span class="due-soon">Morgen</span>';
    if (diff <= 7)  return `<span class="due-soon">In ${diff} Tagen</span>`;
    if (diff <= 30) return `In ${Math.ceil(diff / 7)} Wochen`;
    return due.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function escHtml(str) {
    return str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getCheckedNames() {
    return [...document.querySelectorAll('.ms-muscle-cb:checked')].map(cb => cb.value);
}

function updateSelectedCount() {
    const count  = getCheckedNames().length;
    const addBtn = document.getElementById('add-selected-btn');
    document.getElementById('selected-count').textContent = count;
    addBtn.disabled = count === 0;
}

function addMusclesAndRefresh(names) {
    ProgressManager.addCards(names);
    render();
    updateSelectedCount();
}

// ── Toggle "Im Karteikasten" ──────────────────────────────────────
let inDeckCollapsed = false;

function toggleInDeck() {
    inDeckCollapsed = !inDeckCollapsed;
    const header = document.getElementById('in-deck-toggle');
    const body   = document.getElementById('in-deck-body');
    header.setAttribute('aria-expanded', String(!inDeckCollapsed));
    body.classList.toggle('ms-collapsed', inDeckCollapsed);
}

// ── Events ────────────────────────────────────────────────────────
function bindEvents() {
    document.getElementById('in-deck-toggle').addEventListener('click', toggleInDeck);
    // Suche
    document.getElementById('ms-search').addEventListener('input', renderNotInDeck);

    // Subgruppen-Tabs
    document.getElementById('subgroup-tabs').addEventListener('click', e => {
        const btn = e.target.closest('.ms-tab');
        if (!btn) return;
        activeSubgroup = btn.dataset.sg;
        document.querySelectorAll('.ms-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        renderNotInDeck();
    });

    // Ausgewählte hinzufügen
    document.getElementById('add-selected-btn').addEventListener('click', () => {
        const names = getCheckedNames();
        if (names.length === 0) return;
        addMusclesAndRefresh(names);
    });

    // Alle sichtbaren hinzufügen
    document.getElementById('add-visible-btn').addEventListener('click', () => {
        const names = [...document.querySelectorAll('.ms-muscle-cb')].map(cb => cb.value);
        if (names.length === 0) return;
        addMusclesAndRefresh(names);
    });

    // Entfernen-Buttons (delegiert)
    document.getElementById('in-deck-tbody').addEventListener('click', e => {
        const btn = e.target.closest('.ms-remove-btn');
        if (!btn) return;
        const name = btn.dataset.name;
        AppDialog.confirm(`„${name}" aus dem Karteikasten entfernen?`).then(ok => {
            if (ok) { ProgressManager.removeCard(name); render(); }
        });
    });
}
