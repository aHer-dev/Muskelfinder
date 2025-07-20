// Initiale Werte aus localStorage laden
const isGitHub = window.location.hostname.includes("github.io");
const basePath = isGitHub ? "/Muskelfinder" : "";

let muscles = [];
let currentMuscle;

// JSON-Daten laden
fetch(basePath + '/data/muscles.json')
    .then(response => {
        if (!response.ok) throw new Error(`HTTP Fehler! Status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        muscles = data.Sheet1; // Entferne Image-Mapping
        loadQuiz();
    })
    .catch(error => {
        console.error('Fehler beim Laden der JSON-Daten:', error);
        document.getElementById('feedback').innerHTML = `<p>Fehler: ${error.message}. Stelle sicher, dass muscles.json im /data/ Ordner liegt.</p>`;
    });

function getRandomMuscle() {
    return muscles[Math.floor(Math.random() * muscles.length)];
}

function loadQuiz() {
    currentMuscle = getRandomMuscle();
    generateImageQuiz(currentMuscle);
}

function generateImageQuiz(muscle) {
    const img = document.getElementById('mainImage');
const imgSrc = basePath + muscle.Image;
console.log("Image source:", imgSrc); // Debug
img.src = imgSrc;
img.onerror = () => {
    console.error(`Bild konnte nicht geladen werden: ${imgSrc}`);
    img.src = basePath + '/assets/images/640px-Biceps_brachii_muscle06.png';
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

function getSmartDistractors(targetMuscle, count) {
    let distractors = muscles
        .filter(m => m.Joints === targetMuscle.Joints || m.Function === targetMuscle.Function)
        .map(m => m.Name)
        .filter(name => name !== targetMuscle.Name);

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

function validateAnswer(event, selectedName, correctName) {
    const button = event.target;
    const feedback = document.getElementById('feedback');

    if (selectedName === correctName) {
        button.classList.add("correct");
        feedback.classList.add("success");
        feedback.innerHTML = "✓ Richtig! Gut gemacht!";
        correctAnswers++;
        updatePoints(10); // Punkte hinzufügen (wie in origin)
    } else {
        button.classList.add("wrong");
        feedback.classList.add("error");
        feedback.innerHTML = "✗ Falsch. Versuche es nochmal!";
        wrongAnswers++;
    }

    // Statusleiste aktualisieren und Werte speichern
    updateStatusBar();
    updateAccuracy(correctAnswers, wrongAnswers); // Aus progress.js

    setTimeout(() => {
        feedback.classList.remove("success", "error");
        feedback.innerHTML = "";
        loadQuiz();
    }, 2000);
}

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