document.addEventListener("DOMContentLoaded", function () {
    let basePath = window.location.hostname.includes("github.io") ? "/Muskelfinder/" : "..";

    // CSS-Datei korrigieren
    let stylesheet = document.querySelector("link[rel='stylesheet']");
    if (stylesheet) {
        stylesheet.href = basePath + "/assets/css/styles.css";
    }

    // ALLE <script>-Dateien korrigieren
    document.querySelectorAll("script[data-fixpath]").forEach(script => {
        script.src = basePath + script.getAttribute("data-fixpath");
    });
});