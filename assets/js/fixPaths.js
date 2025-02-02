document.addEventListener("DOMContentLoaded", function () {
    // Prüfe, ob die Seite auf GitHub Pages läuft
    let isGitHub = window.location.hostname.includes("github.io");
    
    // Setze den Basis-Pfad je nach Umgebung
    let basePath = isGitHub ? "/Muskelfinder" : "..";

    // ✅ 1. Stylesheet-Pfad korrigieren
    let stylesheet = document.querySelector("link[rel='stylesheet']");
    if (stylesheet) {
        stylesheet.href = basePath + "/assets/css/styles.css";
    }

    // ✅ 2. Alle <script>-Dateien mit `data-fixpath` korrigieren
    document.querySelectorAll("script[data-fixpath]").forEach(script => {
        script.src = basePath + script.getAttribute("data-fixpath");
    });

    console.log(`fixPaths.js: Pfade gesetzt für ${window.location.hostname}`);
});