document.addEventListener("DOMContentLoaded", function () {
    let isGitHub = window.location.hostname.includes("github.io");
    let basePath = isGitHub ? "/Muskelfinder" : ".."; 

    console.log(`fixPaths.js: Setze Basis-Pfad auf: ${basePath}`);

    // ✅ Stylesheet
    let stylesheet = document.querySelector("link[rel='stylesheet']");
    if (stylesheet) {
        console.log(`Altes CSS: ${stylesheet.href}`);
        stylesheet.href = basePath + "/assets/css/styles.css";
        console.log(`Neues CSS: ${stylesheet.href}`);
    }

    // ✅ JavaScript
    document.querySelectorAll("script[data-fixpath]").forEach(script => {
        console.log(`Altes JS: ${script.src}`);
        script.src = basePath + script.getAttribute("data-fixpath");
        console.log(`Neues JS: ${script.src}`);
    });
});