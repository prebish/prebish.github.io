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

        const name = document.createElement('div');
        name.className = 'bc-name';
        name.textContent = data.name;
        card.appendChild(name);

        const title = document.createElement('div');
        title.className = 'bc-title';
        title.textContent = data.title;
        card.appendChild(title);

        if (data.tagline) {
            const tagline = document.createElement('div');
            tagline.className = 'bc-tagline';
            tagline.textContent = data.tagline;
            card.appendChild(tagline);
        }

        if (data.location) {
            const loc = document.createElement('div');
            loc.className = 'bc-location';
            loc.textContent = data.location;
            card.appendChild(loc);
        }

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
            card.appendChild(socials);
        }

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

    // Language color map for dot indicators
    const langColors = {
        JavaScript: '#f1e05a', Python: '#3572A5', TypeScript: '#3178c6',
        HTML: '#e34c26', CSS: '#563d7c', Java: '#b07219', 'C++': '#f34b7d',
        C: '#555555', 'C#': '#178600', Go: '#00ADD8', Ruby: '#701516',
        Rust: '#dea584', Shell: '#89e051', PHP: '#4F5D95', Swift: '#F05138',
        Kotlin: '#A97BFF', Dart: '#00B4AB', Vue: '#41b883', SCSS: '#c6538c'
    };

    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function initProjects() {
        const projectTemplate = document.getElementById('project-template');
        const projectsGrid = document.querySelector('.projects-grid');
        if (!projectTemplate || !projectsGrid) return;

        const REPOS_URL = 'https://api.github.com/users/prebish/repos';
        const EXCLUDED_REPOS = ['prebish', 'prebish.github.io'];
        const CACHE_KEY = 'gh-repos-cache';
        const CACHE_TTL = 60 * 60 * 1000; // 1 hour

        let reposData = [];
        let selectedTags = new Set();
        let searchQuery = '';

        function showStatus(iconClass, html) {
            projectsGrid.innerHTML = '';
            const status = document.createElement('div');
            status.className = 'projects-status';
            status.innerHTML = `<i class="${iconClass}"></i>${html}`;
            projectsGrid.appendChild(status);
        }

        function renderRepos(repos) {
            if (!repos.length) {
                showStatus('fas fa-search', 'No projects match your search or filters.');
                return;
            }
            projectsGrid.innerHTML = '';
            repos.forEach(repo => {
                const projectCard = projectTemplate.content.cloneNode(true);
                projectCard.querySelector('.project-name').textContent = repo.name;
                projectCard.querySelector('.project-description').textContent = repo.description || 'No description provided.';

                // Show lock for private repos
                const projectLock = projectCard.querySelector('.project-lock');
                if (repo.private && projectLock) {
                    projectLock.style.display = 'inline-flex';
                }

                // Language
                const langName = projectCard.querySelector('.lang-name');
                const langDot = projectCard.querySelector('.lang-dot');
                if (repo.language) {
                    langName.textContent = repo.language;
                    langDot.style.background = langColors[repo.language] || '#ccc';
                } else {
                    projectCard.querySelector('.project-language').style.display = 'none';
                }

                // Stars & forks
                projectCard.querySelector('.stars-count').textContent = repo.stargazers_count;
                projectCard.querySelector('.forks-count').textContent = repo.forks_count;

                // Topics
                const topicsContainer = projectCard.querySelector('.project-topics');
                if (repo.topics && repo.topics.length) {
                    repo.topics.forEach(topic => {
                        const tag = document.createElement('span');
                        tag.className = 'project-topic';
                        tag.textContent = topic;
                        topicsContainer.appendChild(tag);
                    });
                }

                const cardEl = projectCard.querySelector('.project-card');
                if (repo.html_url && cardEl) {
                    const link = document.createElement('a');
                    link.href = repo.html_url;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.className = 'project-card-link';
                    link.appendChild(cardEl);
                    projectsGrid.appendChild(link);
                } else {
                    projectsGrid.appendChild(projectCard);
                }
            });
        }

        function getFilteredRepos() {
            let filtered = [...reposData];
            if (selectedTags.size > 0) {
                filtered = filtered.filter(repo =>
                    repo.topics && [...selectedTags].every(tag => repo.topics.includes(tag))
                );
            }
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                filtered = filtered.filter(repo =>
                    repo.name.toLowerCase().includes(q) ||
                    (repo.description && repo.description.toLowerCase().includes(q))
                );
            }
            return filtered;
        }

        function sortRepos(key) {
            const filtered = getFilteredRepos();
            if (key === 'stars') {
                filtered.sort((a, b) => b.stargazers_count - a.stargazers_count);
            } else if (key === 'size') {
                filtered.sort((a, b) => b.size - a.size);
            } else {
                filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }
            renderRepos(filtered);
        }

        function getCurrentSortKey() {
            const activeBtn = document.querySelector('.sort-btn.active');
            return activeBtn ? activeBtn.dataset.sort : 'date';
        }

        function renderTagFilters() {
            const tagsList = document.querySelector('.tags-list');
            const tagsContainer = document.querySelector('.projects-tags');
            const controlsSep = document.querySelector('.controls-sep');
            if (!tagsList) return;
            const topicCounts = new Map();
            reposData.forEach(repo => {
                if (repo.topics) repo.topics.forEach(t => topicCounts.set(t, (topicCounts.get(t) || 0) + 1));
            });
            const qualifiedTopics = [...topicCounts.entries()].filter(([, count]) => count > 1).map(([t]) => t);
            tagsList.innerHTML = '';
            qualifiedTopics.sort().forEach(topic => {
                const btn = document.createElement('button');
                btn.className = 'tag-btn';
                btn.textContent = topic;
                if (selectedTags.has(topic)) btn.classList.add('active');
                btn.addEventListener('click', () => {
                    if (selectedTags.has(topic)) {
                        selectedTags.delete(topic);
                        btn.classList.remove('active');
                    } else {
                        selectedTags.add(topic);
                        btn.classList.add('active');
                    }
                    sortRepos(getCurrentSortKey());
                });
                tagsList.appendChild(btn);
            });
            if (tagsContainer) tagsContainer.style.display = qualifiedTopics.length > 0 ? 'flex' : 'none';
            if (controlsSep) controlsSep.style.display = qualifiedTopics.length > 0 ? 'block' : 'none';
        }

        // Sort button listeners
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                sortRepos(btn.dataset.sort);
            });
        });

        // Search input listener
        const searchInput = document.querySelector('.projects-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                searchQuery = searchInput.value.trim();
                sortRepos(getCurrentSortKey());
            });
        }

        // Fetch repos, using a session cache to avoid the unauthenticated
        // GitHub API rate limit (60 requests/hour per IP) on repeat visits
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

        showStatus('fas fa-circle-notch fa-spin', 'Loading projects…');

        loadRepos()
            .then(repos => {
                reposData = repos.filter(r => !EXCLUDED_REPOS.includes(r.name));
                renderTagFilters();
                sortRepos('date');
            })
            .catch(error => {
                console.error('Error fetching repositories:', error);
                showStatus(
                    'fas fa-triangle-exclamation',
                    'Couldn\'t load projects right now. Browse them directly on <a href="https://github.com/prebish" target="_blank" rel="noopener noreferrer">GitHub</a>.'
                );
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
