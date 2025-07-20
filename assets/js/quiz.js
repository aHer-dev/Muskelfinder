// Füge basePath am Anfang hinzu
const isGitHub = window.location.hostname.includes("github.io");
const basePath = isGitHub ? "/Muskelfinder/" : "";

const quizTypes = {
    imageMatch: {
        title: "Bildzuordnung",
        description: "Ordne die Bilder den richtigen Muskeln zu.",
        start: () => {
            window.location.href = basePath + "quizzes/image-match-quiz.html";
            console.log("Navigating to:", basePath + "quizzes/image-match-quiz.html"); // Debug
        }
    },
    originInsertion: {
        title: "Ursprung & Ansatz",
        description: "Wähle die richtigen Ansätze und Ursprünge aus.",
        start: () => {
            window.location.href = basePath + "quizzes/origin-insertion-quiz.html";
            console.log("Navigating to:", basePath + "quizzes/origin-insertion-quiz.html"); // Debug
        }
    },
    muscleComparison: {
        title: "Muskelvergleich",
        description: "Erkenne den Muskel anhand seiner Eigenschaften",
        start: () => {
            window.location.href = basePath + "quizzes/muscle-comparison-quiz.html";
            console.log("Navigating to:", basePath + "quizzes/muscle-comparison-quiz.html"); // Debug
        }
    }
};

function startQuiz(quizType) {
    quizTypes[quizType].start();
}
