/**
 * quiz-filter.js — Gemeinsames Filter-Modul für Quiz-Seiten
 *
 * Verwendung:
 *   quiz.html:              QuizFilter.init(config, muscles, 'quiz-filter');
 *   Einzelne Quiz-Seiten:   QuizFilter.init(config, muscles);   ← kein UI
 *
 * Zustand wird in localStorage gespeichert und auf allen Seiten geteilt.
 */

const QuizFilter = (() => {
    const STORAGE_KEY = 'muskelfinder_quiz_filter_v1';

    const REGION_META = {
        'obere-extremitaet':  { label: 'Obere Extremität',    icon: '💪' },
        'untere-extremitaet': { label: 'Untere Extremität',   icon: '🦵' },
        'wirbelsaeule':       { label: 'Wirbelsäule & Rumpf', icon: '🦴' }
    };

    let _state   = { deckOnly: false, regions: [], subgroups: [] };
    let _config  = null;
    let _muscles = [];
    let _cid     = null; // null = kein UI

    function _load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) _state = { ..._state, ...JSON.parse(raw) };
            _state.deckOnly = !!_state.deckOnly;
            if (!Array.isArray(_state.regions)) _state.regions = [];
            else _state.regions = _state.regions.filter(id => typeof id === 'string' && id.trim() !== '');
            if (!Array.isArray(_state.subgroups)) _state.subgroups = [];
            else _state.subgroups = _state.subgroups.filter(id => typeof id === 'string' && id.trim() !== '');
        } catch (e) { /* ignore */ }
    }

    function _save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
    }

    // Alle Subgruppen, die zu den aktiven Regionen gehören
    function _visibleSubgroups() {
        if (!_config) return [];
        const activeRegions = _state.regions.length > 0
            ? _config.regions.filter(r => _state.regions.includes(r.id))
            : _config.regions;
        return activeRegions.flatMap(r => r.subgroups || []);
    }

    // Entfernt Subgruppen aus dem State, die durch Regionsänderung nicht mehr sichtbar sind
    function _pruneSubgroups() {
        const visible = _visibleSubgroups().map(sg => sg.id);
        _state.subgroups = _state.subgroups.filter(id => visible.includes(id));
    }

    // ── Pool ─────────────────────────────────────────────────
    function getPool() {
        let pool = _muscles;
        if (_state.regions.length > 0) {
            pool = pool.filter(m => _state.regions.includes(m.region));
        }
        if (_state.subgroups.length > 0) {
            pool = pool.filter(m => _state.subgroups.includes(m.subgroup));
        }
        if (_state.deckOnly) {
            pool = pool.filter(m => ProgressManager.isInDeck(m.Name));
        }
        return pool;
    }

    // ── UI ───────────────────────────────────────────────────
    function _render() {
        if (!_cid) return;
        const container = document.getElementById(_cid);
        if (!container || !_config) return;

        const pool         = getPool();
        const deckCount    = _muscles.filter(m => ProgressManager.isInDeck(m.Name)).length;
        const allActive    = _state.regions.length === 0;
        const visibleSgs   = _visibleSubgroups();
        const allSgsActive = _state.subgroups.length === 0;

        const regionChips = _config.regions.map(r => {
            const meta   = REGION_META[r.id] || { label: r.name, icon: '' };
            const active = !allActive && _state.regions.includes(r.id);
            const count  = _muscles.filter(m => m.region === r.id).length;
            return `<button class="qf-chip ${active ? 'qf-chip-active' : ''}" data-region="${r.id}">
                        ${meta.icon} ${meta.label} <span class="qf-chip-count">${count}</span>
                    </button>`;
        }).join('');

        const sgChips = visibleSgs.map(sg => {
            const active = !allSgsActive && _state.subgroups.includes(sg.id);
            const count  = _muscles.filter(m => m.subgroup === sg.id).length;
            return `<button class="qf-chip qf-chip-sg ${active ? 'qf-chip-active' : ''}" data-subgroup="${sg.id}">
                        ${SUBGROUP_LABELS[sg.id] || sg.name} <span class="qf-chip-count">${count}</span>
                    </button>`;
        }).join('');

        container.innerHTML = `
            <div class="quiz-filter-panel">
                <div class="qf-top-row">
                    <span class="qf-title">Muskelauswahl für Quiz</span>
                    <span class="qf-pool-size">${pool.length} Muskeln aktiv</span>
                </div>
                <div class="qf-deck-row">
                    <label class="qf-deck-label">
                        <input type="checkbox" id="qf-deck-only"
                               ${_state.deckOnly ? 'checked' : ''}
                               ${deckCount === 0 ? 'disabled' : ''}>
                        <span class="qf-deck-text">
                            🃏 Nur Lernkarten
                            <span class="qf-deck-count">${deckCount > 0 ? '(' + deckCount + ')' : '(leer)'}</span>
                        </span>
                    </label>
                </div>
                <div class="qf-chips-row">
                    <button class="qf-chip ${allActive ? 'qf-chip-active' : ''}" data-region="all">
                        Alle <span class="qf-chip-count">${_muscles.length}</span>
                    </button>
                    ${regionChips}
                </div>
                ${visibleSgs.length > 0 ? `
                <div class="qf-chips-row qf-chips-sg-row">
                    <button class="qf-chip qf-chip-sg ${allSgsActive ? 'qf-chip-active' : ''}" data-subgroup="all">
                        Alle Bereiche
                    </button>
                    ${sgChips}
                </div>` : ''}
                ${pool.length < 4 ? `<div class="qf-warning">⚠️ Mindestens 4 Muskeln benötigt — bitte Auswahl erweitern.</div>` : ''}
            </div>
        `;

        // Deck-Toggle
        container.querySelector('#qf-deck-only').addEventListener('change', function () {
            _state.deckOnly = this.checked;
            _save();
            _render();
        });

        // Region-Chips
        container.querySelectorAll('.qf-chip[data-region]').forEach(btn => {
            btn.addEventListener('click', function () {
                const region = this.dataset.region;
                if (region === 'all') {
                    _state.regions = [];
                } else {
                    const idx = _state.regions.indexOf(region);
                    if (idx >= 0) _state.regions.splice(idx, 1);
                    else          _state.regions.push(region);
                    if (_state.regions.length === _config.regions.length) _state.regions = [];
                }
                _pruneSubgroups();
                _save();
                _render();
            });
        });

        // Subgruppen-Chips
        container.querySelectorAll('.qf-chip[data-subgroup]').forEach(btn => {
            btn.addEventListener('click', function () {
                const sg = this.dataset.subgroup;
                if (sg === 'all') {
                    _state.subgroups = [];
                } else {
                    const idx = _state.subgroups.indexOf(sg);
                    if (idx >= 0) _state.subgroups.splice(idx, 1);
                    else          _state.subgroups.push(sg);
                    const allVisible = _visibleSubgroups().map(s => s.id);
                    if (_state.subgroups.length === allVisible.length) _state.subgroups = [];
                }
                _save();
                _render();
            });
        });
    }

    // ── Distractor-Auswahl ────────────────────────────────────
    /**
     * Wählt `count` Distraktoren für `muscle` aus `pool`.
     *
     * Priorität:
     *   1. Gleiche Subgruppe  (z. B. Schultergelenk → Schultergelenk)
     *   2. Gleiche Region     (z. B. Schultergelenk → Schultergürtel / Ellenbogen)
     *   3. Andere Region      (max. 1 Stück, als "Wildcard")
     *
     * Damit kommen nie alle 3 Antworten aus einer komplett anderen Körperregion.
     */
    function pickDistractors(muscle, pool, count = 3) {
        function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

        const others      = pool.filter(m => m.Name !== muscle.Name);
        const sameSub     = shuffle(others.filter(m => m.subgroup === muscle.subgroup));
        const sameRegion  = shuffle(others.filter(m => m.region === muscle.region && m.subgroup !== muscle.subgroup));
        const diffRegion  = shuffle(others.filter(m => m.region !== muscle.region));

        const result = [];

        // Fülle zuerst aus gleicher Subgruppe, dann gleicher Region
        for (const m of [...sameSub, ...sameRegion]) {
            if (result.length >= count - 1) break; // reserviere 1 Slot für diffRegion
            result.push(m);
        }

        // Genau 1 Wildcard aus anderer Region (falls vorhanden und noch Platz)
        if (result.length < count && diffRegion.length > 0) {
            result.push(diffRegion[0]);
        }

        // Fallback: Pool zu klein → restliche Slots mit beliebigen Muskeln füllen
        if (result.length < count) {
            const used = new Set(result.map(m => m.Name));
            for (const m of shuffle(others)) {
                if (result.length >= count) break;
                if (!used.has(m.Name)) { result.push(m); used.add(m.Name); }
            }
        }

        return result;
    }

    // ── Public API ────────────────────────────────────────────
    function init(config, muscles, containerId) {
        _config  = config;
        _muscles = muscles;
        _cid     = containerId || null;
        _load();
        _render();
    }

    function getSeriesSignature() {
        return JSON.stringify({
            deckOnly: !!_state.deckOnly,
            regions: [..._state.regions].sort(),
            subgroups: [..._state.subgroups].sort()
        });
    }

    return { init, getPool, pickDistractors, getSeriesSignature };
})();
