/* ──────────────────────────────────────────────────────────────────────────
   fridge.js — "fridge mode": every tab becomes a door and its pieces become
   draggable magnets (Home: card, ticker, featured cards; Projects: title,
   intro, project cards, "More on GitHub"; Timeline: title and each entry;
   CV: toolbar and the viewer).

   The arrangement is shared. The source of truth is static/fridge.json in
   this repo. Visitors' moves are published as tiny JSON messages to a public
   ntfy.sh topic (no account, no key); every visitor reads the committed file
   plus the topic's recent messages, and .github/workflows/fridge-sync.yml
   folds those messages back into fridge.json on a schedule, so the git
   history is the fridge's history. See README "Fridge mode".

   Positions are the magnet's top-centre anchor as fractions (0..1) of the
   door's width and height, so one layout maps onto any viewport. A magnet
   nobody has moved yet starts where the normal layout puts it.
   ────────────────────────────────────────────────────────────────────────── */
(() => {
    'use strict';

    const root = document.documentElement;
    const toggle = document.getElementById('fridge-toggle');
    const heroDoor = document.getElementById('fridge-door');
    const bio = document.getElementById('bio');
    if (!toggle || !heroDoor || !bio) return;

    const NTFY = 'https://ntfy.sh';
    const TABS = ['bio', 'projects', 'timeline', 'cv'];
    // Mirrored in scripts/fridge-sync.mjs; keep in sync.
    const ID_RE = /^(card|ticker|featured-[0-9]|projects-title|projects-intro|spotlight-[0-9]|projects-more|timeline-title|timeline-[0-9]{1,2}|cv-bar|cv-viewer|cv-mobile)$/;
    const mqRM = matchMedia('(prefers-reduced-motion: reduce)');
    const store = {
        get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
        del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
    };
    const toast = (text, opts) => { if (window.siteToast) window.siteToast(text, opts); };
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const round = v => Math.round(v * 1000) / 1000;

    // ── Shared validation ──
    function validPos(m) {
        return !!m && Number.isFinite(+m.x) && Number.isFinite(+m.y) && +m.x >= 0 && +m.x <= 1 && +m.y >= 0 && +m.y <= 1;
    }
    // Folds an ntfy poll body (one JSON object per line) into `magnets`. Last message per id wins,
    // ordered by the server's `time`; anything older than `minTime` (fridge.json's `updated`) is
    // ignored, which is what makes a hand-edited `updated` act as a reset.
    function foldMessages(magnets, text, minTime) {
        const seen = {};
        String(text).split('\n').forEach(line => {
            let msg, move;
            try { msg = JSON.parse(line); } catch (e) { return; }
            if (!msg || msg.event !== 'message' || typeof msg.message !== 'string') return;
            try { move = JSON.parse(msg.message); } catch (e) { return; }
            if (!move || typeof move.id !== 'string' || !ID_RE.test(move.id) || !validPos(move)) return;
            const t = +msg.time || 0;
            if (t < (minTime || 0)) return;
            if (seen[move.id] && seen[move.id] > t) return;
            seen[move.id] = t;
            magnets[move.id] = { x: round(+move.x), y: round(+move.y) };
        });
    }

    // ── State ──
    let layout = null;                        // { topic, updated, magnets }
    let wanted = store.get('fridge') === '1';  // this visitor turned the mode on
    let tab = location.hash.replace('#', '') || 'bio';
    if (!TABS.includes(tab)) tab = 'bio';
    let liveTab = null, liveDoor = null, liveMagnets = [];
    let zTop = 1;

    // ── Load: committed layout, then recent moves from the topic ──
    const ready = fetch('static/fridge.json')
        .then(r => r.json())
        .then(async data => {
            layout = {
                topic: typeof data.topic === 'string' && data.topic !== 'PLACEHOLDER' ? data.topic.trim() : '',
                updated: Math.max(0, Math.floor(+data.updated || 0)),
                magnets: {},
            };
            Object.keys(data.magnets || {}).forEach(id => {
                const m = data.magnets[id];
                if (ID_RE.test(id) && validPos(m)) layout.magnets[id] = { x: round(+m.x), y: round(+m.y) };
            });
            if (!layout.topic) return;
            try {
                const ctl = new AbortController();
                const timer = setTimeout(() => ctl.abort(), 3000);
                const since = layout.updated > 0 ? String(layout.updated) : 'all';
                const res = await fetch(`${NTFY}/${encodeURIComponent(layout.topic)}/json?poll=1&since=${since}`, { signal: ctl.signal });
                clearTimeout(timer);
                if (res.ok) foldMessages(layout.magnets, await res.text(), layout.updated);
            } catch (e) { /* offline, blocked, or slow: the committed layout is still correct */ }
        })
        .catch(err => {
            console.error('Error loading fridge layout:', err);
            layout = { topic: '', updated: 0, magnets: {} };
        });

    // ── Which elements are magnets on each tab, in document order ──
    function pick(id, sel, all) {
        const out = [];
        if (all) document.querySelectorAll(sel).forEach((el, i) => { if (i < 10 || id === 'timeline') out.push({ id: `${id}-${i}`, el }); });
        else { const el = document.querySelector(sel); if (el) out.push({ id, el }); }
        return out;
    }
    function collect(t) {
        let items = [];
        if (t === 'bio') items = [...pick('card', '#business-card'), ...pick('ticker', '.ticker'), ...pick('featured', '.featured-grid .featured-card', true)];
        else if (t === 'projects') items = [...pick('projects-title', '#projects .section-title'), ...pick('projects-intro', '.projects-intro'), ...pick('spotlight', '.spotlight-card', true), ...pick('projects-more', '.projects-more')];
        else if (t === 'timeline') items = [...pick('timeline-title', '#timeline .section-title'), ...pick('timeline', '.timeline-item', true)];
        else if (t === 'cv') items = [...pick('cv-bar', '.cv-page-bar'), ...pick('cv-viewer', '.cv-pdf-viewer'), ...pick('cv-mobile', '.cv-mobile-card')];
        // only things that are actually laid out on this viewport (e.g. the CV mobile card is phone-only)
        return items.filter(({ id, el }) => ID_RE.test(id) && el.getBoundingClientRect().width > 0);
    }
    function doorFor(t) {
        if (t === 'bio') return heroDoor;
        const section = document.getElementById(t);
        return section && section.querySelector(':scope > .door');
    }

    // ── Positioning helpers ──
    // A small, stable tilt per magnet (−2.5…2.5°) so the door reads as hand-placed
    function tiltFor(id) {
        let h = 0;
        for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
        return ((h % 500) / 100 - 2.5).toFixed(2) + 'deg';
    }
    function setPos(el, x, y) {
        el.style.setProperty('--mx', x.toFixed(4));
        el.style.setProperty('--my', y.toFixed(4));
    }
    function getPos(el) {
        return { x: +el.style.getPropertyValue('--mx') || 0, y: +el.style.getPropertyValue('--my') || 0 };
    }
    // Keep a magnet inside the door for *this* viewport (shared positions may come from a wider screen)
    function clampTo(el, x, y) {
        if (!liveDoor) return { x, y };
        const dr = liveDoor.getBoundingClientRect();
        if (!dr.width || !dr.height) return { x, y };
        const hw = el.offsetWidth / 2 / dr.width, hh = el.offsetHeight / dr.height;
        return { x: clamp(x, hw, Math.max(hw, 1 - hw)), y: clamp(y, 0, Math.max(0, 1 - hh)) };
    }

    // ── Enter / leave a tab's door ──
    function activate(t) {
        const door = doorFor(t);
        if (!door || !layout) return;
        const items = collect(t);
        // Natural positions (page coordinates) from the normal layout, measured before anything moves
        const natural = items.map(({ el }) => { const r = el.getBoundingClientRect(); return { cx: r.left + r.width / 2 + scrollX, top: r.top + scrollY }; });

        if (t === 'bio') { const grid = bio.querySelector('.featured-grid'); if (grid) door.append(grid); }
        const narrow = innerWidth <= 640;
        door.style.setProperty('--door-min', `${Math.max(760, items.length * (narrow ? 230 : 120))}px`);
        door.classList.add('is-live');
        root.classList.add('fridge-on');
        liveTab = t; liveDoor = door; liveMagnets = items.map(i => i.el);

        const dr = door.getBoundingClientRect();
        const doorLeft = dr.left + scrollX, doorTop = dr.top + scrollY;
        items.forEach(({ id, el }, i) => {
            el.classList.add('magnet');
            el.dataset.magnet = id;
            el.style.setProperty('--tilt', tiltFor(id));
            el.setAttribute('aria-roledescription', 'draggable magnet');
            if (el.tagName !== 'A') el.tabIndex = 0;
            const start = clampTo(el, (natural[i].cx - doorLeft) / dr.width, (natural[i].top - doorTop) / dr.height);
            setPos(el, start.x, start.y);
            const stored = layout.magnets[id];
            if (!stored) return;
            if (!mqRM.matches) void el.offsetWidth; // paint the natural spot first, then glide to the shared one
            const p = clampTo(el, stored.x, stored.y);
            setPos(el, p.x, p.y);
        });
    }
    function deactivate() {
        if (!liveDoor) return;
        liveMagnets.forEach(el => {
            el.classList.remove('magnet', 'is-dragging');
            el.removeAttribute('aria-roledescription');
            el.removeAttribute('data-magnet');
            if (el.tagName !== 'A') el.removeAttribute('tabindex');
        });
        if (liveTab === 'bio') { const grid = liveDoor.querySelector('.featured-grid'); if (grid) bio.prepend(grid); }
        liveDoor.classList.remove('is-live');
        root.classList.remove('fridge-on');
        liveTab = null; liveDoor = null; liveMagnets = [];
    }
    function sync() {
        toggle.setAttribute('aria-pressed', String(wanted));
        if (!wanted || !layout) { deactivate(); return; }
        if (liveTab !== tab) { deactivate(); activate(tab); }
    }
    function refresh() { if (liveDoor) { const t = liveTab; deactivate(); activate(t); } }

    toggle.addEventListener('click', () => {
        wanted = !wanted;
        if (wanted) store.set('fridge', '1'); else store.del('fridge');
        sync();
    });
    document.addEventListener('site:section', e => {
        if (e.detail && TABS.includes(e.detail.id)) tab = e.detail.id;
        sync();
    });
    const PART_TAB = { card: 'bio', featured: 'bio', projects: 'projects', timeline: 'timeline' };
    document.addEventListener('site:rendered', e => {
        const t = e.detail && PART_TAB[e.detail.part];
        if (t && t === liveTab && e.detail.part !== 'card') refresh();
    });
    ready.then(sync);
    let resizeT = 0;
    addEventListener('resize', () => {
        clearTimeout(resizeT);
        resizeT = setTimeout(() => liveMagnets.forEach(el => { const c = getPos(el); const p = clampTo(el, c.x, c.y); setPos(el, p.x, p.y); }), 150);
    });

    // ── Drag (Pointer Events; touch too). The gold disc on top is a handle, useful on the PDF viewer. ──
    let drag = null;
    document.addEventListener('pointerdown', e => {
        if (!liveDoor || drag) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const m = e.target.closest && e.target.closest('.magnet');
        if (!m || !liveDoor.contains(m)) return;
        const control = e.target.closest('a, button, input, textarea, select');
        if (control && control !== m) return; // links and buttons *inside* a magnet still work
        e.preventDefault();
        const dr = liveDoor.getBoundingClientRect();
        const mr = m.getBoundingClientRect();
        drag = {
            el: m, id: m.dataset.magnet, pid: e.pointerId, dr,
            offX: e.clientX - (mr.left + mr.width / 2), offY: e.clientY - mr.top,
            hw: mr.width / 2 / dr.width, hh: mr.height / dr.height,
            sx: e.clientX, sy: e.clientY, moved: false, x: null, y: null,
        };
        try { m.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        m.classList.add('is-dragging');
        root.classList.add('fridge-dragging');
        m.style.setProperty('--mz', String(++zTop));
    });
    document.addEventListener('pointermove', e => {
        if (!drag || e.pointerId !== drag.pid) return;
        const d = drag;
        if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 4) d.moved = true;
        if (!d.moved) return;
        d.x = clamp((e.clientX - d.offX - d.dr.left) / d.dr.width, d.hw, Math.max(d.hw, 1 - d.hw));
        d.y = clamp((e.clientY - d.offY - d.dr.top) / d.dr.height, 0, Math.max(0, 1 - d.hh));
        setPos(d.el, d.x, d.y);
    });
    function endDrag(e) {
        if (!drag || e.pointerId !== drag.pid) return;
        const d = drag;
        drag = null;
        d.el.classList.remove('is-dragging');
        root.classList.remove('fridge-dragging');
        try { d.el.releasePointerCapture(d.pid); } catch (err) { /* ignore */ }
        if (!d.moved) return;
        // A drag that ends on a link magnet would otherwise count as a click on it
        d.el.dataset.dragged = '1';
        setTimeout(() => { delete d.el.dataset.dragged; }, 350);
        if (d.x !== null) commit(d.id, d.x, d.y);
    }
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', endDrag);
    document.addEventListener('click', e => {
        const m = e.target.closest && e.target.closest('.magnet');
        if (m && m.dataset.dragged) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    document.addEventListener('dragstart', e => { if (liveDoor) e.preventDefault(); }); // no native link/image drag

    // ── Keyboard: arrows nudge a focused magnet (2 %, shift = 10 %) ──
    document.addEventListener('keydown', e => {
        if (!liveDoor) return;
        const m = e.target && e.target.classList && e.target.classList.contains('magnet') ? e.target : null;
        if (!m || !m.dataset.magnet) return;
        const step = e.shiftKey ? 0.1 : 0.02;
        let dx = 0, dy = 0;
        if (e.key === 'ArrowLeft') dx = -step;
        else if (e.key === 'ArrowRight') dx = step;
        else if (e.key === 'ArrowUp') dy = -step;
        else if (e.key === 'ArrowDown') dy = step;
        else return;
        e.preventDefault();
        const cur = getPos(m);
        const p = clampTo(m, cur.x + dx, cur.y + dy);
        setPos(m, p.x, p.y);
        commit(m.dataset.magnet, p.x, p.y);
    });

    // ── Publish: one tiny message per settled move ──
    const timers = {};
    const inflight = {};
    const again = {};
    let firstSaved = false;

    function commit(id, x, y) {
        layout.magnets[id] = { x: round(x), y: round(y) };
        clearTimeout(timers[id]);
        timers[id] = setTimeout(() => publish(id), 400);
    }
    function body(id) {
        return JSON.stringify({ id, x: layout.magnets[id].x, y: layout.magnets[id].y });
    }
    async function publish(id) {
        delete timers[id];
        if (!layout.topic) return;
        if (inflight[id]) { again[id] = true; return; }
        inflight[id] = true;
        try {
            // text/plain body, no custom headers: a "simple" request, so no CORS preflight
            const res = await fetch(`${NTFY}/${encodeURIComponent(layout.topic)}`, { method: 'POST', body: body(id) });
            if (res.status === 429) toast('The fridge is full for today — try again tomorrow.', { ms: 6000 });
            else if (!res.ok) toast("Couldn't save that move.", { ms: 4000 });
            else if (!firstSaved) { firstSaved = true; toast('Saved — the next visitor will see it there.', { ms: 4000 }); }
        } catch (e) {
            toast("Couldn't save that move.", { ms: 4000 });
        } finally {
            inflight[id] = false;
            if (again[id]) { again[id] = false; publish(id); }
        }
    }
    // A move that was still waiting on its debounce when the page is left goes out as a beacon
    addEventListener('pagehide', () => {
        if (!layout || !layout.topic || !navigator.sendBeacon) return;
        Object.keys(timers).forEach(id => {
            clearTimeout(timers[id]);
            delete timers[id];
            navigator.sendBeacon(`${NTFY}/${encodeURIComponent(layout.topic)}`, body(id));
        });
    });
})();
