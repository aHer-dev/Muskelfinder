const STATS_QUIZ_META = {
    'image-match':      { icon: '🖼', title: 'Bildzuordnung' },
    'origin-insertion': { icon: '📍', title: 'Ursprung & Ansatz' },
    'movement':         { icon: '⚡', title: 'Funktions-Quiz' }
};

const STATS_FACH_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#06b6d4'];
const numberFormatter = new Intl.NumberFormat('de-DE');

document.addEventListener('DOMContentLoaded', () => {
    renderStatsDashboard();
});

function renderStatsDashboard() {
    const xpState = typeof Gamification !== 'undefined'
        ? Gamification.getState()
        : { totalXP: 0, level: 1, xpThisLevel: 0, xpNeeded: 1, progress: 0 };

    const flashOverview = typeof ProgressManager !== 'undefined' && typeof ProgressManager.getOverview === 'function'
        ? ProgressManager.getOverview()
        : createEmptyFlashOverview();

    const aggregatedQuizStats = typeof QuizSession !== 'undefined' && typeof QuizSession.getAggregatedStatsByQuizType === 'function'
        ? QuizSession.getAggregatedStatsByQuizType()
        : [];

    const quizStats = Object.entries(STATS_QUIZ_META).map(([quizType, meta]) => {
        const existing = aggregatedQuizStats.find(entry => entry.quizType === quizType);
        return {
            quizType,
            ...meta,
            rounds: existing?.rounds || 0,
            answers: existing?.answers || 0,
            correct: existing?.correct || 0,
            accuracy: existing?.accuracy || 0
        };
    });

    const quizTotals = quizStats.reduce((sum, entry) => ({
        rounds: sum.rounds + entry.rounds,
        answers: sum.answers + entry.answers,
        correct: sum.correct + entry.correct
    }), { rounds: 0, answers: 0, correct: 0 });
    quizTotals.accuracy = quizTotals.answers > 0
        ? Math.round((quizTotals.correct / quizTotals.answers) * 100)
        : 0;

    renderHero(xpState, flashOverview, quizTotals);
    renderMetrics(xpState, flashOverview, quizTotals);
    renderQuizOverview(quizStats, quizTotals);
    renderQuizCards(quizStats);
    renderFlashcards(flashOverview);
    renderGoals(xpState, flashOverview, quizTotals);
    bindDangerZone();
}

function createEmptyFlashOverview() {
    return {
        total: 0,
        dueToday: 0,
        difficultCount: 0,
        masteredCount: 0,
        totalCorrect: 0,
        totalWrong: 0,
        totalAnswers: 0,
        reviewedCards: 0,
        averageFach: 0,
        lastReviewedAt: null,
        byFach: Array(8).fill(0)
    };
}

function renderHero(xpState, flashOverview, quizTotals) {
    const hero = document.getElementById('stats-hero');
    if (!hero) return;

    const remainingXP = xpState.level >= 99 ? 0 : Math.max(0, xpState.xpNeeded - xpState.xpThisLevel);
    const nextLevel = Math.min(99, xpState.level + 1);
    const heroCopy = flashOverview.total === 0 && quizTotals.rounds === 0
        ? 'Noch kein Lernstand gespeichert. Starte mit Lernkarten oder einem Quiz, um hier Fortschritt zu sehen.'
        : `${quizTotals.rounds} Quiz-Runden und ${flashOverview.total} Lernkarten bilden aktuell deinen Gesamtstand.`;
    const masteryCopy = flashOverview.masteredCount > 0
        ? `${flashOverview.masteredCount} Karten sind schon in den Meisterfächern F5 bis F7.`
        : 'Bring erste Karten in Fach 5+, um deinen Meisterbereich aufzubauen.';

    hero.innerHTML = `
        <div class="stats-hero-copy">
            <span class="stats-kicker">Gamification</span>
            <h2>Dein Lernstand auf einen Blick</h2>
            <p>${heroCopy}</p>
            <div class="stats-hero-pills">
                <span class="stats-pill">${formatNumber(xpState.totalXP)} XP gesamt</span>
                <span class="stats-pill">${quizTotals.answers} Quizfragen beantwortet</span>
                <span class="stats-pill">${flashOverview.reviewedCards} Lernkarten bereits gesehen</span>
            </div>
            <p class="stats-hero-note">${masteryCopy}</p>
        </div>
        <div class="stats-level-panel">
            <div class="stats-level-badge">Level ${xpState.level}</div>
            <div class="stats-level-total">${formatNumber(xpState.totalXP)} XP</div>
            <div class="stats-level-track" aria-label="Level-Fortschritt">
                <div class="stats-level-fill" style="width:${(xpState.progress * 100).toFixed(1)}%"></div>
            </div>
            <div class="stats-level-meta">
                ${xpState.level >= 99
                    ? 'Max-Level erreicht'
                    : `${formatNumber(xpState.xpThisLevel)} / ${formatNumber(xpState.xpNeeded)} XP in diesem Level`}
            </div>
            <div class="stats-level-next">
                ${xpState.level >= 99
                    ? 'Du hast die aktuelle Level-Kurve voll ausgespielt.'
                    : `Noch ${formatNumber(remainingXP)} XP bis Level ${nextLevel}`}
            </div>
        </div>
    `;
}

function renderMetrics(xpState, flashOverview, quizTotals) {
    const metrics = document.getElementById('stats-metrics');
    if (!metrics) return;

    const metricCards = [
        {
            label: 'XP gesamt',
            value: formatNumber(xpState.totalXP),
            note: `Level ${xpState.level}`
        },
        {
            label: 'Quizfragen',
            value: formatNumber(quizTotals.answers),
            note: `${quizTotals.rounds} Runden insgesamt`
        },
        {
            label: 'Lernkarten im Deck',
            value: formatNumber(flashOverview.total),
            note: `${flashOverview.dueToday} heute fällig`
        },
        {
            label: 'Meisterfächer',
            value: formatNumber(flashOverview.masteredCount),
            note: 'Karten in F5-F7'
        }
    ];

    metrics.innerHTML = metricCards.map(card => `
        <article class="stats-metric-card">
            <span class="stats-metric-label">${card.label}</span>
            <strong class="stats-metric-value">${card.value}</strong>
            <span class="stats-metric-note">${card.note}</span>
        </article>
    `).join('');
}

function renderQuizOverview(quizStats, quizTotals) {
    const overview = document.getElementById('stats-quiz-overview');
    if (!overview) return;

    if (quizTotals.answers === 0) {
        overview.innerHTML = `
            <div class="stats-empty-state">
                <strong>Noch keine Quiz-Daten</strong>
                <p>Spiele ein Quiz, dann siehst du hier Runden, Trefferquote und deinen stärksten Quiz-Typ.</p>
            </div>
        `;
        return;
    }

    const activeQuizStats = quizStats.filter(entry => entry.answers > 0);
    const mostPlayed = [...activeQuizStats].sort((a, b) => b.rounds - a.rounds || b.answers - a.answers)[0];
    const bestAccuracy = [...activeQuizStats].sort((a, b) => b.accuracy - a.accuracy || b.answers - a.answers)[0];

    overview.innerHTML = `
        <div class="stats-overview-main">
            <div class="stats-overview-value">${formatNumber(quizTotals.answers)}</div>
            <div class="stats-overview-label">Quizfragen insgesamt</div>
            <div class="stats-overview-sub">${quizTotals.correct} richtig beantwortet · ${quizTotals.accuracy}% Gesamtquote</div>
        </div>
        <div class="stats-overview-side">
            <div class="stats-overview-chip">
                <span class="stats-overview-chip-label">Meist gespielt</span>
                <strong>${mostPlayed.icon} ${mostPlayed.title}</strong>
                <span>${mostPlayed.rounds} Runden</span>
            </div>
            <div class="stats-overview-chip">
                <span class="stats-overview-chip-label">Beste Quote</span>
                <strong>${bestAccuracy.icon} ${bestAccuracy.title}</strong>
                <span>${bestAccuracy.accuracy}% Trefferquote</span>
            </div>
        </div>
    `;
}

function renderQuizCards(quizStats) {
    const grid = document.getElementById('stats-quiz-grid');
    if (!grid) return;

    grid.innerHTML = quizStats.map(entry => `
        <article class="stats-data-card">
            <div class="stats-card-header">
                <h3>${entry.icon} ${entry.title}</h3>
                <p>${entry.answers > 0 ? `${entry.answers} Fragen beantwortet` : 'Noch keine Runde gespielt'}</p>
            </div>
            <div class="stats-data-grid">
                ${renderMiniStat('Runden', formatNumber(entry.rounds))}
                ${renderMiniStat('Richtig', formatNumber(entry.correct))}
                ${renderMiniStat('Fragen', formatNumber(entry.answers))}
                ${renderMiniStat('Quote', `${entry.accuracy}%`)}
            </div>
        </article>
    `).join('');
}

function renderFlashcards(flashOverview) {
    const grid = document.getElementById('stats-flashcards-grid');
    const leitner = document.getElementById('stats-leitner');
    if (!grid || !leitner) return;

    const lastReviewed = flashOverview.lastReviewedAt
        ? `Zuletzt gelernt: ${formatDate(flashOverview.lastReviewedAt)}`
        : 'Noch keine Karte gelernt';

    grid.innerHTML = `
        <article class="stats-data-card">
            <div class="stats-card-header">
                <h3>🃏 Deck & Wiederholung</h3>
                <p>${lastReviewed}</p>
            </div>
            <div class="stats-data-grid">
                ${renderMiniStat('Im Deck', formatNumber(flashOverview.total))}
                ${renderMiniStat('Heute fällig', formatNumber(flashOverview.dueToday))}
                ${renderMiniStat('Gesehen', formatNumber(flashOverview.reviewedCards))}
                ${renderMiniStat('Schwierig', formatNumber(flashOverview.difficultCount))}
            </div>
        </article>
        <article class="stats-data-card">
            <div class="stats-card-header">
                <h3>🏆 Lernfortschritt</h3>
                <p>Deine Leitner-Leistung über das gesamte Deck.</p>
            </div>
            <div class="stats-data-grid">
                ${renderMiniStat('Meisterfächer', formatNumber(flashOverview.masteredCount))}
                ${renderMiniStat('Ø Fach', flashOverview.total > 0 ? flashOverview.averageFach.toFixed(1) : '0.0')}
                ${renderMiniStat('Richtig', formatNumber(flashOverview.totalCorrect))}
                ${renderMiniStat('Falsch', formatNumber(flashOverview.totalWrong))}
            </div>
        </article>
    `;

    renderLeitner(leitner, flashOverview.byFach);
}

function renderGoals(xpState, flashOverview, quizTotals) {
    const goals = document.getElementById('stats-goals');
    if (!goals) return;

    const xpGoal = xpState.level >= 99
        ? {
            title: 'Max-Level erreicht',
            body: 'Deine XP-Kurve ist voll. Jetzt geht es eher um Meisterschaft als um das nächste Level.',
            note: 'Level 99'
        }
        : {
            title: `Noch ${formatNumber(Math.max(0, xpState.xpNeeded - xpState.xpThisLevel))} XP bis Level ${xpState.level + 1}`,
            body: 'Ein paar Lernkarten oder Quizfragen bringen dich schon deutlich näher an das nächste Level.',
            note: `${Math.round(xpState.progress * 100)}% dieses Levels geschafft`
        };

    const quizMilestone = getNextMilestone(quizTotals.rounds, [1, 5, 10, 25, 50, 100, 250]);
    const quizGoal = quizMilestone == null
        ? {
            title: 'Quiz-Veteran',
            body: 'Du hast alle aktuellen Runden-Meilensteine in dieser Ansicht überschritten.',
            note: `${quizTotals.rounds} Runden gespielt`
        }
        : {
            title: `Noch ${quizMilestone - quizTotals.rounds} Runden bis ${quizMilestone} Quiz-Runden`,
            body: 'Regelmäßige kurze Quiz-Sessions zahlen direkt auf deine Serienstatistik ein.',
            note: `${quizTotals.accuracy}% aktuelle Gesamtquote`
        };

    let flashGoal;
    if (flashOverview.total === 0) {
        flashGoal = {
            title: 'Erstes Deck aufbauen',
            body: 'Füge Muskeln zum Karteikasten hinzu, damit Leitner-Fortschritt und Meisterfächer überhaupt entstehen können.',
            note: 'Aktuell 0 Karten im Deck'
        };
    } else {
        const masteryMilestone = getNextMilestone(flashOverview.masteredCount, [1, 5, 10, 25, 50, 100]);
        flashGoal = masteryMilestone == null
            ? {
                title: 'Meisterfokus steht',
                body: 'Dein Deck hat schon viele Karten in den hohen Fächerstufen. Halte die Serie jetzt stabil.',
                note: `${flashOverview.masteredCount} Karten in F5-F7`
            }
            : {
                title: `Noch ${masteryMilestone - flashOverview.masteredCount} Karten bis ${masteryMilestone} in F5-F7`,
                body: 'Je mehr Karten in den Meisterfächern landen, desto stärker fühlt sich der Langzeitfortschritt an.',
                note: `${flashOverview.dueToday} Karten heute fällig`
            };
    }

    goals.innerHTML = [xpGoal, quizGoal, flashGoal].map(goal => `
        <article class="stats-goal-card">
            <span class="stats-goal-kicker">Nächster Meilenstein</span>
            <h3>${goal.title}</h3>
            <p>${goal.body}</p>
            <strong>${goal.note}</strong>
        </article>
    `).join('');
}

function bindDangerZone() {
    const resetBtn = document.getElementById('reset-total-progress-btn');
    if (!resetBtn || resetBtn.dataset.bound === 'true') return;

    resetBtn.dataset.bound = 'true';
    resetBtn.addEventListener('click', async () => {
        const confirmed = await AppDialog.confirm(
            'Wirklich XP, Quiz-Statistiken und den gesamten Lernkarten-Fortschritt löschen? Das kann nicht rückgängig gemacht werden.'
        );
        if (!confirmed) return;

        BackupManager.resetAllProgress();
        await AppDialog.alert('Der gesamte Fortschritt wurde zurückgesetzt. Die Seite wird jetzt neu geladen.');
        window.location.reload();
    });
}

function renderMiniStat(label, value) {
    return `
        <div class="stats-mini-stat">
            <span class="stats-mini-label">${label}</span>
            <strong class="stats-mini-value">${value}</strong>
        </div>
    `;
}

function renderLeitner(container, byFach) {
    const maxCount = Math.max(1, ...byFach.slice(1));
    container.innerHTML = '';

    for (let fach = 1; fach <= 7; fach++) {
        const count = byFach[fach];
        const pct = Math.round((count / maxCount) * 100);
        const days = ProgressManager.FACH_INTERVALS[fach];
        const box = document.createElement('div');
        box.className = 'leitner-box';
        box.innerHTML = `
            <div class="leitner-bar-wrap">
                <div class="leitner-bar" style="background:${STATS_FACH_COLORS[fach]};height:${Math.max(6, pct * 0.6)}px"></div>
            </div>
            <div class="leitner-count">${count}</div>
            <div class="leitner-label">F${fach}<br><small>${days}d</small></div>
        `;
        container.appendChild(box);
    }
}

function getNextMilestone(value, milestones) {
    for (const milestone of milestones) {
        if (value < milestone) return milestone;
    }
    return null;
}

function formatNumber(value) {
    return numberFormatter.format(Number.isFinite(value) ? value : 0);
}

function formatDate(value) {
    try {
        return new Intl.DateTimeFormat('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(new Date(value));
    } catch (error) {
        return '-';
    }
}
