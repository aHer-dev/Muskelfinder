/**
 * quiz-session.js — Sitzungs-Verwaltung für alle Quiz-Seiten
 *
 * Verwendet von: image-match-quiz, origin-insertion-quiz, movement-quiz
 *
 * QuizSession.init(basePath, quizType) Neue Sitzung starten / zurücksetzen
 * QuizSession.record(name, ok, label) Antwort erfassen
 * QuizSession.isComplete()           true nach SESSION_LENGTH Fragen
 * QuizSession.showSummary()          Auswertungs-Screen anzeigen
 * QuizSession.updateProgress()       Fortschrittsanzeige aktualisieren
 */

const QuizSession = (() => {
    const SESSION_LENGTH = 10;
    const SERIES_STORAGE_KEY = 'muskelfinder_quiz_series_v1';
    const HISTORY_LIMIT = 5;

    let _basePath  = '';
    let _quizType  = 'quiz';
    let _seriesKey = '';
    let _answered  = 0;
    let _correct   = 0;
    let _wrongItems = []; // [{ name, label }]  label = korrekte Antwort als Text
    let _seriesStats = createEmptySeriesStats();
    let _roundCommitted = false;

    function createEmptySeriesStats() {
        return {
            rounds: 0,
            answers: 0,
            correct: 0,
            history: []
        };
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getRoundAccuracy(correct = _correct, answered = _answered) {
        return answered > 0 ? Math.round((correct / answered) * 100) : 0;
    }

    function getFilterSignature() {
        if (typeof QuizFilter !== 'undefined' && typeof QuizFilter.getSeriesSignature === 'function') {
            return QuizFilter.getSeriesSignature();
        }
        return '{"deckOnly":false,"regions":[],"subgroups":[]}';
    }

    function getSeriesStore() {
        try {
            const raw = localStorage.getItem(SERIES_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        } catch (error) {
            console.warn('QuizSession: Serienstatistik konnte nicht geladen werden.', error);
            return {};
        }
    }

    function saveSeriesStore(store) {
        localStorage.setItem(SERIES_STORAGE_KEY, JSON.stringify(store));
    }

    function loadSeriesStats() {
        const store = getSeriesStore();
        const stats = store[_seriesKey];
        if (!stats || typeof stats !== 'object') return createEmptySeriesStats();

        return {
            rounds: Number.isFinite(stats.rounds) ? stats.rounds : 0,
            answers: Number.isFinite(stats.answers) ? stats.answers : 0,
            correct: Number.isFinite(stats.correct) ? stats.correct : 0,
            history: Array.isArray(stats.history)
                ? stats.history
                    .map(entry => ({
                        pct: Number.isFinite(entry?.pct) ? entry.pct : 0,
                        correct: Number.isFinite(entry?.correct) ? entry.correct : 0,
                        answered: Number.isFinite(entry?.answered) ? entry.answered : 0
                    }))
                    .slice(-HISTORY_LIMIT)
                : []
        };
    }

    function persistSeriesStats() {
        const store = getSeriesStore();
        store[_seriesKey] = _seriesStats;
        saveSeriesStore(store);
    }

    function resetRoundStatsBar() {
        if (typeof correctAnswers !== 'undefined') correctAnswers = 0;
        if (typeof wrongAnswers !== 'undefined') wrongAnswers = 0;

        const correctEl = document.getElementById('correctCount');
        const wrongEl   = document.getElementById('wrongCount');
        const accEl     = document.getElementById('accuracy');

        if (correctEl) correctEl.textContent = '0';
        if (wrongEl)   wrongEl.textContent   = '0';
        if (accEl)     accEl.textContent     = '0%';
    }

    function buildSeriesKey() {
        return `${_quizType}::${getFilterSignature()}`;
    }

    function commitRoundToSeries() {
        if (_roundCommitted || _answered === 0) return;

        const roundStats = {
            pct: getRoundAccuracy(),
            correct: _correct,
            answered: _answered
        };

        _seriesStats = {
            rounds: _seriesStats.rounds + 1,
            answers: _seriesStats.answers + _answered,
            correct: _seriesStats.correct + _correct,
            history: [..._seriesStats.history, roundStats].slice(-HISTORY_LIMIT)
        };

        persistSeriesStats();
        _roundCommitted = true;
    }

    function resetCurrentSeries() {
        const store = getSeriesStore();
        delete store[_seriesKey];
        saveSeriesStore(store);
        _seriesStats = createEmptySeriesStats();
    }

    function reopenQuiz(summary, quizContainer, statsBar) {
        summary.hidden = true;
        if (quizContainer) quizContainer.hidden = false;
        if (statsBar)      statsBar.hidden      = false;
        init(_basePath, _quizType);
        document.dispatchEvent(new Event('quiz-restart'));
    }

    // ── Sitzung starten ──────────────────────────────────────────
    function init(basePath, quizType) {
        _basePath  = basePath || '';
        _quizType  = quizType || _quizType || 'quiz';
        _seriesKey = buildSeriesKey();
        _answered  = 0;
        _correct   = 0;
        _wrongItems = [];
        _seriesStats = loadSeriesStats();
        _roundCommitted = false;
        resetRoundStatsBar();
        updateProgress();
    }

    // ── Antwort erfassen ─────────────────────────────────────────
    /**
     * @param {string} muscleName  Muskelname (für Detailseiten-Link)
     * @param {boolean} correct    Richtig beantwortet?
     * @param {string}  label      Korrekte Antwort als Anzeigetext
     */
    function record(muscleName, correct, label) {
        _answered++;
        if (correct) {
            _correct++;
        } else {
            _wrongItems.push({ name: muscleName, label: label || '' });
        }
        updateProgress();
    }

    function isComplete() {
        return _answered >= SESSION_LENGTH;
    }

    // ── Fortschrittsanzeige ──────────────────────────────────────
    function updateProgress() {
        const el = document.getElementById('qs-progress');
        if (el) el.textContent = `${_answered} / ${SESSION_LENGTH}`;
    }

    // ── Auswertungs-Screen ───────────────────────────────────────
    function showSummary() {
        const summary      = document.getElementById('quiz-summary');
        const quizContainer = document.querySelector('.quiz-container');
        const statsBar     = document.querySelector('.quiz-stats-bar');
        if (!summary) return;

        if (quizContainer) quizContainer.hidden = true;
        if (statsBar)      statsBar.hidden      = true;

        commitRoundToSeries();

        const pct = getRoundAccuracy();
        const seriesPct = getRoundAccuracy(_seriesStats.correct, _seriesStats.answers);

        const wrongHTML = _wrongItems.length === 0
            ? '<p class="qs-perfect">Alle richtig — perfekte Runde! 🎉</p>'
            : _wrongItems.map(item => `
                <div class="qs-wrong-item">
                    <a href="${_basePath}/muscle-details.html?name=${encodeURIComponent(item.name)}"
                       class="qs-muscle-link">${escapeHtml(item.name)}</a>
                    ${item.label ? `<span class="qs-answer-label">${escapeHtml(item.label)}</span>` : ''}
                </div>`).join('');

        const historyHTML = _seriesStats.history.length === 0
            ? ''
            : `
                <div class="qs-series-history-wrap">
                    <h3 class="qs-section-title">Letzte Runden</h3>
                    <div class="qs-series-history">
                        ${_seriesStats.history.map(entry => `
                            <span class="qs-history-chip">${entry.correct}/${entry.answered} · ${entry.pct}%</span>
                        `).join('')}
                    </div>
                </div>
            `;

        summary.innerHTML = `
            <div class="qs-card">
                <h2 class="qs-title">Runde abgeschlossen</h2>

                <div class="qs-summary-block">
                    <h3 class="qs-section-title">Diese Runde</h3>
                    <div class="qs-stats-row">
                        <div class="qs-stat">
                            <span class="qs-num qs-num-correct">${_correct}</span>
                            <span class="qs-label">Richtig</span>
                        </div>
                        <div class="qs-stat">
                            <span class="qs-num qs-num-wrong">${_answered - _correct}</span>
                            <span class="qs-label">Falsch</span>
                        </div>
                        <div class="qs-stat">
                            <span class="qs-num qs-num-acc">${pct}%</span>
                            <span class="qs-label">Genauigkeit</span>
                        </div>
                    </div>
                </div>

                <div class="qs-summary-block">
                    <h3 class="qs-section-title">Deine Serie</h3>
                    <div class="qs-stats-row qs-stats-row-series">
                        <div class="qs-stat">
                            <span class="qs-num">${_seriesStats.rounds}</span>
                            <span class="qs-label">Runden</span>
                        </div>
                        <div class="qs-stat">
                            <span class="qs-num qs-num-correct">${_seriesStats.correct}</span>
                            <span class="qs-label">Richtig</span>
                        </div>
                        <div class="qs-stat">
                            <span class="qs-num">${_seriesStats.answers}</span>
                            <span class="qs-label">Fragen</span>
                        </div>
                        <div class="qs-stat">
                            <span class="qs-num qs-num-acc">${seriesPct}%</span>
                            <span class="qs-label">Gesamtquote</span>
                        </div>
                    </div>
                    ${historyHTML}
                </div>

                <div class="qs-wrong-section">
                    ${_wrongItems.length > 0
                        ? '<h3 class="qs-section-title">Falsch beantwortet</h3>'
                        : ''}
                    <div class="qs-wrong-list">${wrongHTML}</div>
                </div>

                <div class="qs-actions">
                    <button id="qs-continue-btn" class="btn-primary">Weiter lernen</button>
                    <a href="quiz.html" class="btn-secondary">Zur Übersicht</a>
                </div>
                <button id="qs-new-series-btn" class="qs-subtle-action" type="button">Neue Serie starten</button>
            </div>
        `;

        document.getElementById('qs-continue-btn').addEventListener('click', () => {
            reopenQuiz(summary, quizContainer, statsBar);
        });

        document.getElementById('qs-new-series-btn').addEventListener('click', async () => {
            const confirmed = typeof AppDialog !== 'undefined'
                ? await AppDialog.confirm('Aktuelle Serienstatistik für dieses Quiz zurücksetzen und neu starten?')
                : window.confirm('Aktuelle Serienstatistik für dieses Quiz zurücksetzen und neu starten?');
            if (!confirmed) return;
            resetCurrentSeries();
            reopenQuiz(summary, quizContainer, statsBar);
        });

        summary.hidden = false;
    }

    return { init, record, isComplete, showSummary, updateProgress };
})();
