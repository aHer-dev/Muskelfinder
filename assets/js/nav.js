/**
 * nav.js — Hamburger-Menü + Theme-Toggle + Dialog-Utility
 * Wird in alle HTML-Seiten eingebunden und injiziert sich selbst in den Header.
 */

/**
 * AppDialog.alert(msg) → Promise<void>
 * AppDialog.confirm(msg) → Promise<boolean>
 * Ersetzt native alert() / confirm() mit einem gestylten Modal.
 */
const AppDialog = (() => {
    function _show(msg, buttons) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.id = 'app-dialog-overlay';
            overlay.innerHTML = `
                <div id="app-dialog-box">
                    <p id="app-dialog-msg">${msg}</p>
                    <div id="app-dialog-actions"></div>
                </div>
            `;
            const actions = overlay.querySelector('#app-dialog-actions');
            buttons.forEach(({ label, className, value }) => {
                const btn = document.createElement('button');
                btn.textContent = label;
                btn.className = className;
                btn.addEventListener('click', () => {
                    overlay.remove();
                    resolve(value);
                });
                actions.appendChild(btn);
            });
            document.body.appendChild(overlay);
        });
    }

    function alert(msg) {
        return _show(msg, [{ label: 'OK', className: 'btn-primary', value: undefined }]);
    }

    function confirm(msg) {
        return _show(msg, [
            { label: 'Abbrechen', className: 'btn-secondary', value: false },
            { label: 'Bestätigen', className: 'btn-danger',   value: true  },
        ]);
    }

    return { alert, confirm };
})();
(function () {
    function getBasePath() {
        if (!window.location.hostname.includes('github.io')) return '';
        const parts = window.location.pathname.split('/').filter(Boolean);
        if (parts.length === 0) return '';

        const first = parts[0];
        if (first.endsWith('.html') || ['quizzes', 'assets', 'data'].includes(first)) {
            return '';
        }

        return `/${first}`;
    }

    // Theme sofort anwenden (vor DOMContentLoaded = kein Flash)
    const _saved = localStorage.getItem('muskelfinder_theme') || 'dark';
    if (_saved === 'light') document.documentElement.classList.add('light-mode');

    // Expert-Modus sofort als data-Attribut setzen (für CSS falls nötig)
    const _expertSaved = localStorage.getItem('muskelfinder_expert');
    const _expertOn = _expertSaved === null ? true : _expertSaved === 'true';
    document.documentElement.dataset.expertMode = _expertOn ? 'true' : 'false';

    // Pfade relativ zur aktuellen Seite
    const _inSub = window.location.pathname.includes('/quizzes/');
    const _basePath = getBasePath();
    const _root  = _basePath ? `${_basePath}/` : (_inSub ? '../' : './');

    document.addEventListener('DOMContentLoaded', function () {
        const header = document.querySelector('header');
        if (!header) return;

        // ── H1 → Link zur Startseite ──────────────────────────
        const h1 = header.querySelector('h1');
        if (h1) {
            const a = document.createElement('a');
            a.href = _root + 'index.html?resetSearch=1';
            a.className = 'header-title-link';
            a.setAttribute('aria-label', 'Zur Startseite');
            while (h1.firstChild) a.appendChild(h1.firstChild);
            h1.appendChild(a);
        }

        // ── XP-Bar (nur wenn Gamification geladen) ───────────────
        if (typeof Gamification !== 'undefined') {
            const xpDiv = document.createElement('div');
            xpDiv.id = 'nav-xp-bar';
            header.appendChild(xpDiv);
            Gamification.renderXPBar('nav-xp-bar');
        }

        // ── Hamburger Button ──────────────────────────────────
        const toggle = document.createElement('button');
        toggle.id = 'menu-toggle';
        toggle.className = 'menu-toggle';
        toggle.setAttribute('aria-label', 'Menü');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.innerHTML = '<span></span><span></span><span></span>';
        header.appendChild(toggle);

        // ── Dropdown ──────────────────────────────────────────
        const menu = document.createElement('nav');
        menu.id = 'main-menu';
        menu.className = 'main-menu';
        const isLight = document.documentElement.classList.contains('light-mode');
        const isExpert = document.documentElement.dataset.expertMode !== 'false';
        menu.innerHTML = `
            <ul>
                <li><a href="https://aher-dev.github.io/3DAnatomy/" target="_blank" rel="noopener" class="menu-link">🫀 3D Anatomie <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-left:3px"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a></li>
                <li class="menu-divider"></li>
                <li><a href="${_root}index.html"                      class="menu-link">🔍 Suche</a></li>
                <li><a href="${_root}quizzes/flashcards.html"          class="menu-link">🃏 Lernkarten</a></li>
                <li><a href="${_root}quizzes/muscle-selection.html"    class="menu-link">📋 Muskeln verwalten</a></li>
                <li><a href="${_root}quizzes/quiz.html"                class="menu-link">📝 Quiz</a></li>
                <li class="menu-divider"></li>
                <li>
                    <button id="anleitung-btn" class="menu-theme-btn">❓ Anleitung</button>
                </li>
                <li>
                    <button id="expert-btn" class="menu-theme-btn menu-expert-btn ${isExpert ? 'expert-active' : ''}">
                        ${isExpert ? '🎓 Expert Modus: AN' : '📖 Easy Modus: AN'}
                    </button>
                </li>
                <li>
                    <button id="theme-btn" class="menu-theme-btn">
                        ${isLight ? '🌙 Dark Mode' : '☀️ Light Mode'}
                    </button>
                </li>
            </ul>
        `;
        document.body.appendChild(menu);

        // ── Toggle Logik ──────────────────────────────────────
        let open = false;

        function openMenu()  { open = true;  menu.classList.add('open');    toggle.classList.add('open');    toggle.setAttribute('aria-expanded', 'true');  }
        function closeMenu() { open = false; menu.classList.remove('open'); toggle.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }

        toggle.addEventListener('click', function (e) {
            e.stopPropagation();
            open ? closeMenu() : openMenu();
        });
        document.addEventListener('click', closeMenu);
        menu.addEventListener('click', function (e) { e.stopPropagation(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

        // ── Anleitung Modal ───────────────────────────────────
        const anleitungModal = document.createElement('div');
        anleitungModal.id = 'anleitung-modal';
        anleitungModal.innerHTML = `
            <div id="anleitung-box">
                <button id="anleitung-close" aria-label="Schließen">✕</button>
                <h2>📚 So lernst du mit dem Muskelfinder</h2>

                <div class="anleitung-step">
                    <div class="anleitung-icon">1</div>
                    <div>
                        <strong>Muskeln auswählen</strong>
                        <p>Gehe zu <em>Muskeln verwalten</em> und wähle die Regionen und Subgruppen aus, die du lernen möchtest – z.B. nur Schulter oder die gesamte obere Extremität.</p>
                    </div>
                </div>

                <div class="anleitung-step">
                    <div class="anleitung-icon">2</div>
                    <div>
                        <strong>Lernkarten durchgehen</strong>
                        <p>Unter <em>Lernkarten</em> siehst du alle ausgewählten Muskeln als Karteikarten. Tippe auf eine Karte, um Ursprung, Ansatz, Funktion und Innervation zu sehen.</p>
                    </div>
                </div>

                <div class="anleitung-step">
                    <div class="anleitung-icon">3</div>
                    <div>
                        <strong>Easy → Expert Modus</strong>
                        <p>Starte mit dem <em>Easy Modus</em> (vereinfachte Beschreibungen) und wechsle im Menü zum <em>Expert Modus</em>, wenn du die genaue anatomische Terminologie lernen willst.</p>
                    </div>
                </div>

                <div class="anleitung-step">
                    <div class="anleitung-icon">4</div>
                    <div>
                        <strong>Quiz machen</strong>
                        <p>Teste dein Wissen im <em>Quiz</em>: Ursprung/Ansatz zuordnen, Bewegungen erkennen oder Muskeln anhand von Beschreibungen identifizieren.</p>
                    </div>
                </div>

                <div class="anleitung-step">
                    <div class="anleitung-icon">5</div>
                    <div>
                        <strong>Suche & Filter nutzen</strong>
                        <p>Auf der Startseite kannst du nach Muskelname suchen oder nach Region, Gelenk, Bewegung und Innervation filtern – praktisch zum Nachschlagen.</p>
                    </div>
                </div>

                <div class="anleitung-step">
                    <div class="anleitung-icon">💡</div>
                    <div>
                        <strong>Tipp</strong>
                        <p>Lerne zuerst eine kleine Gruppe (z.B. Schulter), bis du sie sicher beherrschst – dann erweitere schrittweise auf weitere Regionen.</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(anleitungModal);

        function openAnleitung()  { anleitungModal.classList.add('open'); }
        function closeAnleitung() { anleitungModal.classList.remove('open'); }

        document.getElementById('anleitung-btn').addEventListener('click', function () {
            closeMenu();
            openAnleitung();
        });
        document.getElementById('anleitung-close').addEventListener('click', closeAnleitung);
        anleitungModal.addEventListener('click', function (e) {
            if (e.target === anleitungModal) closeAnleitung();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeAnleitung();
        });

        // ── Expert-Modus Toggle ───────────────────────────────
        document.getElementById('expert-btn').addEventListener('click', function () {
            const nowExpert = document.documentElement.dataset.expertMode !== 'true';
            document.documentElement.dataset.expertMode = nowExpert ? 'true' : 'false';
            localStorage.setItem('muskelfinder_expert', nowExpert);
            this.textContent = nowExpert ? '🎓 Expert Modus: AN' : '📖 Easy Modus: AN';
            this.classList.toggle('expert-active', nowExpert);
            // Details-Seite neu rendern falls vorhanden
            if (typeof rerenderMuscleDetails === 'function') rerenderMuscleDetails();
        });

        // ── Theme Toggle ──────────────────────────────────────
        document.getElementById('theme-btn').addEventListener('click', function () {
            const nowLight = document.documentElement.classList.toggle('light-mode');
            localStorage.setItem('muskelfinder_theme', nowLight ? 'light' : 'dark');
            this.textContent = nowLight ? '🌙 Dark Mode' : '☀️ Light Mode';
        });
    });
})();
