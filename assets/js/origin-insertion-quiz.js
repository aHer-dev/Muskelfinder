const isGitHub = window.location.hostname.includes("github.io");
const basePath = isGitHub ? "/Muskelfinder" : "";

let muscles = [];
let currentMuscle;

// JSON-Daten laden
fetch(basePath + '/data/muscles.json')
    .then(response => {
        if (!response.ok) throw new Error('JSON-Datei nicht gefunden: ' + response.status);
        return response.json();
    })
    .then(data => {
        muscles = data.Sheet1.map(muscle => ({
            ...muscle,
            Image: muscle.Image.startsWith('/') ? muscle.Image : `/${muscle.Image}`
        }));
        if (muscles.length === 0) throw new Error('Keine Muskeln in der JSON-Datei');
        loadQuiz();
    })
    .catch(error => {
        console.error('Fehler beim Laden der JSON-Daten:', error);
        document.getElementById('feedback').innerHTML = `<p>Fehler: ${error.message}. Das Quiz kann nicht fortgesetzt werden.</p>`;
    });

function getRandomMuscle() {
    return muscles[Math.floor(Math.random() * muscles.length)];
}

function shuffleArray(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function getSmartDistractors(targetMuscle, count) {
    let distractors = muscles
        .filter(m => m.Name !== targetMuscle.Name)
        .sort(() => 0.5 - Math.random())
        .slice(0, count);
    return distractors;
}

function loadQuiz() {
    currentMuscle = getRandomMuscle();
    const questionBox = document.getElementById('question');
    const image = document.getElementById('mainImage');
    const nameField = document.getElementById('muscle-name');

    // Ursprung anzeigen
    questionBox.innerHTML = `<strong>Ursprung:</strong> ${formatOriginText(currentMuscle.Origin)}`;

    // Muskelbild setzen
    image.src = currentMuscle.Image;
    image.onerror = () => {
        image.src = '/assets/images/640px-Biceps_brachii_muscle06.png'; // Fallback
    };

    // Muskelname (z. B. in kleiner Schrift)
    nameField.textContent = currentMuscle.Name;

    // Distraktoren (falsche Insertionen)
    const distractors = getSmartDistractors(currentMuscle, 3).map(m => m.Insertion);
    const options = shuffleArray([currentMuscle.Insertion, ...distractors]);

    document.getElementById('options').innerHTML = options.map(opt => `
        <button class="option" onclick="validateAnswer(event, '${opt}', '${currentMuscle.Insertion}')">${opt}</button>
    `).join('');
}

function formatOriginText(origin) {
    if (typeof origin === 'string') return origin;
    if (!Array.isArray(origin)) return "Keine Daten verfügbar";
    return origin.map(o => o.Part ? `${o.Part}: ${o.Location}` : o.Location).join(', ');
}

function validateAnswer(event, selectedName, correctName) {
    const button = event.target;
    const feedback = document.getElementById('feedback');

    if (selectedName === correctName) {
        button.classList.add("correct");
        feedback.classList.add("success");
        feedback.innerHTML = "✓ Richtig! Gut gemacht!";
        correctAnswers++;
        updatePoints(10); // Punkte hinzufügen
    } else {
        button.classList.add("wrong");
        feedback.classList.add("error");
        feedback.innerHTML = "✗ Falsch. Versuche es nochmal!";
        wrongAnswers++;
    }

    updateStatusBar();
    updateAccuracy(correctAnswers, wrongAnswers); // Aus progress.js

    setTimeout(() => {
        feedback.classList.remove("success", "error");
        feedback.innerHTML = "";
        if (muscles.length > 0) {
            loadQuiz();
        } else {
            feedback.innerHTML = '<p>Keine weiteren Muskeln verfügbar.</p>';
        }
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

    if (accuracyPercentage >= 80) indicator.style.backgroundColor = "green";
    else if (accuracyPercentage >= 50) indicator.style.backgroundColor = "yellow";
    else indicator.style.backgroundColor = "red";
}