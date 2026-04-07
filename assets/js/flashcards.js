/**
 * flashcards.js — Session-Logik für das Lernkarten-System
 *
 * Ablauf:
 *  Setup  → Muskeln verwalten, Bereich einschränken, Starten
 *  Card   → Aufdecken → Falsch / Unsicher / Richtig
 *  Summary → Auswertung + Leitner-Stand
 */

function getBasePath() {
    if (!window.location.hostname.includes('github.io')) return '';
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return '';

    const first = parts[0];
    if (first.endsWith('.html') || ['quizzes', 'assets', 'data'].includes(first)) {
        return '';
    }

    return `/${first}`;
}

const basePath = getBasePath();


const FACH_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#06b6d4'];

// ── State ────────────────────────────────────────────────────────
let allMuscles = [];
let configData = null;
let session = {
    queue:       [],
    unsureQueue: [],
    current:     null,
    stats:       { correct: 0, wrong: 0, unsure: 0 },
    flipped:     false,
    isExtraRound: false
};

// ── DOM ──────────────────────────────────────────────────────────
const screens = {
    setup:   document.getElementById('setup-screen'),
    card:    document.getElementById('card-screen'),
    summary: document.getElementById('summary-screen')
};

const el = {
    deckTotalCount:  document.getElementById('deck-total-count'),
    dueCount:        document.getElementById('due-count'),
    subgroupTree:    document.getElementById('subgroup-tree'),
    leitnerBoxes:    document.getElementById('leitner-boxes'),
    startBtn:        document.getElementById('start-session'),
    sessionGoal:     document.getElementById('session-goal'),
    toggleAllBtn:    document.getElementById('toggle-all-btn'),
    exportBtn:       document.getElementById('export-btn'),
    importFile:      document.getElementById('import-file'),
    resetBtn:        document.getElementById('reset-progress'),
    sessionProgress: document.getElementById('session-progress'),
    backToOverview:  document.getElementById('back-to-overview'),
    flashcard:       document.getElementById('flashcard'),
    cardInner:       document.getElementById('card-inner'),
    cardName:        document.getElementById('card-name'),
    cardSubgroup:    document.getElementById('card-subgroup'),
    cardFach:          document.getElementById('card-fach'),
    cardDifficultBadge: document.getElementById('card-difficult-badge'),
    cardBack:          document.getElementById('card-back-content'),
    flagBtn:           document.getElementById('flag-btn'),
    flipBtn:           document.getElementById('flip-btn'),
    cardButtons:     document.getElementById('card-buttons'),
    btnWrong:        document.getElementById('btn-wrong'),
    btnUnsure:       document.getElementById('btn-unsure'),
    btnCorrect:      document.getElementById('btn-correct'),
    summaryStats:    document.getElementById('summary-stats'),
    summaryLeitner:  document.getElementById('summary-leitner'),
    continueBtn:     document.getElementById('continue-btn'),
    backToSetup:     document.getElementById('back-to-setup'),
    progressBar:     document.getElementById('session-progress-bar')
};

// ── Init ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await MuscleData.loadConfig();
    configData = MuscleData.getConfig();
    await MuscleData.loadSelected(configData.regions.map(r => r.id));
    allMuscles = MuscleData.getAll();

    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'none';

    buildSubgroupTree(configData.regions);
    refreshSetupScreen();
    bindEvents();
    showScreen('setup');
});

// ── Setup Screen ─────────────────────────────────────────────────

function buildSubgroupTree(regions) {
    el.subgroupTree.innerHTML = regions.map(region => {
        const subgroupItems = region.subgroups.map(sg => `
            <label class="sg-item">
                <input type="checkbox" class="sg-checkbox"
                       data-region="${region.id}" data-subgroup="${sg.id}"
                       value="${sg.id}" checked>
                <span class="sg-name">${SUBGROUP_LABELS[sg.id] || sg.name}</span>
                <span class="sg-count" id="sgcount-${sg.id}"></span>
            </label>
        `).join('');

        return `
            <div class="tree-region">
                <label class="tree-region-header">
                    <input type="checkbox" class="region-master-cb" data-region="${region.id}" checked>
                    <span>${region.icon || ''} ${region.name}</span>
                </label>
                <div class="tree-subgroups" id="sgtree-${region.id}">
                    ${subgroupItems}
                </div>
            </div>
        `;
    }).join('');

    // Region-Master steuert alle Untergruppen
    document.querySelectorAll('.region-master-cb').forEach(master => {
        master.addEventListener('change', function () {
            const regionId = this.dataset.region;
            document.querySelectorAll(`.sg-checkbox[data-region="${regionId}"]`).forEach(cb => {
                cb.checked = this.checked;
            });
            refreshSetupScreen();
        });
    });
    document.querySelectorAll('.sg-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            // Sync master checkbox
            const regionId = cb.dataset.region;
            const all = [...document.querySelectorAll(`.sg-checkbox[data-region="${regionId}"]`)];
            const master = document.querySelector(`.region-master-cb[data-region="${regionId}"]`);
            if (master) {
                master.checked     = all.every(c => c.checked);
                master.indeterminate = !master.checked && all.some(c => c.checked);
            }
            refreshSetupScreen();
        });
    });
}

function getSelectedSubgroups() {
    return [...document.querySelectorAll('.sg-checkbox:checked')].map(cb => cb.value);
}

function getSelectedMuscles() {
    const selectedSgs = getSelectedSubgroups();
    return allMuscles
        .filter(m => selectedSgs.includes(m.subgroup) && ProgressManager.isInDeck(m.Name))
        .map(m => m.Name);
}

function getAllDeckMuscles() {
    return allMuscles.filter(m => ProgressManager.isInDeck(m.Name)).map(m => m.Name);
}

function refreshSetupScreen() {
    const selectedMuscles = getSelectedMuscles();
    const allDeck         = getAllDeckMuscles();

    // Leitner-Balken: alle Deck-Karten
    const allStats = ProgressManager.getStats(allDeck);
    renderLeitner(el.leitnerBoxes, allStats.byFach);

    // Deck-Gesamtzahl im Link
    if (el.deckTotalCount) el.deckTotalCount.textContent = allDeck.length + ' Muskeln';

    // Fälligkeitsanzeige: nur ausgewählte Subgruppen
    const selStats = ProgressManager.getStats(selectedMuscles);
    if (selStats.dueToday === 0) {
        if (allDeck.length === 0) {
            el.dueCount.innerHTML = `<span class="due-zero">Noch keine Muskeln im Karteikasten — <a href="muscle-selection.html">Jetzt hinzufügen →</a></span>`;
        } else {
            el.dueCount.innerHTML = `<span class="due-zero">Keine Karten fällig 🎉</span><span class="due-extra"> · ${selectedMuscles.length} Karten für Extra-Runde verfügbar</span>`;
        }
    } else {
        el.dueCount.innerHTML = `<span class="due-number">${selStats.dueToday}</span> Karte${selStats.dueToday !== 1 ? 'n' : ''} heute fällig`;
    }
    el.startBtn.disabled = selectedMuscles.length === 0;
    el.startBtn.textContent = selStats.dueToday > 0 ? 'Lernen starten' : 'Extra-Runde starten';

    // Zähler pro Subgruppe aktualisieren
    if (configData) {
        configData.regions.forEach(region => {
            region.subgroups.forEach(sg => {
                const deckInSg = allMuscles.filter(m =>
                    m.subgroup === sg.id && ProgressManager.isInDeck(m.Name)
                ).length;
                const countEl = document.getElementById(`sgcount-${sg.id}`);
                if (countEl) {
                    countEl.textContent = deckInSg > 0 ? deckInSg : '';
                    countEl.className   = 'sg-count' + (deckInSg === 0 ? ' sg-count-empty' : '');
                }
            });
        });
    }
}

// ── Session ───────────────────────────────────────────────────────
function startSession() {
    const selected = getSelectedMuscles();
    if (selected.length === 0) return;

    const due = ProgressManager.getDueCards(selected);
    const isExtraRound = due.length === 0;
    // Wenn keine fälligen Karten: alle ausgewählten Deck-Karten als Extra-Runde
    let cards = isExtraRound ? selected : due;

    const limit = parseInt(el.sessionGoal.value, 10);
    if (limit > 0) cards = cards.slice(0, limit);

    session.queue       = shuffle([...cards]);
    session.unsureQueue = [];
    session.stats       = { correct: 0, wrong: 0, unsure: 0, streak: 0 };
    session.isExtraRound = isExtraRound;

    showScreen('card');
    nextCard();
}

function nextCard() {
    if (session.queue.length === 0 && session.unsureQueue.length > 0) {
        session.queue       = shuffle([...session.unsureQueue]);
        session.unsureQueue = [];
    }
    if (session.queue.length === 0) { showSummary(); return; }

    session.current = session.queue.shift();
    session.flipped = false;

    const muscle    = allMuscles.find(m => m.Name === session.current);
    const cardState = ProgressManager.getCardState(session.current);
    const done      = session.stats.correct + session.stats.wrong + session.stats.unsure;
    const total     = done + session.queue.length + 1;

    el.sessionProgress.textContent = session.isExtraRound
        ? `${done + 1} / ${total} · Extra-Runde`
        : `${done + 1} / ${total} · Fach ${cardState.fach}`;
    updateProgressBar(done, total);
    el.cardName.textContent    = muscle.Name;
    el.cardSubgroup.textContent = [REGION_LABELS[muscle.region], SUBGROUP_LABELS[muscle.subgroup]].filter(Boolean).join(' · ');
    el.cardFach.textContent    = `Fach ${cardState.fach}`;
    el.cardFach.style.cssText  = `background:${FACH_COLORS[cardState.fach]}22;color:${FACH_COLORS[cardState.fach]};border-color:${FACH_COLORS[cardState.fach]}55`;
    el.cardBack.innerHTML      = buildCardBack(muscle);

    // Difficult state
    const isDiff = ProgressManager.isDifficult(session.current);
    el.flagBtn.classList.toggle('flag-active', isDiff);
    el.cardDifficultBadge.hidden = !isDiff;

    el.cardInner.classList.remove('flipped');
    el.cardInner.style.minHeight = '';
    el.cardButtons.hidden = true;
    el.flipBtn.hidden     = false;
}

function buildCardBack(muscle) {
    const rows = [
        ['Ursprung',    formatField(muscle.Origin)],
        ['Ansatz',      formatField(muscle.Insertion)],
        ['Bewegungen',  muscle.Movements],
        ['Funktion',    muscle.Function],
        ['Innervation', muscle.Segments],
    ];

    const mainRows = rows.map(([label, value]) => `
        <div class="card-back-row">
            <span class="card-back-label">${label}</span>
            <span class="card-back-value">${value || '–'}</span>
        </div>
    `).join('');

    const clinicalSection = muscle.clinicalNote ? `
        <div class="card-clinical-toggle">
            <span class="card-clinical-label">🩺 Klinischer Bezug</span>
            <span class="card-clinical-arrow">▸</span>
            <div class="card-clinical-content">${muscle.clinicalNote}</div>
        </div>
    ` : '';

    return mainRows + clinicalSection;
}

function formatField(origin) {
    if (!origin) return '–';
    if (typeof origin === 'string') return origin;
    if (Array.isArray(origin)) return origin.map(o => {
        if (typeof o === 'string') return o;
        return o.Part ? `<strong>${o.Part}:</strong> ${o.Location}` : o.Location;
    }).join('<br>');
    return String(origin);
}

function updateProgressBar(done, total) {
    if (!el.progressBar) return;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    el.progressBar.style.width = pct + '%';
}

function flipCard() {
    session.flipped = true;
    el.cardInner.classList.add('flipped');
    el.flipBtn.hidden     = true;
    el.cardButtons.hidden = false;

    // Karte wächst auf die Höhe der Rückseite
    requestAnimationFrame(() => {
        const back = el.cardInner.querySelector('.flashcard-back');
        if (back) {
            const h = back.scrollHeight;
            el.cardInner.style.minHeight = h + 'px';
        }
    });
}

function handleCorrect() {
    const fach = (ProgressManager.getCardState(session.current) || {}).fach || 1;
    if (!session.isExtraRound) {
        ProgressManager.markCorrect(session.current);
    }
    session.stats.correct++;
    session.stats.streak++;
    // Streak-Boni bei Meilensteinen (jeder genau einmal pro Sitzung)
    if (session.stats.streak === 5)  Gamification.awardStreak(5);
    if (session.stats.streak === 10) Gamification.awardStreak(10);
    if (session.stats.streak === 20) Gamification.awardStreak(20);
    Gamification.awardFlashcard('richtig', fach);
    nextCard();
}
function handleWrong() {
    const fach = (ProgressManager.getCardState(session.current) || {}).fach || 1;
    if (!session.isExtraRound) {
        ProgressManager.markWrong(session.current);
    }
    session.stats.wrong++;
    session.stats.streak = 0;
    Gamification.awardFlashcard('falsch', fach);
    nextCard();
}
function handleUnsure() {
    const fach = (ProgressManager.getCardState(session.current) || {}).fach || 1;
    if (!session.isExtraRound) {
        ProgressManager.markUnsure(session.current);
    }
    session.stats.unsure++;
    session.stats.streak = 0;
    session.unsureQueue.push(session.current);
    Gamification.awardFlashcard('unsicher', fach);
    nextCard();
}

// ── Summary ───────────────────────────────────────────────────────
function showSummary() {
    Gamification.awardDailyBonus(); // einmal täglich, idempotent
    const { correct, wrong, unsure } = session.stats;
    el.summaryStats.innerHTML = `
        <div class="summary-row"><span class="summary-label correct-label">✓ Richtig</span><span class="summary-value">${correct}</span></div>
        <div class="summary-row"><span class="summary-label unsure-label">~ Unsicher</span><span class="summary-value">${unsure}</span></div>
        <div class="summary-row"><span class="summary-label wrong-label">✗ Falsch</span><span class="summary-value">${wrong}</span></div>
        <div class="summary-row summary-total"><span class="summary-label">Gesamt</span><span class="summary-value">${correct + wrong + unsure}</span></div>
    `;

    const byFach = ProgressManager.getStats(getAllDeckMuscles()).byFach;
    renderLeitner(el.summaryLeitner, byFach);

    const moreDue    = ProgressManager.getDueCards(getSelectedMuscles()).length;
    const anyCards   = getSelectedMuscles().length > 0;
    el.continueBtn.hidden      = !anyCards;
    el.continueBtn.textContent = moreDue > 0 ? 'Weiter lernen' : 'Extra-Runde';
    showScreen('summary');
}

// ── Leitner Helper ────────────────────────────────────────────────
function renderLeitner(container, byFach) {
    const maxCount = Math.max(1, ...byFach.slice(1));
    container.innerHTML = '';
    for (let f = 1; f <= 7; f++) {
        const count = byFach[f];
        const pct   = Math.round((count / maxCount) * 100);
        const days  = ProgressManager.FACH_INTERVALS[f];
        const box   = document.createElement('div');
        box.className = 'leitner-box';
        box.innerHTML = `
            <div class="leitner-bar-wrap">
                <div class="leitner-bar" style="background:${FACH_COLORS[f]};height:${Math.max(6, pct * 0.6)}px"></div>
            </div>
            <div class="leitner-count">${count}</div>
            <div class="leitner-label">F${f}<br><small>${days}d</small></div>
        `;
        container.appendChild(box);
    }
}

// ── Screen Wechsel ────────────────────────────────────────────────
function showScreen(name) {
    Object.entries(screens).forEach(([key, s]) => { s.hidden = key !== name; });
    if (name === 'setup') refreshSetupScreen();
}

// ── Events ────────────────────────────────────────────────────────
function bindEvents() {
    el.startBtn.addEventListener('click', startSession);
    el.flipBtn.addEventListener('click', flipCard);
    el.flashcard.addEventListener('click', () => { if (!session.flipped) flipCard(); });
    el.flashcard.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!session.flipped) flipCard(); } });

    el.btnCorrect.addEventListener('click', handleCorrect);
    el.btnWrong.addEventListener('click', handleWrong);
    el.btnUnsure.addEventListener('click', handleUnsure);

    el.flagBtn.addEventListener('click', () => {
        if (!session.current) return;
        const isDiff = ProgressManager.toggleDifficult(session.current);
        el.flagBtn.classList.toggle('flag-active', isDiff);
        el.cardDifficultBadge.hidden = !isDiff;
    });

    // ── Steuerungs-Dropdown ───────────────────────────────────────
    const controlsBtn  = document.getElementById('controls-hint-btn');
    const controlsDrop = document.getElementById('controls-dropdown');
    if (controlsBtn && controlsDrop) {
        controlsBtn.addEventListener('click', e => {
            e.stopPropagation();
            controlsDrop.hidden = !controlsDrop.hidden;
        });
        document.addEventListener('click', () => { controlsDrop.hidden = true; });
    }

    // ── Klinischer Bezug Toggle (mit Höhen-Update) ────────────────
    el.cardBack.addEventListener('click', e => {
        const toggle = e.target.closest('.card-clinical-toggle');
        if (!toggle) return;
        toggle.classList.toggle('open');
        requestAnimationFrame(() => {
            const back = el.cardInner.querySelector('.flashcard-back');
            if (back) el.cardInner.style.minHeight = back.scrollHeight + 'px';
        });
    });

    el.backToOverview.addEventListener('click', () => showScreen('setup'));
    el.continueBtn.addEventListener('click', startSession);
    el.backToSetup.addEventListener('click',  () => showScreen('setup'));

    // ── Tastaturkürzel ────────────────────────────────────────────
    document.addEventListener('keydown', e => {
        if (screens.card.hidden) return;
        // Verhindere Shortcuts wenn Fokus auf Button/Input liegt
        if (['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (!session.flipped) flipCard();
        } else if (e.key === '1' && session.flipped) {
            handleWrong();
        } else if (e.key === '2' && session.flipped) {
            handleUnsure();
        } else if (e.key === '3' && session.flipped) {
            handleCorrect();
        } else if (e.key === 'f' || e.key === 'F') {
            el.flagBtn.click();
        }
    });

    // ── Swipe-Gesten ──────────────────────────────────────────────
    let touchStartX = 0, touchStartY = 0;

    el.flashcard.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        el.flashcard.style.transition = 'none';
    }, { passive: true });

    el.flashcard.addEventListener('touchmove', e => {
        if (!session.flipped) return;
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        if (Math.abs(dx) < Math.abs(dy)) return;
        e.preventDefault();
        const rotate = dx * 0.06;
        el.flashcard.style.transform = `translateX(${dx * 0.4}px) rotate(${rotate}deg)`;
        el.flashcard.classList.toggle('swipe-right', dx > 40);
        el.flashcard.classList.toggle('swipe-left',  dx < -40);
    }, { passive: false });

    el.flashcard.addEventListener('touchend', e => {
        el.flashcard.style.transition = '';
        el.flashcard.style.transform  = '';
        el.flashcard.classList.remove('swipe-right', 'swipe-left');
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) > 60 && Math.abs(dy) < 80) {
            if (!session.flipped) { flipCard(); return; }
            if (dx < 0) handleWrong();
            else        handleCorrect();
        }
    }, { passive: true });

    // ── Alle / Keine Subgruppen ───────────────────────────────────
    let allSelected = true;
    el.toggleAllBtn.addEventListener('click', () => {
        allSelected = !allSelected;
        document.querySelectorAll('.sg-checkbox').forEach(cb => { cb.checked = allSelected; });
        document.querySelectorAll('.region-master-cb').forEach(cb => {
            cb.checked = allSelected;
            cb.indeterminate = false;
        });
        el.toggleAllBtn.textContent = allSelected ? 'Alle ab' : 'Alle an';
        refreshSetupScreen();
    });

    el.exportBtn.addEventListener('click', () => ProgressManager.exportJSON());
    el.importFile.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const ok = ProgressManager.importJSON(ev.target.result);
            if (ok) { refreshSetupScreen(); AppDialog.alert('Fortschritt erfolgreich geladen!'); }
            else    { AppDialog.alert('Fehler: Die Datei konnte nicht gelesen werden.'); }
            el.importFile.value = '';
        };
        reader.readAsText(file);
    });
    el.resetBtn.addEventListener('click', async () => {
        const ok = await AppDialog.confirm('Gesamten Fortschritt löschen? Das kann nicht rückgängig gemacht werden.');
        if (ok) {
            ProgressManager.resetAll();
            refreshSetupScreen();
        }
    });
}

// ── Utils ─────────────────────────────────────────────────────────
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
