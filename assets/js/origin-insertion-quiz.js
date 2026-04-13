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

const MODE_KEY = 'muskelfinder_oi_mode';
let _mode = localStorage.getItem(MODE_KEY) || 'ursprung-ansatz';
let currentMuscle;
let _previewImageLoadToken = 0;
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
    QuizSession.init(basePath, 'origin-insertion');
    document.addEventListener('quiz-restart', loadQuiz);
    initImageModal();
    loadQuiz();
}

function loadQuiz() {
    if (QuizSession.isComplete()) { QuizSession.showSummary(); return; }

    const pool = QuizFilter.getPool();
    const usable = pool.filter(m => m.Origin && m.Insertion);

    if (usable.length < 4) {
        document.getElementById('options').innerHTML =
            '<p class="quiz-empty-hint">Zu wenige Muskeln — bitte Auswahl auf der <a href="quiz.html">Lernseite</a> anpassen.</p>';
        document.getElementById('quizHead').textContent  = '⚠️ Zu wenige Muskeln';
        document.getElementById('muscle-name').textContent = '';
        document.getElementById('question').textContent    = '';
        return;
    }

    currentMuscle = QuizSession.pickNext(usable);
    if (!currentMuscle) return;
    renderQuiz(currentMuscle);
}

function renderQuiz(muscle) {
    const pool = QuizFilter.getPool();

    const effectiveMode = _mode === 'gemischt'
        ? (Math.random() < 0.5 ? 'ursprung-ansatz' : 'ansatz-ursprung')
        : _mode;

    const img = document.getElementById('mainImage');
    const imageContainer = img.closest('.image-container');
    const previewImage = MuscleData.getImages(muscle)[0] || '';

    if (previewImage) {
        if (imageContainer) imageContainer.hidden = false;
        img.src = '';
        img.classList.remove('is-ready');
        img.onclick = () => openImageModal(previewImage, muscle.Name);
        void loadPreviewImage(previewImage, { fetchPriority: 'high' });
    } else {
        img.src = '';
        img.onerror = null;
        img.onclick = null;
        img.classList.remove('is-ready');
        if (imageContainer) imageContainer.hidden = true;
    }

    if (effectiveMode === 'ursprung-ansatz') {
        document.getElementById('quizHead').textContent    = 'Welcher Ansatz passt zum Ursprung?';
        document.getElementById('muscle-name').textContent = muscle.Name;
        document.getElementById('question').innerHTML =
            '<strong>Ursprung:</strong> ' + formatOrigin(muscle.Origin);

        const distractors = QuizFilter.pickDistractors(
            muscle,
            pool.filter(m => m.Insertion)
        );

        _renderOptions(
            [muscle, ...distractors].sort(() => Math.random() - 0.5),
            m => formatInsertion(m.Insertion),
            muscle.Name
        );
    } else {
        document.getElementById('quizHead').textContent    = 'Welcher Ursprung passt zum Ansatz?';
        document.getElementById('muscle-name').textContent = muscle.Name;
        document.getElementById('question').innerHTML =
            '<strong>Ansatz:</strong> ' + formatInsertion(muscle.Insertion);

        const distractors = QuizFilter.pickDistractors(
            muscle,
            pool.filter(m => m.Origin)
        );

        _renderOptions(
            [muscle, ...distractors].sort(() => Math.random() - 0.5),
            m => formatOrigin(m.Origin),
            muscle.Name
        );
    }
}

function _renderOptions(muscles, displayFn, correctName) {
    const container = document.getElementById('options');
    container.innerHTML = '';
    muscles.forEach(m => {
        const btn = document.createElement('button');
        btn.className       = 'option';
        btn.textContent     = displayFn(m);
        btn.dataset.name    = m.Name;
        btn.addEventListener('click', () => validateAnswer(btn, m.Name, correctName));
        container.appendChild(btn);
    });
}

function formatOrigin(origin) {
    if (typeof origin === 'string') return origin;
    if (!Array.isArray(origin)) return 'Keine Daten verfügbar';
    return origin.map(o => o.Part ? o.Part + ': ' + o.Location : o.Location).join(', ');
}

function formatInsertion(insertion) {
    if (!insertion) return '–';
    if (Array.isArray(insertion)) return insertion.join(', ');
    return insertion;
}

function validateAnswer(button, selected, correctName) {
    const feedback = document.getElementById('feedback');
    document.querySelectorAll('.option').forEach(b => b.disabled = true);

    // Anzeigetext der korrekten Antwort für die Auswertung
    const correctBtn   = document.querySelector(`.option[data-name="${CSS.escape(correctName)}"]`);
    const correctLabel = correctBtn ? correctBtn.textContent : '';

    if (selected === correctName) {
        button.classList.add('correct');
        feedback.className   = 'feedback success';
        feedback.textContent = '✓ Richtig!';
        correctAnswers++;
        QuizSession.record(correctName, true, '');
        Gamification.awardQuizQuestion('origin-insertion', true);
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

async function openImageModal(imagePath, altText) {
    if (!imagePath || !modalElements.modal || !modalElements.modalImage) return;
    try {
        const resolvedPath = await MuscleData.preloadImage(imagePath, { fetchPriority: 'high' });
        modalElements.modalImage.src = resolvedPath;
        modalElements.modalImage.alt = altText || 'Vergrößertes Muskelbild';
        modalElements.modal.style.display = 'block';
    } catch (error) {
        console.warn('Bild konnte nicht geladen werden:', imagePath, error);
    }
}

function closeImageModal() {
    if (modalElements.modal) modalElements.modal.style.display = 'none';
}

function isImageModalOpen() {
    return modalElements.modal?.style.display === 'block';
}

async function loadPreviewImage(imagePath, options = {}) {
    const img = document.getElementById('mainImage');
    const imageContainer = img?.closest('.image-container');
    if (!img || !imageContainer || !imagePath) return;

    const token = ++_previewImageLoadToken;
    img.dataset.imagePath = imagePath;
    img.classList.remove('is-ready');
    imageContainer.classList.add('is-loading');

    try {
        const resolvedPath = await MuscleData.preloadImage(imagePath, options);
        if (token !== _previewImageLoadToken || img.dataset.imagePath !== imagePath) return;
        img.src = resolvedPath;
        img.classList.add('is-ready');
    } catch (error) {
        if (token !== _previewImageLoadToken) return;
        img.src = '';
        imageContainer.hidden = true;
        console.warn('Vorschaubild konnte nicht geladen werden:', imagePath, error);
    } finally {
        if (token === _previewImageLoadToken) {
            imageContainer.classList.remove('is-loading');
        }
    }
}

document.addEventListener('DOMContentLoaded', initQuiz);
