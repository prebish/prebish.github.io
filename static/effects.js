/* ──────────────────────────────────────────────────────────────────────────
   effects.js — theme toggle (CRT), custom cursor + magnetic buttons,
   word-split and scroll reveals, tech ticker, toast, first-visit intro.

   Vanilla, no dependencies. Runs synchronously at the end of <body>, before
   style.js's DOMContentLoaded handler, and only talks to style.js through two
   events on document:
     site:section  { id, animate }   — a tab was shown (already display:block)
     site:rendered { part }          — 'card' | 'featured' | 'projects' | 'timeline'
   Everything degrades under prefers-reduced-motion and on coarse pointers.
   ────────────────────────────────────────────────────────────────────────── */
(() => {
    'use strict';

    const root = document.documentElement;
    const mqRM = matchMedia('(prefers-reduced-motion: reduce)');
    const mqFine = matchMedia('(pointer: fine) and (hover: hover)');
    const isCRT = () => root.dataset.theme === 'crt';
    const fxAllowed = () => mqFine.matches && !mqRM.matches && !isCRT();
    const onChange = (mq, fn) => { if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn); };
    const themeListeners = new Set();

    const store = {
        get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
        del(k) { try { localStorage.removeItem(k); } catch (e) { /* storage unavailable */ } },
    };

    /* ── Toast ─────────────────────────────────────────────────────────────── */
    const toast = document.getElementById('toast');
    const toastText = toast && toast.querySelector('.toast-text');
    const toastBtn = toast && toast.querySelector('.toast-btn');
    let toastTimer = 0;
    let toastAction = null;

    function hideToast() {
        if (!toast) return;
        clearTimeout(toastTimer);
        toast.classList.remove('is-in');
        toastTimer = setTimeout(() => { toast.hidden = true; }, 300);
    }

    // showToast('text', { button: 'Copy', onButton() {}, ms: 5000 })
    function showToast(text, { button = '', onButton = null, ms = 5000 } = {}) {
        if (!toast) return;
        clearTimeout(toastTimer);
        toastText.textContent = text;
        toastAction = onButton;
        toastBtn.hidden = !button;
        if (button) toastBtn.textContent = button;
        toast.hidden = false;
        void toast.offsetWidth; // restart the slide-in
        toast.classList.add('is-in');
        toastTimer = setTimeout(hideToast, ms);
    }
    window.siteToast = showToast;

    if (toast) {
        toastBtn.addEventListener('click', () => { if (toastAction) toastAction(); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && !toast.hidden) hideToast(); });

        // mailto links: offer the address with a Copy button (the mail client still opens)
        document.addEventListener('click', e => {
            const a = e.target.closest && e.target.closest('a[href^="mailto:"]');
            if (!a) return;
            let addr = a.getAttribute('href').slice(7).split('?')[0];
            try { addr = decodeURIComponent(addr); } catch (err) { /* keep raw */ }
            if (!addr) return;
            setTimeout(() => showToast(addr, {
                button: 'Copy',
                ms: 7000,
                onButton: () => {
                    const clip = navigator.clipboard;
                    if (!clip) { showToast('Copy not available here', { ms: 1800 }); return; }
                    clip.writeText(addr)
                        .then(() => showToast('Copied', { ms: 1800 }))
                        .catch(() => showToast('Copy failed', { ms: 1800 }));
                },
            }), 400);
        });
    }

    /* ── Theme (default ↔ CRT) with a circular View Transition wipe ───────── */
    const themeBtn = document.getElementById('theme-toggle');
    const themeMeta = document.querySelector('meta[name="theme-color"]');

    function applyTheme(next, notify = true) {
        if (next === 'crt') { root.dataset.theme = 'crt'; store.set('theme', 'crt'); }
        else { delete root.dataset.theme; store.del('theme'); }
        if (themeBtn) themeBtn.setAttribute('aria-pressed', String(next === 'crt'));
        if (themeMeta) themeMeta.content = next === 'crt' ? '#050403' : '#0d0d0f';
        if (notify) themeListeners.forEach(fn => { try { fn(next); } catch (err) { console.error(err); } });
    }
    applyTheme(isCRT() ? 'crt' : 'default', false); // sync the button with the pre-paint script

    let switching = false;
    if (themeBtn) {
        themeBtn.addEventListener('click', async () => {
            if (switching) return;
            const next = isCRT() ? 'default' : 'crt';
            if (!document.startViewTransition || mqRM.matches) { applyTheme(next); return; }
            // Wipe origin = the button's centre (works for keyboard activation too)
            const r = themeBtn.getBoundingClientRect();
            const x = r.left + r.width / 2, y = r.top + r.height / 2;
            const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
            switching = true;
            root.classList.add('theme-switching');
            try {
                const vt = document.startViewTransition(() => applyTheme(next));
                await vt.ready;
                root.animate(
                    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
                    { duration: 550, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' }
                );
                await vt.finished;
            } catch (err) {
                if (isCRT() !== (next === 'crt')) applyTheme(next); // transition refused: swap instantly
            } finally {
                root.classList.remove('theme-switching');
                switching = false;
            }
        });
    }

    /* ── Custom cursor: a teardrop that follows with a lerp, grows on links ── */
    const cursor = (() => {
        const LERP = 0.18;
        const HIDE_OVER = 'iframe, img, input, textarea, select, .cursor-native';
        const GROW_OVER = 'a, button, [role="button"], .magnet';
        let el = null, raf = 0, seen = false, down = false, hovering = false;
        let suspended = false; // the CV tab is mostly an iframe, which never reports the pointer back: native cursor there
        let tx = -100, ty = -100, cx = -100, cy = -100, sT = 1, sC = 1, rT = 45, rC = 45;

        function frame() {
            cx += (tx - cx) * LERP; cy += (ty - cy) * LERP;
            sC += (sT - sC) * LERP; rC += (rT - rC) * LERP;
            el.style.transform = `translate3d(${cx}px, ${cy}px, 0) rotate(${rC}deg) scale(${sC})`;
            const idle = Math.abs(tx - cx) + Math.abs(ty - cy) < 0.1 && Math.abs(sT - sC) < 0.002 && Math.abs(rT - rC) < 0.1;
            raf = idle ? 0 : requestAnimationFrame(frame);
        }
        const kick = () => { if (el && !raf) raf = requestAnimationFrame(frame); };

        function onMove(e) {
            if (e.pointerType && e.pointerType !== 'mouse') return;
            tx = e.clientX; ty = e.clientY;
            // Tip points up at screen centre, leans toward the centre near the edges (never upside down)
            const k = Math.max(-1, Math.min(1, (tx - innerWidth / 2) / (innerWidth / 2)));
            rT = 45 - k * 55;
            if (!seen) { seen = true; cx = tx; cy = ty; }
            el.classList.add('is-visible');
            const t = e.target;
            const hide = !!(t && t.closest && t.closest(HIDE_OVER));
            el.classList.toggle('is-hidden', hide);
            hovering = !hide && !!(t && t.closest && t.closest(GROW_OVER));
            sT = down ? 0.8 : hovering ? 1.75 : 1;
            kick();
        }
        // The pointer left the document: off-window, or into an iframe (the PDF viewer), which
        // stops sending us pointermove — hide rather than leave the teardrop stuck at the edge.
        function onOut(e) {
            const to = e.relatedTarget;
            if (!to || to.tagName === 'IFRAME') el.classList.add('is-hidden');
        }
        function onDown(e) { if (e.pointerType === 'mouse') { down = true; sT = 0.8; kick(); } }
        function onUp(e) { if (e.pointerType === 'mouse') { down = false; sT = hovering ? 1.75 : 1; kick(); } }
        function onLeave() { el.classList.remove('is-visible'); }
        function onEnter() { if (seen) el.classList.add('is-visible'); }

        function mount() {
            if (el) return;
            el = document.createElement('div');
            el.className = 'cursor';
            el.setAttribute('aria-hidden', 'true');
            document.body.append(el);
            root.classList.add('has-cursor');
            addEventListener('pointermove', onMove, { passive: true });
            document.addEventListener('pointerout', onOut, { passive: true });
            addEventListener('pointerdown', onDown, { passive: true });
            addEventListener('pointerup', onUp, { passive: true });
            root.addEventListener('mouseleave', onLeave);
            root.addEventListener('mouseenter', onEnter);
        }
        function unmount() {
            if (!el) return;
            cancelAnimationFrame(raf); raf = 0;
            removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerout', onOut);
            removeEventListener('pointerdown', onDown);
            removeEventListener('pointerup', onUp);
            root.removeEventListener('mouseleave', onLeave);
            root.removeEventListener('mouseenter', onEnter);
            el.remove(); el = null; seen = false;
            root.classList.remove('has-cursor');
        }
        const sync = () => { if (fxAllowed() && !suspended) mount(); else unmount(); };
        document.addEventListener('site:section', e => { suspended = !!e.detail && e.detail.id === 'cv'; sync(); });
        onChange(mqFine, sync);
        onChange(mqRM, sync);
        themeListeners.add(sync);
        sync();
        return { sync };
    })();

    /* ── Magnetic buttons: [data-magnetic] leans toward the pointer ─────────── */
    function bindMagnetic(m) {
        if (m.dataset.magBound) return;
        m.dataset.magBound = '1';
        let rect = null;
        m.addEventListener('pointerenter', () => { if (fxAllowed()) rect = m.getBoundingClientRect(); });
        m.addEventListener('pointermove', e => {
            if (!rect || !fxAllowed()) return;
            m.style.translate = `${(e.clientX - rect.left - rect.width / 2) * 0.28}px ${(e.clientY - rect.top - rect.height / 2) * 0.38}px`;
        });
        m.addEventListener('pointerleave', () => { rect = null; m.style.translate = ''; });
    }
    document.querySelectorAll('[data-magnetic]').forEach(bindMagnetic);

    /* ── Reveals: words of [data-split] headings, and .reveal blocks ────────── */
    const reveal = (() => {
        const enabled = !mqRM.matches;
        const REVEAL_TARGETS = '.timeline-item, .timeline-year, .projects-more';
        const pending = new Set();
        let io = null;
        let started = false;

        function splitWords(el) {
            if (el.dataset.splitDone) return;
            el.dataset.splitDone = '1';
            const text = el.textContent.trim();
            const heading = el.closest('h1, h2, h3') || el;
            if (text) heading.setAttribute('aria-label', text); // screen readers read one phrase, not N spans
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            const nodes = [];
            let n;
            while ((n = walker.nextNode())) nodes.push(n);
            let i = 0;
            nodes.forEach(node => {
                if (!node.textContent.trim()) return;
                const frag = document.createDocumentFragment();
                node.textContent.split(/(\s+)/).forEach(part => {
                    if (!part) return;
                    if (/^\s+$/.test(part)) { frag.append(' '); return; }
                    const w = document.createElement('span');
                    w.className = 'w';
                    w.style.setProperty('--i', i++);
                    w.textContent = part;
                    frag.append(w);
                });
                node.replaceWith(frag);
            });
        }

        function observe(el) {
            if (started) io.observe(el); else pending.add(el);
        }

        // Split new headings and mark new reveal blocks inside `scope`
        function prepare(scope) {
            if (!enabled) return;
            scope.querySelectorAll('[data-split]').forEach(el => {
                const fresh = !el.dataset.splitDone;
                splitWords(el);
                if (fresh && !el.classList.contains('in')) observe(el);
            });
            scope.querySelectorAll(REVEAL_TARGETS).forEach(el => {
                if (el.classList.contains('reveal')) return;
                el.classList.add('reveal');
                observe(el);
            });
        }

        // Reset everything revealed inside `section` so it plays again (tab re-shown)
        function replay(section) {
            if (!enabled || !started) return;
            section.querySelectorAll('.in').forEach(el => {
                if (el.classList.contains('bc-name')) return; // the name reveals once
                el.classList.add('no-anim');
                el.classList.remove('in');
                el.style.transitionDelay = '';
                void el.offsetWidth;
                el.classList.remove('no-anim');
                io.unobserve(el);
                io.observe(el);
            });
        }

        function start() {
            if (!enabled || started) return;
            started = true;
            io = new IntersectionObserver(entries => {
                let n = 0;
                entries.forEach(en => {
                    if (!en.isIntersecting) return;
                    const el = en.target;
                    if (el.classList.contains('reveal')) el.style.transitionDelay = `${Math.min(n++, 4) * 70}ms`;
                    el.classList.add('in');
                    io.unobserve(el);
                });
            }, { threshold: 0.12 });
            pending.forEach(el => io.observe(el));
            pending.clear();
        }

        prepare(document);
        return { prepare, replay, start };
    })();

    const PART_SCOPES = {
        card: '#business-card',
        featured: '.featured-grid',
        projects: '#projects',
        timeline: '#timeline',
    };
    document.addEventListener('site:rendered', e => {
        const part = e.detail && e.detail.part;
        const scope = document.querySelector(PART_SCOPES[part] || '');
        if (!scope) return;
        if (part === 'card') {
            const name = scope.querySelector('.bc-name');
            if (name) name.setAttribute('data-split', '');
            scope.querySelectorAll('.bc-socials a').forEach(bindMagnetic);
        }
        reveal.prepare(scope);
    });
    document.addEventListener('site:section', e => {
        const section = e.detail && document.getElementById(e.detail.id);
        if (section && e.detail.animate) reveal.replay(section);
    });

    /* ── Tech ticker ────────────────────────────────────────────────────────── */
    (() => {
        const ticker = document.querySelector('.ticker');
        const track = ticker && ticker.querySelector('.ticker-track');
        if (!track) return;
        fetch('static/skills.json')
            .then(r => r.json())
            .then(items => {
                if (!Array.isArray(items) || !items.length) return;
                const makeSet = hidden => {
                    const set = document.createElement('div');
                    set.className = 'ticker-set';
                    if (hidden) set.setAttribute('aria-hidden', 'true');
                    items.forEach(label => {
                        const item = document.createElement('span');
                        item.className = 'ticker-item';
                        item.textContent = String(label);
                        const dot = document.createElement('i');
                        dot.className = 'ticker-dot';
                        set.append(item, dot);
                    });
                    return set;
                };
                track.append(makeSet(false), makeSet(true));
                ticker.hidden = false;
            })
            .catch(err => console.error('Error loading skills data:', err));
    })();

    /* ── Intro loader: draws the JP mark, lifts, then starts the reveals ───── */
    (() => {
        const intro = document.getElementById('intro');
        const showing = root.classList.contains('show-loader') && intro;
        let done = false;

        function replayEntrance() {
            reveal.start();
            if (mqRM.matches) return;
            const active = document.querySelector('.nav-link.active');
            const id = (active && active.getAttribute('href').slice(1)) || 'bio';
            const section = document.getElementById(id);
            if (section) { section.classList.remove('section-fade'); void section.offsetWidth; section.classList.add('section-fade'); }
            if (id === 'bio') {
                document.querySelectorAll('#business-card, .ticker, .card-separator').forEach(el => {
                    el.classList.remove('hero-fade'); void el.offsetWidth; el.classList.add('hero-fade');
                });
                const grid = document.querySelector('.featured-grid');
                if (grid) { grid.classList.remove('featured-animate'); void grid.offsetWidth; grid.classList.add('featured-animate'); }
            }
        }

        function end() {
            if (done) return;
            done = true;
            root.classList.remove('show-loader');
            if (intro) intro.remove();
            replayEntrance();
        }

        if (!showing) { reveal.start(); return; }
        try { sessionStorage.setItem('intro-seen', '1'); } catch (e) { /* ignore */ }
        setTimeout(() => {
            intro.classList.add('is-leaving');
            intro.addEventListener('animationend', e => { if (e.animationName === 'introOut') end(); });
        }, 1100);
        setTimeout(end, 2500); // safety: never trap the visitor behind the overlay
    })();
})();
