// Prüft, ob wir auf GitHub Pages oder lokal sind
const isGitHub = window.location.hostname.includes("github.io");
const basePath = isGitHub ? "/Muskelfinder" : ".."; // Setzt den Basis-Pfad

const quizTypes = {
    imageMatch: {
        title: "Bildzuordnung",
        description: "Ordne die Bilder den richtigen Muskeln zu.",
        start: () => {
            window.location.href = "/quizzes/image-match-quiz.html";
        }
    },

    originInsertion: {
        title: "Ursprung & Ansatz",
        description: "Wähle die richtigen Ansätze und Ursprünge aus.",
        start: () => {
            window.location.href = "/quizzes/origin-insertion-quiz.html";
        }
    },

    muscleComparison: {
        title: "Muskelvergleich",
        description: "Erkenne den Muskel anhand seiner Eigenschaften",
        start: () => {
            window.location.href = "/quizzes/muscle-comparison-quiz.html";
        }
    }
};

function startQuiz(quizType) {
    quizTypes[quizType].start();
}
