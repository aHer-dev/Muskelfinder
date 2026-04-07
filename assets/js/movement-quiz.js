/**
 * movement-quiz.js — Funktions-Quiz
 *
 * Modi:
 *   funktion-muskel  Funktion/Bewegung zeigen → richtigen Muskel wählen
 *   muskel-funktion  Muskelname zeigen         → richtige Bewegungen wählen
 *   gemischt         Zufällig pro Frage
 */

function getBasePath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return '';

    const first = parts[0];
    if (first.endsWith('.html') || ['quizzes', 'assets', 'data'].includes(first)) {
        return '';
    }

    return `/${first}`;
}

const basePath = getBasePath();

const MODE_KEY = 'muskelfinder_mv_mode';
let _mode = localStorage.getItem(MODE_KEY) || 'funktion-muskel';

async function initQuiz() {
    await MuscleData.loadConfig();
    const config = MuscleData.getConfig();
    await MuscleData.loadSelected(config.regions.map(r => r.id));
    QuizFilter.init(config, MuscleData.getAll());
    QuizSession.init(basePath, 'movement');
    document.addEventListener('quiz-restart', loadQuiz);
    loadQuiz();
}

function loadQuiz() {
    if (QuizSession.isComplete()) { QuizSession.showSummary(); return; }

    const pool = QuizFilter.getPool();

    const effectiveMode = _mode === 'gemischt'
        ? (Math.random() < 0.5 ? 'funktion-muskel' : 'muskel-funktion')
        : _mode;

    const usable = pool.filter(m =>
        effectiveMode === 'funktion-muskel' ? !!m.Function : !!m.Movements
    );

    if (usable.length < 4) {
        document.getElementById('quizHead').textContent = '⚠️ Zu wenige Muskeln';
        document.getElementById('question').textContent = '';
        document.getElementById('options').innerHTML =
            '<p class="quiz-empty-hint">Zu wenige Muskeln — bitte Auswahl auf der <a href="quiz.html">Lernseite</a> anpassen.</p>';
        return;
    }

    const muscle = usable[Math.floor(Math.random() * usable.length)];
    renderQuiz(muscle, effectiveMode, pool);
}

function renderQuiz(muscle, effectiveMode, pool) {
    if (effectiveMode === 'funktion-muskel') {
        document.getElementById('quizHead').textContent = 'Welcher Muskel hat diese Funktion?';
        document.getElementById('question').textContent = muscle.Function;

        const distractors = QuizFilter.pickDistractors(muscle, pool);

        _renderOptions(
            [muscle, ...distractors].sort(() => Math.random() - 0.5),
            m => m.Name,
            muscle.Name
        );
    } else {
        document.getElementById('quizHead').textContent = 'Welche Bewegungen macht dieser Muskel?';
        document.getElementById('question').innerHTML = '<strong>' + muscle.Name + '</strong>';

        const distractors = QuizFilter.pickDistractors(
            muscle,
            pool.filter(m => m.Movements && m.Movements !== muscle.Movements)
        );

        _renderOptions(
            [muscle, ...distractors].sort(() => Math.random() - 0.5),
            m => m.Movements,
            muscle.Name
        );
    }
}

function _renderOptions(muscles, displayFn, correctName) {
    const container = document.getElementById('options');
    container.innerHTML = '';
    muscles.forEach(m => {
        const btn = document.createElement('button');
        btn.className    = 'option';
        btn.textContent  = displayFn(m);
        btn.dataset.name = m.Name;
        btn.addEventListener('click', () => validateAnswer(btn, m.Name, correctName));
        container.appendChild(btn);
    });
}

function validateAnswer(button, selected, correctName) {
    const feedback = document.getElementById('feedback');
    document.querySelectorAll('.option').forEach(b => b.disabled = true);

    const correctBtn   = document.querySelector(`.option[data-name="${CSS.escape(correctName)}"]`);
    const correctLabel = correctBtn ? correctBtn.textContent : '';

    if (selected === correctName) {
        button.classList.add('correct');
        feedback.className   = 'feedback success';
        feedback.textContent = '✓ Richtig!';
        correctAnswers++;
        QuizSession.record(correctName, true, '');
        Gamification.awardQuizQuestion('multiple-choice', true);
    } else {
        button.classList.add('wrong');
        document.querySelectorAll('.option').forEach(b => {
            if (b.dataset.name === correctName) b.classList.add('correct');
        });
        feedback.className   = 'feedback error';
        feedback.textContent = '✗ Falsch!';
        wrongAnswers++;
        QuizSession.record(correctName, false, correctLabel);
    }

    updateStatusBar();

    setTimeout(() => {
        feedback.className   = 'feedback';
        feedback.textContent = '';
        loadQuiz();
    }, 2000);
}

function updateStatusBar() {
    const total = correctAnswers + wrongAnswers;
    const pct   = total > 0 ? Math.round((correctAnswers / total) * 100) : 0;
    document.getElementById('correctCount').textContent = correctAnswers;
    document.getElementById('wrongCount').textContent   = wrongAnswers;
    document.getElementById('accuracy').textContent     = pct + '%';
    Gamification.renderXPBar('quiz-xp-bar');
}

document.addEventListener('DOMContentLoaded', initQuiz);
