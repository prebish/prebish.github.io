document.addEventListener('DOMContentLoaded', () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Business Card ──
    const card = document.getElementById('business-card');

    function initTilt() {
        if (!card || prefersReducedMotion) return;

        const MAX_TILT = 6; // Maximum tilt angle in degrees (subtle)
        const PERSPECTIVE = 1200; // Perspective distance in pixels
        const HOVER_SCALE = 1.01; // Scale factor on hover

        let cardRect = card.getBoundingClientRect();

        window.addEventListener('resize', () => {
            cardRect = card.getBoundingClientRect();
        });

        card.addEventListener('mouseenter', () => {
            cardRect = card.getBoundingClientRect();
        });

        // 3D tilt based on mouse position relative to card center
        card.addEventListener('mousemove', (e) => {
            const x = (e.clientX - cardRect.left) / cardRect.width;
            const y = (e.clientY - cardRect.top) / cardRect.height;
            const rotateY = (x - 0.5) * MAX_TILT;
            const rotateX = -(y - 0.5) * MAX_TILT;
            card.style.transform = `perspective(${PERSPECTIVE}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${HOVER_SCALE}, ${HOVER_SCALE}, ${HOVER_SCALE})`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(${PERSPECTIVE}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        });
    }

    function renderBusinessCard(data) {
        card.innerHTML = '';

        // Brand mark (employer logo), pinned to the top-right corner
        if (data.logo) {
            const logoWrap = document.createElement('div');
            logoWrap.className = 'bc-logo';
            const img = document.createElement('img');
            img.src = data.logo.src;
            img.alt = data.logo.alt || '';
            img.title = data.logo.alt || '';
            logoWrap.appendChild(img);
            card.appendChild(logoWrap);
        }

        // Identity: name + title + tagline
        const identity = document.createElement('div');
        identity.className = 'bc-identity';

        const name = document.createElement('h1'); // the site's only <h1>; the name appears once
        name.className = 'bc-name';
        name.textContent = data.name;
        identity.appendChild(name);

        if (data.title) {
            const title = document.createElement('div');
            title.className = 'bc-title';
            title.textContent = data.title;
            identity.appendChild(title);
        }

        if (data.tagline) {
            const tagline = document.createElement('div');
            tagline.className = 'bc-tagline';
            tagline.textContent = data.tagline;
            identity.appendChild(tagline);
        }
        card.appendChild(identity);

        // Lower block, anchored to the card bottom: divider + contact + socials
        const lower = document.createElement('div');
        lower.className = 'bc-lower';

        const divider = document.createElement('div');
        divider.className = 'bc-divider';
        lower.appendChild(divider);

        // Contact details — the lines that make it read as a business card
        const contacts = [];
        if (data.location) contacts.push({ icon: 'fas fa-location-dot', text: data.location });
        if (data.email) contacts.push({ icon: 'fas fa-envelope', text: data.email, url: 'mailto:' + data.email });
        if (data.website) contacts.push({ icon: 'fas fa-globe', text: data.website, url: data.websiteUrl || ('https://' + data.website) });

        if (contacts.length) {
            const contact = document.createElement('div');
            contact.className = 'bc-contact';
            contacts.forEach(c => {
                const item = document.createElement(c.url ? 'a' : 'div');
                item.className = 'bc-contact-item';
                if (c.url) {
                    item.href = c.url;
                    if (!c.url.startsWith('mailto:')) { item.target = '_blank'; item.rel = 'noopener noreferrer'; }
                }
                const icon = document.createElement('i');
                icon.className = c.icon;
                const span = document.createElement('span');
                span.textContent = c.text;
                item.append(icon, span);
                contact.appendChild(item);
            });
            lower.appendChild(contact);
        }

        // Social / profile links
        if (data.socials && data.socials.length) {
            const socials = document.createElement('div');
            socials.className = 'bc-socials';
            data.socials.forEach(s => {
                const a = document.createElement('a');
                a.href = s.url || '#';
                if (s.url && !s.url.startsWith('mailto:')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
                a.setAttribute('aria-label', s.label || '');
                if (s.img) {
                    const img = document.createElement('img');
                    img.src = s.img;
                    img.alt = s.label || '';
                    img.className = 'bc-social-img';
                    a.appendChild(img);
                } else {
                    const icon = document.createElement('i');
                    icon.className = s.icon;
                    a.appendChild(icon);
                }
                socials.appendChild(a);
            });
            lower.appendChild(socials);
        }

        card.appendChild(lower);
    }

    function initBusinessCard() {
        if (!card) return;
        initTilt();
        fetch('static/business-card.json')
            .then(response => response.json())
            .then(data => renderBusinessCard(data))
            .catch(error => console.error('Error loading business card data:', error));
    }

    // ── Featured Section ──
    function triggerFeaturedAnimation() {
        const grid = document.querySelector('.featured-grid');
        if (!grid) return;
        grid.classList.remove('featured-animate');
        void grid.offsetWidth; // force reflow so animation restarts
        grid.classList.add('featured-animate');
    }

    function renderFeatured(cards) {
        const grid = document.querySelector('.featured-grid');
        if (!grid) return;
        grid.innerHTML = '';
        cards.forEach(item => {
            const a = document.createElement('a');
            a.className = 'featured-card';
            a.href = item.url || '#';
            if (item.url && !item.url.startsWith('#')) {
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
            }

            const icon = document.createElement('i');
            icon.className = `${item.icon} featured-card-icon`;
            a.appendChild(icon);

            const title = document.createElement('h3');
            title.className = 'featured-card-title';
            title.textContent = item.title;
            a.appendChild(title);

            const desc = document.createElement('p');
            desc.className = 'featured-card-description';
            desc.textContent = item.description;
            a.appendChild(desc);

            const cta = document.createElement('span');
            cta.className = 'featured-card-cta';
            cta.innerHTML = `${item.label} <i class="fas fa-arrow-right"></i>`;
            a.appendChild(cta);

            grid.appendChild(a);
        });
        triggerFeaturedAnimation();
    }

    function initFeatured() {
        fetch('static/featured.json')
            .then(r => r.json())
            .then(cards => renderFeatured(cards))
            .catch(err => console.error('Error loading featured data:', err));
    }

    // ── Navigation / section switching ──
    const navLinks = document.querySelectorAll('.nav-link');
    const allSections = document.querySelectorAll('#bio, #projects, #timeline, #cv');
    const businessCard = card;
    const cardSeparator = document.querySelector('.card-separator');
    const VALID_SECTIONS = ['bio', 'projects', 'timeline', 'cv'];

    function setActiveLink(id) {
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
    }

    // The business card + separator are the hero for the home (Featured) view
    // only; every other tab is its own focused page.
    function setHeroVisible(visible, animate) {
        [businessCard, cardSeparator].forEach(el => {
            if (!el) return;
            el.classList.remove('hero-fade');
            if (visible) {
                el.style.display = '';
                if (el === businessCard) el.style.transform = ''; // clear tilt leftovers
                if (animate) { void el.offsetWidth; el.classList.add('hero-fade'); }
            } else {
                el.style.display = 'none';
            }
        });
    }

    function showSection(id, { animate = true } = {}) {
        const target = document.getElementById(id);
        if (!target) return;
        const anim = animate && !prefersReducedMotion;
        const isHome = id === 'bio';

        allSections.forEach(section => {
            section.style.display = 'none';
            section.classList.remove('section-fade');
        });

        setHeroVisible(isHome, anim);

        target.style.display = 'block';
        if (anim) {
            void target.offsetWidth; // restart the entrance animation
            target.classList.add('section-fade');
        }
        if (isHome) triggerFeaturedAnimation();

        window.scrollTo({ top: 0, behavior: anim ? 'smooth' : 'auto' });
    }

    function initNav() {
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (!href || !href.startsWith('#') || href === '#') return;

                e.preventDefault();

                const targetId = href.substring(1);
                if (!document.getElementById(targetId)) return;

                setActiveLink(targetId);
                history.replaceState(null, '', href);
                showSection(targetId);
            });
        });

        // Deep link: open the section named in the URL hash on load
        const initialId = location.hash.replace('#', '');
        if (VALID_SECTIONS.includes(initialId) && initialId !== 'bio') {
            setActiveLink(initialId);
            showSection(initialId, { animate: false });
        }

        // Handle manual hash edits / external hash links
        window.addEventListener('hashchange', () => {
            const id = location.hash.replace('#', '') || 'bio';
            if (!VALID_SECTIONS.includes(id)) return;
            setActiveLink(id);
            showSection(id);
        });
    }

    // ── Projects ──

    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function initProjects() {
        const spotlightTemplate = document.getElementById('spotlight-template');
        const spotlightGrid = document.querySelector('.spotlight-grid');
        const introEl = document.querySelector('.projects-intro');

        function makeLink(href, label, iconClass, className) {
            const a = document.createElement('a');
            a.href = href;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.className = className;
            a.innerHTML = `<i class="${iconClass}"></i> <span>${label}</span>`;
            return a;
        }

        // ── Curated spotlight (authored, from projects.json) ──
        function renderSpotlight(data) {
            if (introEl && data.intro) introEl.textContent = data.intro;
            if (!spotlightTemplate || !spotlightGrid || !Array.isArray(data.spotlight)) return;
            spotlightGrid.innerHTML = '';
            data.spotlight.forEach(p => {
                const node = spotlightTemplate.content.cloneNode(true);

                node.querySelector('.spotlight-icon').className = `${p.icon || 'fas fa-code'} spotlight-icon`;

                const status = node.querySelector('.spotlight-status');
                if (p.status) {
                    status.textContent = p.status;
                    status.classList.add(`status-${p.status.toLowerCase().replace(/\s+/g, '-')}`);
                } else {
                    status.remove();
                }

                node.querySelector('.spotlight-name').textContent = p.name || '';
                node.querySelector('.spotlight-blurb').textContent = p.blurb || '';

                const highlight = node.querySelector('.spotlight-highlight');
                if (p.highlight) {
                    node.querySelector('.spotlight-highlight-text').textContent = p.highlight;
                } else {
                    highlight.remove();
                }

                const tech = node.querySelector('.spotlight-tech');
                if (Array.isArray(p.tech) && p.tech.length) {
                    p.tech.forEach(t => {
                        const chip = document.createElement('span');
                        chip.className = 'tech-chip';
                        chip.textContent = t;
                        tech.appendChild(chip);
                    });
                } else {
                    tech.remove();
                }

                const links = node.querySelector('.spotlight-links');
                if (p.demo) links.appendChild(makeLink(p.demo, 'Visit', 'fas fa-arrow-up-right-from-square', 'spotlight-link primary'));
                if (p.repo) links.appendChild(makeLink(p.repo, 'Code', 'fab fa-github', 'spotlight-link'));
                if (!links.children.length) links.remove();

                spotlightGrid.appendChild(node);
            });
        }

        if (spotlightGrid) {
            fetch('static/projects.json')
                .then(r => r.json())
                .then(renderSpotlight)
                .catch(err => console.error('Error loading projects data:', err));
        }

        // ── "More on GitHub" backstop (auto-pulled, deliberately secondary) ──
        const moreList = document.querySelector('.projects-more-list');
        const moreNote = document.querySelector('.projects-more-note');
        if (!moreList) return;

        const REPOS_URL = 'https://api.github.com/users/prebish/repos?per_page=100&sort=pushed';
        const CACHE_KEY = 'gh-repos-cache';
        const CACHE_TTL = 60 * 60 * 1000; // 1 hour
        // Repos already featured in the spotlight, plus the profile + this site,
        // are hidden from the backstop so it doesn't repeat what's above.
        const SPOTLIGHT_REPOS = ['cpu2247-schematic', 'lzw-compression-tool', 'boggle-solver', 'mips-classic-frogger'];
        const EXCLUDED_REPOS = ['prebish', 'prebish.github.io', 'prebish.github.io.old', ...SPOTLIGHT_REPOS];

        // Session cache avoids the unauthenticated GitHub rate limit on repeat visits
        function loadRepos() {
            try {
                const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
                if (cached && Array.isArray(cached.repos) && Date.now() - cached.time < CACHE_TTL) {
                    return Promise.resolve(cached.repos);
                }
            } catch (e) { /* corrupt cache — fall through to fetch */ }

            return fetch(REPOS_URL)
                .then(response => {
                    if (!response.ok) throw new Error(`GitHub API responded ${response.status}`);
                    return response.json();
                })
                .then(repos => {
                    if (!Array.isArray(repos)) throw new Error('Unexpected GitHub API response');
                    try {
                        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), repos }));
                    } catch (e) { /* storage full/unavailable — ignore */ }
                    return repos;
                });
        }

        loadRepos()
            .then(repos => {
                const rest = repos.filter(r => !r.fork && !EXCLUDED_REPOS.includes(r.name));
                if (moreNote) {
                    moreNote.textContent = rest.length
                        ? `Plus ${rest.length} more on GitHub — algorithms, systems, data, and experiments.`
                        : 'Browse the full list of repositories on GitHub.';
                }
                moreList.innerHTML = '';
                rest.forEach(repo => {
                    const a = document.createElement('a');
                    a.href = repo.html_url;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    a.className = 'more-chip';
                    a.textContent = repo.name;
                    if (repo.description) a.title = repo.description;
                    moreList.appendChild(a);
                });
            })
            .catch(error => {
                console.error('Error fetching repositories:', error);
                if (moreNote) moreNote.textContent = 'Browse the full list of repositories on GitHub.';
            });
    }

    // ── Career Timeline ──
    function initTimeline() {
        const milestoneTemplate = document.getElementById('milestone-template');
        const timelineContainer = document.querySelector('.timeline');
        if (!milestoneTemplate || !timelineContainer) return;

        function renderMilestones(milestones) {
            timelineContainer.innerHTML = '';
            milestones
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .forEach(m => {
                    const item = milestoneTemplate.content.cloneNode(true);
                    item.querySelector('.timeline-date').textContent = formatDate(m.date);
                    item.querySelector('.timeline-title').textContent = m.title;
                    item.querySelector('.timeline-org').textContent = m.organization;
                    item.querySelector('.timeline-description').textContent = m.description;
                    const detailsEl = item.querySelector('.timeline-details');
                    if (m.details && detailsEl) {
                        detailsEl.textContent = m.details;
                    } else if (detailsEl) {
                        detailsEl.style.display = 'none';
                    }
                    const icon = item.querySelector('.timeline-icon i');
                    if (m.icon) icon.className = m.icon;
                    if (m.size && [1, 2, 3].includes(m.size)) item.querySelector('.timeline-content').dataset.size = m.size;
                    timelineContainer.appendChild(item);
                });
        }

        fetch('static/career.json')
            .then(response => response.json())
            .then(milestones => renderMilestones(milestones))
            .catch(error => console.error('Error loading career data:', error));
    }

    initBusinessCard();
    initFeatured();
    initNav();
    initProjects();
    initTimeline();
});
