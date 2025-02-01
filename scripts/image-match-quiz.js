let muscles = [];
let currentMuscle;

// JSON-Daten laden
fetch('/data/muscles.json')
    .then(response => response.json())
    .then(data => {
      muscles = data.Sheet1.map(muscle => ({
        ...muscle,
        Image: muscle.Image.startsWith('/') ? muscle.Image : `/${muscle.Image}`
      }));
      loadQuiz();
    })
    .catch(error => console.error('Fehler beim Laden der JSON-Daten:', error));

function getRandomMuscle() {
  return muscles[Math.floor(Math.random() * muscles.length)];
}

function getSmartDistractors(targetMuscle, count) {
  return muscles
    .filter(m => 
      m.Joints === targetMuscle.Joints || 
      m.Function === targetMuscle.Function
    )
    .slice(0, count)
    .map(m => m.Name);
}

function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

function loadQuiz() {
  currentMuscle = getRandomMuscle();
  generateImageQuiz(currentMuscle);
}

function generateImageQuiz(muscle) {
  const img = document.getElementById('mainImage');
  img.src = muscle.Image;

  img.onerror = () => {
    console.error(`Bild konnte nicht geladen werden: ${muscle.Image}`);
    img.src = '/assets/images/640px-Biceps_brachii_muscle06.png'; // Fallback-Bild
  };

  const options = shuffleArray([
    muscle.Name,
    ...getSmartDistractors(muscle, 3)
  ]);

  document.getElementById('options').innerHTML = options
    .map(opt => `
      <button class="option" 
              onclick="validateAnswer('${opt === muscle.Name}')">
        ${opt}
      </button>
    `).join('');
}

function validateAnswer(isCorrect) {
  const feedback = document.getElementById('feedback');
  feedback.innerHTML = isCorrect ? 
    "✓ Richtig! Gut gemacht!" : 
    "✗ Falsch. Versuche es nochmal!";
  
  feedback.style.color = isCorrect ? "#28a745" : "#dc3545";
  
  setTimeout(loadQuiz, 2000);
}