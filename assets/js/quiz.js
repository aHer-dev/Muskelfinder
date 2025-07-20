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