/* ──────────────────────────────────────────────────────────────────────────
   fridge.js — "fridge mode": the home view becomes a door and its pieces
   (business card, tech ticker, featured cards) become draggable magnets.

   The arrangement is shared. The source of truth is static/fridge.json in
   this repo. Visitors' moves are published as tiny JSON messages to a public
   ntfy.sh topic (no account, no key); every visitor reads the committed file
   plus the topic's recent messages, and .github/workflows/fridge-sync.yml
   folds those messages back into fridge.json on a schedule, so the git
   history is the fridge's history. See README "Fridge mode".

   Positions are the magnet's top-centre anchor as fractions (0..1) of the
   door's width and height, so one layout maps onto any viewport.
   ────────────────────────────────────────────────────────────────────────── */
(() => {
    'use strict';

    const root = document.documentElement;
    const door = document.getElementById('fridge-door');
    const toggle = document.getElementById('fridge-toggle');
    const bio = document.getElementById('bio');
    if (!door || !toggle || !bio) return;

    const NTFY = 'https://ntfy.sh';
    const IDS = ['card', 'ticker', 'featured-0', 'featured-1', 'featured-2'];
    const DEFAULTS = {
        'card': { x: 0.5, y: 0.04 },
        'ticker': { x: 0.5, y: 0.46 },
        'featured-0': { x: 0.5, y: 0.58 },
        'featured-1': { x: 0.25, y: 0.8 },
        'featured-2': { x: 0.75, y: 0.8 },
    };
    const mqRM = matchMedia('(prefers-reduced-motion: reduce)');
    const store = {
        get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
        del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
    };
    const toast = (text, opts) => { if (window.siteToast) window.siteToast(text, opts); };
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const round = v => Math.round(v * 1000) / 1000;

    // ── Shared validation (mirrored in scripts/fridge-sync.mjs; keep in sync) ──
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
            if (!move || !IDS.includes(move.id) || !validPos(move)) return;
            const t = +msg.time || 0;
            if (t < (minTime || 0)) return;
            if (seen[move.id] && seen[move.id] > t) return;
            seen[move.id] = t;
            magnets[move.id] = { x: round(+move.x), y: round(+move.y) };
        });
    }

    // ── State ──
    let layout = null;                       // { topic, updated, aspect, magnets }
    let wanted = store.get('fridge') === '1'; // this visitor turned the mode on
    let onHome = (location.hash.replace('#', '') || 'bio') === 'bio';
    let active = false;
    let zTop = 1;

    // ── Load: committed layout, then recent moves from the topic ──
    const ready = fetch('static/fridge.json')
        .then(r => r.json())
        .then(async data => {
            layout = {
                topic: typeof data.topic === 'string' && data.topic !== 'PLACEHOLDER' ? data.topic.trim() : '',
                updated: Math.max(0, Math.floor(+data.updated || 0)),
                aspect: +(data.door && data.door.aspect) || 1.3,
                magnets: {},
            };
            IDS.forEach(id => {
                const m = data.magnets && data.magnets[id];
                layout.magnets[id] = validPos(m) ? { x: round(+m.x), y: round(+m.y) } : { ...DEFAULTS[id] };
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
            layout = { topic: '', updated: 0, aspect: 1.3, magnets: {} };
            IDS.forEach(id => { layout.magnets[id] = { ...DEFAULTS[id] }; });
        });

    // ── Magnets ↔ elements ──
    function magnetEls() {
        const out = { card: document.getElementById('business-card'), ticker: document.querySelector('.ticker') };
        document.querySelectorAll('.featured-grid .featured-card').forEach((el, i) => { if (i < 3) out['featured-' + i] = el; });
        return out;
    }
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
        const dr = door.getBoundingClientRect();
        if (!dr.width || !dr.height) return { x, y };
        const hw = el.offsetWidth / 2 / dr.width, hh = el.offsetHeight / dr.height;
        return { x: clamp(x, hw, Math.max(hw, 1 - hw)), y: clamp(y, 0, Math.max(0, 1 - hh)) };
    }
    function applyPositions(glideFrom) {
        const els = magnetEls();
        IDS.forEach(id => {
            const el = els[id];
            if (!el) return;
            const isNew = !el.classList.contains('magnet');
            el.classList.add('magnet');
            el.dataset.magnet = id;
            el.style.setProperty('--tilt', tiltFor(id));
            el.setAttribute('aria-roledescription', 'draggable magnet');
            if (el.tagName !== 'A') el.tabIndex = 0;
            if (isNew && glideFrom && !mqRM.matches) {
                // start at the "normal layout" spot, then glide to the shared one
                setPos(el, glideFrom[id].x, glideFrom[id].y);
                void el.offsetWidth;
            }
            const p = clampTo(el, layout.magnets[id].x, layout.magnets[id].y);
            setPos(el, p.x, p.y);
        });
    }

    function enter() {
        if (active || !layout) return;
        active = true;
        root.classList.add('fridge-on');
        door.style.setProperty('--door-aspect', String(layout.aspect));
        const grid = bio.querySelector('.featured-grid');
        if (grid) door.append(grid);
        applyPositions(DEFAULTS);
    }
    function exit() {
        if (!active) return;
        active = false;
        root.classList.remove('fridge-on');
        const magnets = [...document.querySelectorAll('.magnet')];
        const grid = door.querySelector('.featured-grid');
        if (grid) bio.prepend(grid);
        magnets.forEach(el => {
            el.classList.remove('magnet', 'is-dragging');
            el.removeAttribute('aria-roledescription');
            if (el.tagName !== 'A') el.removeAttribute('tabindex');
        });
    }
    function sync() {
        toggle.setAttribute('aria-pressed', String(wanted));
        if (wanted && onHome && layout) enter(); else exit();
    }

    toggle.addEventListener('click', () => {
        wanted = !wanted;
        if (wanted) store.set('fridge', '1'); else store.del('fridge');
        if (wanted && !onHome) {
            const home = document.querySelector('.nav-link[href="#bio"]');
            if (home) home.click(); // showSection('bio') → site:section → sync()
        }
        sync();
    });
    document.addEventListener('site:section', e => {
        onHome = !!e.detail && e.detail.id === 'bio';
        sync();
    });
    document.addEventListener('site:rendered', e => {
        if (e.detail && e.detail.part === 'featured' && active) {
            const grid = bio.querySelector('.featured-grid');
            if (grid) door.append(grid);
            applyPositions(null);
        }
    });
    ready.then(sync);
    let resizeT = 0;
    addEventListener('resize', () => {
        clearTimeout(resizeT);
        resizeT = setTimeout(() => { if (active) applyPositions(null); }, 150);
    });

    // ── Drag (Pointer Events; touch too) ──
    let drag = null;
    door.addEventListener('pointerdown', e => {
        if (!active || drag) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const m = e.target.closest && e.target.closest('.magnet');
        if (!m || !door.contains(m)) return;
        const control = e.target.closest('a, button, input, textarea, select');
        if (control && control !== m) return; // links and buttons *inside* a magnet still work
        e.preventDefault();
        const dr = door.getBoundingClientRect();
        const mr = m.getBoundingClientRect();
        drag = {
            el: m, id: m.dataset.magnet, pid: e.pointerId, dr,
            offX: e.clientX - (mr.left + mr.width / 2), offY: e.clientY - mr.top,
            hw: mr.width / 2 / dr.width, hh: mr.height / dr.height,
            sx: e.clientX, sy: e.clientY, moved: false, x: null, y: null,
        };
        try { m.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        m.classList.add('is-dragging');
        m.style.setProperty('--mz', String(++zTop));
    });
    door.addEventListener('pointermove', e => {
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
        try { d.el.releasePointerCapture(d.pid); } catch (err) { /* ignore */ }
        if (!d.moved) return;
        // A drag that ends on a link magnet would otherwise count as a click on it
        d.el.dataset.dragged = '1';
        setTimeout(() => { delete d.el.dataset.dragged; }, 350);
        if (d.x !== null) commit(d.id, d.x, d.y);
    }
    door.addEventListener('pointerup', endDrag);
    door.addEventListener('pointercancel', endDrag);
    door.addEventListener('click', e => {
        const m = e.target.closest && e.target.closest('.magnet');
        if (m && m.dataset.dragged) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    door.addEventListener('dragstart', e => { if (active) e.preventDefault(); }); // no native link/image drag

    // ── Keyboard: arrows nudge a focused magnet (2 %, shift = 10 %) ──
    door.addEventListener('keydown', e => {
        if (!active) return;
        const m = e.target && e.target.classList && e.target.classList.contains('magnet') ? e.target : null;
        if (!m) return;
        const step = e.shiftKey ? 0.1 : 0.02;
        let dx = 0, dy = 0;
        if (e.key === 'ArrowLeft') dx = -step;
        else if (e.key === 'ArrowRight') dx = step;
        else if (e.key === 'ArrowUp') dy = -step;
        else if (e.key === 'ArrowDown') dy = step;
        else return;
        e.preventDefault();
        const id = m.dataset.magnet;
        const cur = getPos(m);
        const p = clampTo(m, cur.x + dx, cur.y + dy);
        setPos(m, p.x, p.y);
        commit(id, p.x, p.y);
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
