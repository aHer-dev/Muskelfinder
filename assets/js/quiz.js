// Füge basePath am Anfang hinzu
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

const quizTypes = {
    imageMatch: {
        title: "Bildzuordnung",
        description: "Ordne die Bilder den richtigen Muskeln zu.",
        start: () => {
            const url = basePath + "/quizzes/image-match-quiz.html";
            console.log("Attempting to navigate to:", url); // Debug
            window.location.href = url;
        }
    },
    originInsertion: {
        title: "Ursprung & Ansatz",
        description: "Wähle die richtigen Ansätze und Ursprünge aus.",
        start: () => {
            const url = basePath + "/quizzes/origin-insertion-quiz.html";
            console.log("Attempting to navigate to:", url); // Debug
            window.location.href = url;
        }
    }
    
};

function startQuiz(quizType) {
    quizTypes[quizType].start();
}
