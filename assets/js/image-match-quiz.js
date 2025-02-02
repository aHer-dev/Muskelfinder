let correctAnswers = 0;
let wrongAnswers = 0;
let muscles = [];
let currentMuscle;

// ✅ Dynamische Erkennung: GitHub Pages oder Localhost?
const isGitHub = window.location.hostname.includes("github.io");
const basePath = isGitHub ? "/Muskelfinder" : ".."; 

// 🟢 JSON-Daten laden (mit dynamischem Pfad)
async function loadMuscleData() {
    try {
        const url = `${basePath}/data/muscles.json`;
        console.log(`Lade Muskel-Daten von: ${url}`);

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP Fehler! Status: ${response.status}`);
        }

        const data = await response.json();
        muscles = data.Sheet1.map(muscle => ({
            ...muscle,
            Image: muscle.Image.startsWith('/') ? muscle.Image : `${basePath}/${muscle.Image}`
        }));

        console.log("Muskel-Daten erfolgreich geladen:", muscles);
        loadQuiz();
    } catch (error) {
        console.error('Fehler beim Laden der JSON-Daten:', error);
        document.getElementById('result-list').innerHTML = '<li>Daten konnten nicht geladen werden</li>';
    }
}

// 📌 Quiz-Funktionen
function getRandomMuscle() {
    return muscles[Math.floor(Math.random() * muscles.length)];
}

function getSmartDistractors(targetMuscle, count) {
    let distractors = muscles
        .filter(m => 
            m.Joints === targetMuscle.Joints || 
            m.Function === targetMuscle.Function
        )
        .map(m => m.Name);

    // Entferne Duplikate und die richtige Antwort
    distractors = [...new Set(distractors)].filter(name => name !== targetMuscle.Name);

    while (distractors.length < count) {
        let randomMuscle = getRandomMuscle().Name;
        if (!distractors.includes(randomMuscle) && randomMuscle !== targetMuscle.Name) {
            distractors.push(randomMuscle);
        }
    }
    return distractors.slice(0, count);
}

function shuffleArray(array) {
    return [...array].sort(() => Math.random() - 0.5);
}

function loadQuiz() {
    currentMuscle = getRandomMuscle();
    generateImageQuiz(currentMuscle);
}

// 📌 Bild-Quiz generieren
function generateImageQuiz(muscle) {
    const img = document.getElementById('mainImage');
    img.src = muscle.Image;

    img.onerror = () => {
        console.error(`Bild konnte nicht geladen werden: ${muscle.Image}`);
        img.src = `${basePath}/assets/images/640px-Biceps_brachii_muscle06.png`; // Fallback-Bild
    };

    const options = shuffleArray([
        muscle.Name,
        ...getSmartDistractors(muscle, 3)
    ]);

    document.getElementById('options').innerHTML = options
        .map(opt => `
            <button class="option" 
                    onclick="validateAnswer(event, '${opt}', '${muscle.Name}')">
              ${opt}
            </button>
        `).join('');
}

// 📌 Antwort validieren
function validateAnswer(event, selectedName, correctName) {
    const button = event.target;
    const feedback = document.getElementById('feedback');

    if (selectedName === correctName) {
        button.classList.add("correct");
        feedback.classList.add("success");
        feedback.innerHTML = "✓ Richtig! Gut gemacht!";
        correctAnswers++;
    } else {
        button.classList.add("wrong");
        feedback.classList.add("error");
        feedback.innerHTML = "✗ Falsch. Versuche es nochmal!";
        wrongAnswers++;
    }

    updateStatusBar();

    setTimeout(() => {
        feedback.classList.remove("success", "error");
        feedback.innerHTML = "";
        loadQuiz();
    }, 2000);
}

// 📌 Statusbar aktualisieren
function updateStatusBar() {
    const correctCount = document.getElementById('correctCount');
    const wrongCount = document.getElementById('wrongCount');
    const accuracy = document.getElementById('accuracy');
    const indicator = document.getElementById('accuracyIndicator');

    const totalAnswers = correctAnswers + wrongAnswers;
    let accuracyPercentage = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

    correctCount.textContent = correctAnswers;
    wrongCount.textContent = wrongAnswers;
    accuracy.textContent = accuracyPercentage + "%";

    if (accuracyPercentage >= 80) {
        indicator.style.backgroundColor = "green";
    } else if (accuracyPercentage >= 50) {
        indicator.style.backgroundColor = "yellow";
    } else {
        indicator.style.backgroundColor = "red";
    }
}

// 📌 Starte das Laden der Daten beim Öffnen der Seite
document.addEventListener('DOMContentLoaded', () => {
    loadMuscleData();
});