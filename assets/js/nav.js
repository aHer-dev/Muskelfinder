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

const BackupManager = (() => {
    const STORAGE_KEYS = {
        flashcards: 'muskelfinder_progress_v1',
        xp: 'muskelfinder_xp_v1',
        quizSeries: 'muskelfinder_quiz_series_v1',
    };

    function isPlainObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function readJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function sanitizeFlashcards(data) {
        if (!isPlainObject(data) || data.version !== 1 || !isPlainObject(data.cards)) {
            throw new Error('Ungültiges Lernkarten-Backup');
        }

        return {
            version: 1,
            cards: data.cards
        };
    }

    function sanitizeXP(data) {
        if (!isPlainObject(data)) {
            return { totalXP: 0, lastDailyBonus: null };
        }

        return {
            totalXP: Number.isFinite(data.totalXP) && data.totalXP >= 0 ? data.totalXP : 0,
            lastDailyBonus: typeof data.lastDailyBonus === 'string' ? data.lastDailyBonus : null,
        };
    }

    function sanitizeQuizSeries(data) {
        return isPlainObject(data) ? data : {};
    }

    function buildBackupPayload() {
        return {
            backupType: 'muskelfinder-backup',
            version: 1,
            exportedAt: new Date().toISOString(),
            flashcards: sanitizeFlashcards(readJSON(STORAGE_KEYS.flashcards, { version: 1, cards: {} })),
            xp: sanitizeXP(readJSON(STORAGE_KEYS.xp, { totalXP: 0, lastDailyBonus: null })),
            quizSeries: sanitizeQuizSeries(readJSON(STORAGE_KEYS.quizSeries, {})),
        };
    }

    function downloadBackup() {
        const data = buildBackupPayload();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `muskelfinder-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importBackup(jsonString) {
        const parsed = JSON.parse(jsonString);

        // Alte reine Lernkarten-Backups weiter unterstützen
        if (isPlainObject(parsed) && parsed.version === 1 && isPlainObject(parsed.cards) && !parsed.backupType) {
            localStorage.setItem(STORAGE_KEYS.flashcards, JSON.stringify(sanitizeFlashcards(parsed)));
            return { type: 'legacy-flashcards' };
        }

        if (!isPlainObject(parsed) || parsed.backupType !== 'muskelfinder-backup') {
            throw new Error('Unbekanntes Backup-Format');
        }

        localStorage.setItem(STORAGE_KEYS.flashcards, JSON.stringify(sanitizeFlashcards(
            isPlainObject(parsed.flashcards) ? parsed.flashcards : { version: 1, cards: {} }
        )));
        localStorage.setItem(STORAGE_KEYS.xp, JSON.stringify(sanitizeXP(parsed.xp)));
        localStorage.setItem(STORAGE_KEYS.quizSeries, JSON.stringify(sanitizeQuizSeries(parsed.quizSeries)));

        return { type: 'full-backup' };
    }

    function resetAllProgress() {
        localStorage.removeItem(STORAGE_KEYS.flashcards);
        localStorage.removeItem(STORAGE_KEYS.xp);
        localStorage.removeItem(STORAGE_KEYS.quizSeries);
    }

    return {
        downloadBackup,
        importBackup,
        resetAllProgress
    };
})();

(function () {
    function getBasePath() {
        const parts = window.location.pathname.split('/').filter(Boolean);
        if (parts.length === 0) return '';

        const first = parts[0];
        if (first.endsWith('.html') || ['quizzes', 'assets', 'data'].includes(first)) {
            return '';
        }

        return `/${first}`;
    }

    function get3DAnatomyUrl() {
        if (window.location.hostname.includes('github.io')) {
            return 'https://aher-dev.github.io/3DAnatomy/';
        }

        return `${window.location.origin}/3DAnatomy/index.html`;
    }

    function getLegalPageUrl(pageName) {
        return `${_root}${pageName}`;
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
                <li><a href="${get3DAnatomyUrl()}" target="_blank" rel="noopener" class="menu-link">🫀 3D Anatomie <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-left:3px"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a></li>
                <li class="menu-divider"></li>
                <li><a href="${_root}index.html"                      class="menu-link">🔍 Suche</a></li>
                <li><a href="${_root}quizzes/flashcards.html"          class="menu-link">🃏 Lernkarten</a></li>
                <li><a href="${_root}quizzes/muscle-selection.html"    class="menu-link">📋 Muskeln verwalten</a></li>
                <li><a href="${_root}quizzes/quiz.html"                class="menu-link">📝 Quiz</a></li>
                <li><a href="${_root}quizzes/stats.html"               class="menu-link">📊 Gesamtstatistik</a></li>
                <li><button id="backup-btn" class="menu-theme-btn">💾 Import / Export</button></li>
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
                <li class="menu-divider"></li>
                <li><a href="${getLegalPageUrl('quellen-lizenzen.html')}" class="menu-link">© Quellen & Lizenzen</a></li>
                <li><a href="${getLegalPageUrl('datenschutz.html')}"      class="menu-link">🛡️ Datenschutz</a></li>
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

        const backupModal = document.createElement('div');
        backupModal.id = 'backup-modal';
        backupModal.innerHTML = `
            <div id="backup-box">
                <button id="backup-close" aria-label="Schließen">✕</button>
                <h2>💾 Import / Export</h2>
                <p class="backup-intro">
                    Dein Lernstand wird automatisch in diesem Browser gespeichert. Zur Sicherheit kannst du hier eine Backup-Datei exportieren und später wieder importieren.
                </p>
                <div class="backup-warning">
                    Der Fortschritt kann verloren gehen, wenn Browserdaten gelöscht werden, du auf ein anderes Gerät oder einen anderen Browser wechselst oder in seltenen Fällen nach Updates bzw. Profilproblemen gespeicherte Websitedaten fehlen.
                </div>
                <div class="backup-section">
                    <strong>Im Export enthalten:</strong>
                    <ul class="backup-list">
                        <li>Lernkarten inkl. Fächer, Wiederholungen, Schwierigkeit und Statistik</li>
                        <li>Quiz-Serienstatistiken</li>
                        <li>XP, Level und Tagesbonus</li>
                    </ul>
                </div>
                <p class="backup-hint">
                    Ein Import überschreibt den aktuell gespeicherten Lernstand auf diesem Gerät.
                </p>
                <div class="backup-actions">
                    <button id="backup-export-btn" class="btn-primary" type="button">↓ Alles exportieren</button>
                    <label class="btn-secondary btn-file-label" for="backup-import-file">↑ Backup importieren</label>
                    <input type="file" id="backup-import-file" accept=".json" hidden>
                </div>
            </div>
        `;
        document.body.appendChild(backupModal);

        function openAnleitung()  { anleitungModal.classList.add('open'); }
        function closeAnleitung() { anleitungModal.classList.remove('open'); }
        function openBackup()     { backupModal.classList.add('open'); }
        function closeBackup() {
            backupModal.classList.remove('open');
            const input = document.getElementById('backup-import-file');
            if (input) input.value = '';
        }

        document.getElementById('anleitung-btn').addEventListener('click', function () {
            closeMenu();
            openAnleitung();
        });
        document.getElementById('backup-btn').addEventListener('click', function () {
            closeMenu();
            openBackup();
        });
        document.getElementById('anleitung-close').addEventListener('click', closeAnleitung);
        document.getElementById('backup-close').addEventListener('click', closeBackup);
        anleitungModal.addEventListener('click', function (e) {
            if (e.target === anleitungModal) closeAnleitung();
        });
        backupModal.addEventListener('click', function (e) {
            if (e.target === backupModal) closeBackup();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeAnleitung();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeBackup();
        });

        document.getElementById('backup-export-btn').addEventListener('click', function () {
            BackupManager.downloadBackup();
        });

        document.getElementById('backup-import-file').addEventListener('change', async function (event) {
            const file = event.target.files[0];
            if (!file) return;

            const confirmed = await AppDialog.confirm('Backup importieren und den aktuellen gespeicherten Lernstand überschreiben?');
            if (!confirmed) {
                event.target.value = '';
                return;
            }

            try {
                const result = BackupManager.importBackup(await file.text());
                closeBackup();
                await AppDialog.alert(
                    result.type === 'legacy-flashcards'
                        ? 'Älteres Lernkarten-Backup geladen. Die Seite wird jetzt neu geladen.'
                        : 'Backup erfolgreich geladen. Die Seite wird jetzt neu geladen.'
                );
                window.location.reload();
            } catch (error) {
                console.error('Backup-Import fehlgeschlagen.', error);
                await AppDialog.alert('Fehler: Die Datei konnte nicht importiert werden.');
                event.target.value = '';
            }
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

        const footer = document.querySelector('footer');
        if (footer && !footer.querySelector('.footer-links')) {
            const links = document.createElement('p');
            links.className = 'footer-links';
            links.innerHTML = `
                <a href="${getLegalPageUrl('quellen-lizenzen.html')}">Quellen & Lizenzen</a>
                <span aria-hidden="true">·</span>
                <a href="${getLegalPageUrl('datenschutz.html')}">Datenschutz</a>
            `;
            footer.appendChild(links);
        }
    });
})();
