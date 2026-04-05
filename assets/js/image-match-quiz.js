const isGitHub = window.location.hostname.includes("github.io");
const basePath = isGitHub ? "/Muskelfinder" : "";

let currentMuscle;
let quizMode = 'bild-name'; // 'bild-name' | 'name-bild'

async function initQuiz() {
    await MuscleData.loadConfig();
    const config = MuscleData.getConfig();
    await MuscleData.loadSelected(config.regions.map(r => r.id));

    QuizFilter.init(config, MuscleData.getAll());
    QuizSession.init(basePath);
    document.addEventListener('quiz-restart', loadQuiz);

    // Modus-Tabs
    document.getElementById('img-mode-tabs').addEventListener('click', e => {
        const tab = e.target.closest('.img-mode-tab');
        if (!tab || tab.dataset.mode === quizMode) return;
        quizMode = tab.dataset.mode;
        document.querySelectorAll('.img-mode-tab').forEach(t => t.classList.toggle('active', t === tab));
        loadQuiz();
    });

    loadQuiz();
}

function loadQuiz() {
    if (QuizSession.isComplete()) { QuizSession.showSummary(); return; }

    const pool      = QuizFilter.getPool();
    const withImage = pool.filter(m => m.Image);

    if (withImage.length < 4) {
        document.getElementById('options').innerHTML =
            '<p class="quiz-empty-hint">Zu wenige Muskeln mit Bild — bitte Auswahl auf der <a href="quiz.html">Lernseite</a> anpassen.</p>';
        document.getElementById('quizHead').textContent = '⚠️ Zu wenige Muskeln';
        return;
    }

    currentMuscle = withImage[Math.floor(Math.random() * withImage.length)];

    if (quizMode === 'bild-name') {
        renderBildName(currentMuscle, withImage);
    } else {
        renderNameBild(currentMuscle, withImage);
    }
}

// ── Modus A: Bild → Name ─────────────────────────────────────────
function renderBildName(muscle, pool) {
    document.getElementById('quizHead').textContent = 'Welcher Muskel ist abgebildet?';
    document.getElementById('main-image-wrap').hidden = false;
    document.getElementById('target-name-wrap').hidden = true;

    const img = document.getElementById('mainImage');
    img.src = basePath + muscle.Image;
    img.onerror = () => { loadQuiz(); };

    const distractors = QuizFilter.pickDistractors(muscle, pool).map(m => m.Name);

    const options = [muscle.Name, ...distractors].sort(() => Math.random() - 0.5);

    const container = document.getElementById('options');
    container.className = 'options-name-grid';
    container.innerHTML = '';

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className   = 'option';
        btn.textContent = opt;
        btn.addEventListener('click', () => validateAnswer(btn, opt, muscle.Name, 'name'));
        container.appendChild(btn);
    });
}

// ── Modus B: Name → Bild ─────────────────────────────────────────
function renderNameBild(muscle, pool) {
    document.getElementById('quizHead').textContent = 'Welches Bild zeigt diesen Muskel?';
    document.getElementById('main-image-wrap').hidden = true;

    const nameWrap = document.getElementById('target-name-wrap');
    nameWrap.hidden = false;
    nameWrap.textContent = muscle.Name;

    const distractors = QuizFilter.pickDistractors(muscle, pool);

    const options = [muscle, ...distractors].sort(() => Math.random() - 0.5);

    const container = document.getElementById('options');
    container.className = 'options-image-grid';
    container.innerHTML = '';

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-img';
        btn.dataset.name = opt.Name;

        const img = document.createElement('img');
        img.src = basePath + opt.Image;
        img.alt = opt.Name;

        btn.appendChild(img);
        btn.addEventListener('click', () => validateAnswer(btn, opt.Name, muscle.Name, 'img'));
        container.appendChild(btn);
    });
}

// ── Auswertung ───────────────────────────────────────────────────
function validateAnswer(button, selected, correct, type) {
    const feedback = document.getElementById('feedback');
    const allBtns  = document.querySelectorAll('.option, .option-img');
    allBtns.forEach(b => b.disabled = true);

    const isCorrect = selected === correct;

    if (type === 'img') {
        button.classList.add(isCorrect ? 'correct' : 'wrong');
        if (!isCorrect) {
            allBtns.forEach(b => { if (b.dataset.name === correct) b.classList.add('correct'); });
        }
    } else {
        button.classList.add(isCorrect ? 'correct' : 'wrong');
        if (!isCorrect) {
            allBtns.forEach(b => { if (b.textContent === correct) b.classList.add('correct'); });
        }
    }

    if (isCorrect) {
        feedback.className   = 'feedback success';
        feedback.textContent = '✓ Richtig!';
        correctAnswers++;
        QuizSession.record(correct, true, '');
        Gamification.awardQuizQuestion('image-match', true);
    } else {
        feedback.className   = 'feedback error';
        feedback.textContent = `✗ Falsch! → ${correct}`;
        wrongAnswers++;
        QuizSession.record(correct, false, correct);
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
