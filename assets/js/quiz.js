// Füge basePath am Anfang hinzu
const isGitHub = window.location.hostname.includes("github.io");
const basePath = isGitHub ? "/Muskelfinder" : "";

const quizTypes = {
    imageMatch: {
        title: "Bildzuordnung",
        description: "Ordne die Bilder den richtigen Muskeln zu.",
        start: () => {
            const url = basePath + "image-match-quiz.html";
            console.log("Attempting to navigate to:", url); // Debug
            window.location.href = url;
        }
    },
    originInsertion: {
        title: "Ursprung & Ansatz",
        description: "Wähle die richtigen Ansätze und Ursprünge aus.",
        start: () => {
            const url = basePath + "origin-insertion-quiz.html";
            console.log("Attempting to navigate to:", url); // Debug
            window.location.href = url;
        }
    },
    muscleComparison: {
        title: "Muskelvergleich",
        description: "Erkenne den Muskel anhand seiner Eigenschaften",
        start: () => {
            const url = basePath + "muscle-comparison-quiz.html";
            console.log("Attempting to navigate to:", url); // Debug
            window.location.href = url;
        }
    }
};

function startQuiz(quizType) {
    quizTypes[quizType].start();
}
