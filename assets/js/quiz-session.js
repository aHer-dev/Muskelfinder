/**
 * quiz-session.js — Sitzungs-Verwaltung für alle Quiz-Seiten
 *
 * Verwendet von: image-match-quiz, origin-insertion-quiz, movement-quiz
 *
 * QuizSession.init(basePath)         Neue Sitzung starten / zurücksetzen
 * QuizSession.record(name, ok, label) Antwort erfassen
 * QuizSession.isComplete()           true nach SESSION_LENGTH Fragen
 * QuizSession.showSummary()          Auswertungs-Screen anzeigen
 * QuizSession.updateProgress()       Fortschrittsanzeige aktualisieren
 */

const QuizSession = (() => {
    const SESSION_LENGTH = 10;

    let _basePath  = '';
    let _answered  = 0;
    let _correct   = 0;
    let _wrongItems = []; // [{ name, label }]  label = korrekte Antwort als Text

    // ── Sitzung starten ──────────────────────────────────────────
    function init(basePath) {
        _basePath  = basePath || '';
        _answered  = 0;
        _correct   = 0;
        _wrongItems = [];
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

        const pct = _answered > 0 ? Math.round((_correct / _answered) * 100) : 0;

        const wrongHTML = _wrongItems.length === 0
            ? '<p class="qs-perfect">Alle richtig — perfekte Runde! 🎉</p>'
            : _wrongItems.map(item => `
                <div class="qs-wrong-item">
                    <a href="${_basePath}/muscle-details.html?name=${encodeURIComponent(item.name)}"
                       class="qs-muscle-link">${item.name}</a>
                    ${item.label ? `<span class="qs-answer-label">${item.label}</span>` : ''}
                </div>`).join('');

        summary.innerHTML = `
            <div class="qs-card">
                <h2 class="qs-title">Sitzung abgeschlossen</h2>

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

                <div class="qs-wrong-section">
                    ${_wrongItems.length > 0
                        ? '<h3 class="qs-section-title">Falsch beantwortet</h3>'
                        : ''}
                    <div class="qs-wrong-list">${wrongHTML}</div>
                </div>

                <div class="qs-actions">
                    <button id="qs-restart-btn" class="btn-primary">Neue Sitzung</button>
                    <a href="quiz.html" class="btn-secondary">Zur Übersicht</a>
                </div>
            </div>
        `;

        document.getElementById('qs-restart-btn').addEventListener('click', () => {
            summary.hidden = true;
            if (quizContainer) quizContainer.hidden = false;
            if (statsBar)      statsBar.hidden      = false;
            init(_basePath);
            document.dispatchEvent(new Event('quiz-restart'));
        });

        summary.hidden = false;
    }

    return { init, record, isComplete, showSummary, updateProgress };
})();
