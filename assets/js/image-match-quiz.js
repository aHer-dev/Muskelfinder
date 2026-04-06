const isGitHub = window.location.hostname.includes("github.io");
const basePath = isGitHub ? "/Muskelfinder" : "";

let currentMuscle;
let quizMode = 'bild-name'; // 'bild-name' | 'name-bild'
const modalElements = {
    modal: document.getElementById('imageModal'),
    modalImage: document.getElementById('modalImage'),
    closeButton: document.querySelector('.closeButton')
};

async function initQuiz() {
    await MuscleData.loadConfig();
    const config = MuscleData.getConfig();
    await MuscleData.loadSelected(config.regions.map(r => r.id));

    QuizFilter.init(config, MuscleData.getAll());
    QuizSession.init(basePath);
    document.addEventListener('quiz-restart', loadQuiz);
    initImageModal();

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
    const withImage = pool.filter(m => MuscleData.getPrimaryImage(m));

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
    img.src = basePath + MuscleData.getPrimaryImage(muscle);
    img.onerror = () => { loadQuiz(); };
    img.onclick = () => openImageModal(MuscleData.getPrimaryImage(muscle), muscle.Name);

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
        const card = document.createElement('div');
        card.className = 'option-img';
        card.dataset.name = opt.Name;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-img-select';
        btn.dataset.name = opt.Name;

        const img = document.createElement('img');
        const imagePath = MuscleData.getPrimaryImage(opt);
        img.src = basePath + imagePath;
        img.alt = opt.Name;

        btn.appendChild(img);
        btn.addEventListener('click', () => validateAnswer(card, opt.Name, muscle.Name, 'img'));

        const zoomButton = document.createElement('button');
        zoomButton.type = 'button';
        zoomButton.className = 'option-img-zoom';
        zoomButton.setAttribute('aria-label', `${opt.Name} vergrößern`);
        zoomButton.textContent = 'Zoom';
        zoomButton.addEventListener('click', () => openImageModal(imagePath, opt.Name));

        card.appendChild(btn);
        card.appendChild(zoomButton);
        container.appendChild(card);
    });
}

// ── Auswertung ───────────────────────────────────────────────────
function validateAnswer(button, selected, correct, type) {
    const feedback = document.getElementById('feedback');
    const allButtons = document.querySelectorAll('.option, .option-img-select, .option-img-zoom');
    const allCards = document.querySelectorAll('.option-img');
    allButtons.forEach(b => b.disabled = true);

    const isCorrect = selected === correct;

    if (type === 'img') {
        button.classList.add(isCorrect ? 'correct' : 'wrong');
        if (!isCorrect) {
            allCards.forEach(card => { if (card.dataset.name === correct) card.classList.add('correct'); });
        }
    } else {
        button.classList.add(isCorrect ? 'correct' : 'wrong');
        if (!isCorrect) {
            document.querySelectorAll('.option').forEach(b => {
                if (b.textContent === correct) b.classList.add('correct');
            });
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

function initImageModal() {
    if (modalElements.closeButton) {
        modalElements.closeButton.addEventListener('click', closeImageModal);
    }

    if (modalElements.modal) {
        modalElements.modal.addEventListener('click', e => {
            if (e.target === modalElements.modal) closeImageModal();
        });
    }

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && isImageModalOpen()) {
            closeImageModal();
        }
    });
}

function openImageModal(imagePath, altText) {
    if (!imagePath || !modalElements.modal || !modalElements.modalImage) return;
    modalElements.modalImage.src = basePath + imagePath;
    modalElements.modalImage.alt = altText || 'Vergrößertes Muskelbild';
    modalElements.modal.style.display = 'block';
}

function closeImageModal() {
    if (modalElements.modal) modalElements.modal.style.display = 'none';
}

function isImageModalOpen() {
    return modalElements.modal?.style.display === 'block';
}

document.addEventListener('DOMContentLoaded', initQuiz);
