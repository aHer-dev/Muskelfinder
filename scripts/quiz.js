const quizTypes = {
     imageMatch: {
     title:"Bildzuordnung",
     description:"Ordne die Bilder den richtigen Muskeln zu.",
     start: () => {
        window.location.href = "image-match-quiz.html";
    } 
},

originInsertion: {
    title: "Ursprung & Ansatz",
    description: "Wähle die richtigen Ansätze und Ursprünge aus.",
    start: => {
        window.location.href = "origin-insertion-quiz.html"
    }
}
}