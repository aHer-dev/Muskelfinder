/**
 * gamification.js — XP- und Level-System
 *
 * Level-Kurve: cumXP(level) = 50 · (level − 1)^1.658
 *   Level  5  ≈     553 XP  (~6 Sitzungen)
 *   Level 10  ≈   1 910 XP  (~20 Sitzungen)
 *   Level 30  ≈  13 200 XP  (~4 Monate)
 *   Level 50  ≈  32 900 XP  (~1 Jahr)
 *   Level 99  ≈ 100 000 XP  (Langzeitziel)
 *
 * XP-Quellen:
 *   Lernkarten  richtig=3, unsicher=2, falsch=1 + Fach-Bonus (F5+1, F6+2, F7+2)
 *   Quiz-Fragen nach Typ (image-match/origin-insertion = 3 XP)
 *   Tagesbonus  10 XP, einmal täglich
 *   Streak-Boni 5/10/20 richtige in Folge → 5/10/20 XP
 */

const Gamification = (() => {
    const STORAGE_KEY = 'muskelfinder_xp_v1';

    // ── Level-Kurve ───────────────────────────────────────────────
    const XP_SCALE    = 50;
    const XP_EXPONENT = 1.658;

    /**
     * Gesamt-XP, die benötigt werden um `level` zu erreichen.
     * Level 1 = 0 XP (Startlevel).
     */
    function xpForLevel(level) {
        if (level <= 1) return 0;
        if (level >= 99) return 99780;
        return Math.round(XP_SCALE * Math.pow(level - 1, XP_EXPONENT));
    }

    function levelFromXP(totalXP) {
        let lo = 1, hi = 99;
        while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2);
            if (xpForLevel(mid) <= totalXP) lo = mid;
            else hi = mid - 1;
        }
        return lo;
    }

    // ── State ─────────────────────────────────────────────────────
    let _state = {
        totalXP:        0,
        lastDailyBonus: null,   // "YYYY-MM-DD"
    };

    function _load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) _state = { ..._state, ...JSON.parse(raw) };
        } catch (e) { /* ignore */ }
    }

    function _save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
    }

    // ── Interne XP-Vergabe ────────────────────────────────────────
    function _addXP(amount, label, icon) {
        if (amount <= 0) return { xpAdded: 0 };
        const levelBefore = levelFromXP(_state.totalXP);
        _state.totalXP   += amount;
        _save();
        const levelAfter = levelFromXP(_state.totalXP);
        const levelUp    = levelAfter > levelBefore;
        _refreshBar();
        _showToast('+' + amount + ' XP' + (label ? '  ' + label : ''), levelUp ? levelAfter : null);
        return { xpAdded: amount, levelBefore, levelAfter, levelUp };
    }

    // ── Public: XP-Vergabe ────────────────────────────────────────

    /**
     * Lernkarte bewertet.
     * @param {'richtig'|'unsicher'|'falsch'} rating
     * @param {number} fach  Leitner-Fach (1–7) VOR der Bewertung
     */
    function awardFlashcard(rating, fach) {
        _load();
        const BASE       = { richtig: 3, unsicher: 2, falsch: 1 };
        const FACH_BONUS = { 5: 1, 6: 2, 7: 2 };
        const base  = BASE[rating]     ?? 1;
        const bonus = FACH_BONUS[fach] ?? 0;
        const icon  = rating === 'richtig' ? '✓' : rating === 'unsicher' ? '~' : '✗';
        return _addXP(base + bonus, icon);
    }

    /**
     * Streak-Bonus bei n aufeinanderfolgenden richtigen Antworten.
     * Sinnvolle Meilensteine: 5, 10, 20
     */
    function awardStreak(count) {
        _load();
        const BONUS = { 5: 5, 10: 10, 20: 20 };
        const bonus = BONUS[count];
        if (!bonus) return { xpAdded: 0 };
        return _addXP(bonus, count + '-er Serie 🔥');
    }

    /**
     * Quiz-Frage richtig beantwortet.
     * @param {'image-match'|'origin-insertion'|'multiple-choice'|'bild'|'freie-antwort'|'klinisch'} type
     * @param {boolean} correct
     */
    const QUIZ_XP = {
        'multiple-choice':  2,
        'image-match':      3,
        'origin-insertion': 3,
        'zuordnung':        3,
        'bild':             4,
        'freie-antwort':    5,
        'klinisch':         7,
    };
    function awardQuizQuestion(type, correct) {
        if (!correct) return { xpAdded: 0 };
        _load();
        return _addXP(QUIZ_XP[type] ?? 2, '📝');
    }

    /**
     * Tagesbonus — genau einmal pro Kalendertag.
     */
    function awardDailyBonus() {
        _load();
        const today = new Date().toISOString().slice(0, 10);
        if (_state.lastDailyBonus === today) return { xpAdded: 0, alreadyClaimed: true };
        _state.lastDailyBonus = today;
        return _addXP(10, 'Tagesbonus ☀️');
    }

    // ── Getter ────────────────────────────────────────────────────
    function getTotalXP() { _load(); return _state.totalXP; }
    function getLevel()   { _load(); return levelFromXP(_state.totalXP); }

    function getState() {
        _load();
        const level       = levelFromXP(_state.totalXP);
        const xpThisLevel = _state.totalXP - xpForLevel(level);
        const xpNeeded    = level < 99 ? xpForLevel(level + 1) - xpForLevel(level) : 1;
        return {
            totalXP: _state.totalXP,
            level,
            xpThisLevel,
            xpNeeded,
            progress: Math.min(1, xpThisLevel / xpNeeded),
        };
    }

    // ── XP-Bar Rendering ──────────────────────────────────────────
    let _barEl = null;

    function renderXPBar(containerId) {
        const el = document.getElementById(containerId);
        if (!el) return;
        _barEl = el;
        _refreshBar();
    }

    function _refreshBar() {
        if (!_barEl) return;
        const { level, xpThisLevel, xpNeeded, progress } = getState();
        _barEl.innerHTML = `
            <div class="xp-widget" role="button" tabindex="0" aria-label="XP anzeigen" style="cursor:pointer">
                <span class="xp-level">Lv&nbsp;${level}</span>
                <div class="xp-track" title="${xpThisLevel} / ${xpNeeded} XP bis Level ${level + 1}">
                    <div class="xp-fill" style="width:${(progress * 100).toFixed(1)}%"></div>
                </div>
            </div>
        `;
        // Klick → XP-Popover anzeigen
        const widget = _barEl.querySelector('.xp-widget');
        if (widget) {
            widget.addEventListener('click', () => _showXPPopover(xpThisLevel, xpNeeded, level));
        }
    }

    // ── XP-Popover (Klick auf Bar) ────────────────────────────────
    let _xpPopoverTimeout = null;

    function _showXPPopover(current, needed, level) {
        let pop = document.getElementById('xp-popover');
        if (!pop) {
            pop = document.createElement('div');
            pop.id = 'xp-popover';
            document.body.appendChild(pop);
        }
        pop.textContent = `${current} / ${needed} XP · Level ${level}`;
        pop.classList.add('xp-popover-visible');
        clearTimeout(_xpPopoverTimeout);
        _xpPopoverTimeout = setTimeout(() => pop.classList.remove('xp-popover-visible'), 2200);
    }

    // ── Toast-Benachrichtigung ────────────────────────────────────
    function _showToast(msg, newLevel) {
        let wrap = document.getElementById('xp-toast-wrap');
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.id = 'xp-toast-wrap';
            document.body.appendChild(wrap);
        }

        if (newLevel != null) {
            const lvlToast = document.createElement('div');
            lvlToast.className = 'xp-toast xp-toast-levelup';
            lvlToast.textContent = '🎉 Level ' + newLevel + ' erreicht!';
            wrap.appendChild(lvlToast);
            setTimeout(() => lvlToast.classList.add('xp-toast-out'), 2500);
            setTimeout(() => lvlToast.remove(), 3100);
        }

        const toast = document.createElement('div');
        toast.className = 'xp-toast';
        toast.textContent = msg;
        wrap.appendChild(toast);
        setTimeout(() => toast.classList.add('xp-toast-out'), 1500);
        setTimeout(() => toast.remove(), 2100);
    }

    _load();

    return {
        awardFlashcard,
        awardQuizQuestion,
        awardDailyBonus,
        awardStreak,
        getTotalXP,
        getLevel,
        getState,
        renderXPBar,
        xpForLevel,
        levelFromXP,
    };
})();
