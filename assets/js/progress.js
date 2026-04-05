/**
 * progress.js
 *
 * 1. ProgressManager — Leitner-System (7 Fächer) für Lernkarten
 *    Wichtig: Muskeln müssen explizit per addCard() hinzugefügt werden.
 *    Nur hinzugefügte Karten erscheinen in Sessions und Stats.
 *
 *
 * Speicher: localStorage (automatisch) + JSON Export/Import (portabel)
 *
 * Fach-Intervalle:
 *   1 →  1 Tag  |  2 →  3 Tage  |  3 →  7 Tage  |  4 → 14 Tage
 *   5 → 30 Tage |  6 → 90 Tage  |  7 → 180 Tage
 */

// ════════════════════════════════════════════════════════════════
//  1. ProgressManager
// ════════════════════════════════════════════════════════════════
const ProgressManager = (() => {
    const STORAGE_KEY    = 'muskelfinder_progress_v1';
    const FACH_INTERVALS = [0, 1, 3, 7, 14, 30, 90, 180]; // Index = Fach-Nummer

    // state.cards = { "Muskelname": { fach, nextDue, totalCorrect, totalWrong, lastSeen } }
    let state = { version: 1, cards: {} };

    // ── Intern ───────────────────────────────────────────────
    function _persist() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
        catch (e) { console.warn('ProgressManager: Speichern fehlgeschlagen.', e); }
    }

    function _init() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) state = JSON.parse(raw);
        } catch (e) { console.warn('ProgressManager: Laden fehlgeschlagen.', e); }
    }

    function _newCard() {
        return { fach: 1, nextDue: new Date().toISOString(), totalCorrect: 0, totalWrong: 0, lastSeen: null, difficult: false };
    }

    function _dueDate(fach) {
        const d = new Date();
        d.setDate(d.getDate() + FACH_INTERVALS[fach]);
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
    }

    function _endOfDay() {
        const d = new Date();
        d.setHours(23, 59, 59, 999);
        return d;
    }

    // ── Deck-Verwaltung ──────────────────────────────────────

    /** Muskel in den Karteikasten legen (Fach 1, sofort fällig) */
    function addCard(name) {
        if (!state.cards[name]) {
            state.cards[name] = _newCard();
            _persist();
        }
    }

    /** Mehrere Muskeln auf einmal hinzufügen */
    function addCards(names) {
        let changed = false;
        for (const name of names) {
            if (!state.cards[name]) { state.cards[name] = _newCard(); changed = true; }
        }
        if (changed) _persist();
    }

    /** Muskel aus Karteikasten entfernen */
    function removeCard(name) {
        delete state.cards[name];
        _persist();
    }

    /** Ist der Muskel im Karteikasten? */
    function isInDeck(name) {
        return name in state.cards;
    }

    /** Alle Muskelnamen die im Karteikasten sind */
    function getAddedCardNames() {
        return Object.keys(state.cards);
    }

    // ── Lernlogik ────────────────────────────────────────────

    /** Richtig → nächstes Fach */
    function markCorrect(name) {
        if (!state.cards[name]) return;
        const c = state.cards[name];
        c.fach = Math.min(7, c.fach + 1);
        c.nextDue = _dueDate(c.fach);
        c.totalCorrect++;
        c.lastSeen = new Date().toISOString();
        _persist();
    }

    /** Falsch → ein Fach zurück */
    function markWrong(name) {
        if (!state.cards[name]) return;
        const c = state.cards[name];
        c.fach = Math.max(1, c.fach - 1);
        c.nextDue = _dueDate(c.fach);
        c.totalWrong++;
        c.lastSeen = new Date().toISOString();
        _persist();
    }

    /** Unsicher → Fach bleibt, Session-Logik legt Karte ans Ende */
    function markUnsure(name) {
        if (!state.cards[name]) return;
        state.cards[name].lastSeen = new Date().toISOString();
        _persist();
    }

    // ── Abfragen ─────────────────────────────────────────────

    /** Als schwierig markieren / Markierung entfernen — gibt neuen Zustand zurück */
    function toggleDifficult(name) {
        if (!state.cards[name]) return false;
        state.cards[name].difficult = !state.cards[name].difficult;
        _persist();
        return state.cards[name].difficult;
    }

    function isDifficult(name) {
        return !!(state.cards[name] && state.cards[name].difficult);
    }

    /** Fällige Karten — schwierige Karten immer dabei, unabhängig vom Fach-Intervall */
    function getDueCards(muscleNames) {
        const eod = _endOfDay();
        const names = muscleNames
            ? muscleNames.filter(n => isInDeck(n))
            : getAddedCardNames();
        return names.filter(n => new Date(state.cards[n].nextDue) <= eod || state.cards[n].difficult);
    }

    /** Lernstatus einer Karte — null wenn nicht im Deck */
    function getCardState(name) {
        return state.cards[name] ? { ...state.cards[name] } : null;
    }

    /** Statistik: gesamt, heute fällig, Anzahl pro Fach */
    function getStats(muscleNames) {
        const eod = _endOfDay();
        const names = muscleNames
            ? muscleNames.filter(n => isInDeck(n))
            : getAddedCardNames();
        const byFach = Array(8).fill(0);
        let dueToday = 0;
        for (const n of names) {
            const c = state.cards[n];
            byFach[c.fach]++;
            if (new Date(c.nextDue) <= eod) dueToday++;
        }
        return { total: names.length, dueToday, byFach };
    }

    // ── Export / Import ──────────────────────────────────────

    function exportJSON() {
        const data = { ...state, exportedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `muskelfinder-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importJSON(jsonString) {
        try {
            const imp = JSON.parse(jsonString);
            if (imp.version !== 1 || typeof imp.cards !== 'object') throw new Error('Unbekanntes Format');
            state = { version: 1, cards: imp.cards };
            _persist();
            return true;
        } catch (e) {
            console.error('ProgressManager: Import fehlgeschlagen.', e);
            return false;
        }
    }

    function resetAll() {
        state = { version: 1, cards: {} };
        _persist();
    }

    _init();

    return {
        addCard, addCards, removeCard, isInDeck, getAddedCardNames,
        markCorrect, markWrong, markUnsure,
        toggleDifficult, isDifficult,
        getDueCards, getCardState, getStats,
        exportJSON, importJSON, resetAll,
        FACH_INTERVALS
    };
})();


// Session-Zähler für Quiz-Seiten (kein localStorage, nur aktuelle Sitzung)
let correctAnswers = 0;
let wrongAnswers   = 0;
