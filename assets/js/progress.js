let points = localStorage.getItem('muskelPoints') ? parseInt(localStorage.getItem('muskelPoints')) : 0;
let correctAnswers = localStorage.getItem('muskelCorrectAnswers') ? parseInt(localStorage.getItem('muskelCorrectAnswers')) : 0;
let wrongAnswers = localStorage.getItem('muskelWrongAnswers') ? parseInt(localStorage.getItem('muskelWrongAnswers')) : 0;
let accuracy = 0; // Wird pro Quiz aktualisiert

function updatePoints(addPoints) {
    points += addPoints;
    localStorage.setItem('muskelPoints', points);
    let notification = document.getElementById('notification');
    if (notification) {
        // Zeige zuerst die Punkte-Nachricht
        notification.textContent = 'Du hast ' + addPoints + ' Punkte bekommen! Gesamt: ' + points;
        notification.classList.add('show');
        // Nach 3 Sekunden Badge prüfen und anzeigen, wenn Bedingung erfüllt
        setTimeout(function() {
            notification.classList.remove('show');
            let badge = '';
            if (points >= 50 && points < 200) {
                badge = 'Rang: Anatomy-Rooky!';
            } else if (points >= 200 && points < 500) {
                badge = 'Rang: Muscel-Expert!';
            } else if (points >= 500 && points < 1000) {
                badge = 'Rang: Muscle-Pro!';
            } else if (points >= 1000) {
                badge = 'Rang: Anatomy-Master!';
            }
            if (badge) {
                notification.textContent = badge;
                notification.classList.add('show');
                setTimeout(function() {
                    notification.classList.remove('show');
                }, 3000);
            }
        }, 3000);
    }
    let pointsElement = document.getElementById('points');
    if (pointsElement) {
        pointsElement.textContent = points;
    }
}

function updateAccuracy(correct, wrong) {
    correctAnswers = correct;
    wrongAnswers = wrong;
    localStorage.setItem('muskelCorrectAnswers', correctAnswers);
    localStorage.setItem('muskelWrongAnswers', wrongAnswers);
    
    const total = correctAnswers + wrongAnswers;
    accuracy = total > 0 ? Math.round((correctAnswers / total) * 100) : 0;
    
    let accuracyElement = document.getElementById('accuracy');
    if (accuracyElement) {
        accuracyElement.textContent = accuracy + '%';
    }
    
    let indicator = document.getElementById('accuracyIndicator');
    if (indicator) {
        if (accuracy >= 80) indicator.style.backgroundColor = "green";
        else if (accuracy >= 50) indicator.style.backgroundColor = "yellow";
        else indicator.style.backgroundColor = "red";
    }
}

// Initiale Anzeige der Genauigkeit beim Laden der Seite
document.addEventListener('DOMContentLoaded', () => {
    updateAccuracy(correctAnswers, wrongAnswers);
});