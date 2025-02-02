document.addEventListener("DOMContentLoaded", function () {
    // Prüft, ob die Seite auf GitHub Pages oder Localhost läuft
    let isGitHub = window.location.hostname.includes("github.io");
    let basePath = isGitHub ? "/Muskelfinder" : ".."; 

    console.log(`fixPaths.js: Setze Basis-Pfad auf: ${basePath}`);

    // ✅ Stylesheet-Pfad automatisch korrigieren
    let stylesheet = document.querySelector("link[rel='stylesheet']");
    if (stylesheet) {
        stylesheet.href = basePath + "/assets/css/styles.css";
    }

    // ✅ ALLE Skripte mit `data-fixpath` korrigieren
    document.querySelectorAll("script[data-fixpath]").forEach(script => {
        script.src = basePath + script.getAttribute("data-fixpath");
    });
});
