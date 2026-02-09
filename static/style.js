document.addEventListener('DOMContentLoaded', () => {
    const card = document.getElementById('business-card');
    if (!card) return;

    // Configuration for 3D tilt effect
    const MAX_TILT = 10; // Maximum tilt angle in degrees
    const PERSPECTIVE = 1000; // Perspective distance in pixels
    const HOVER_SCALE = 1.02; // Scale factor on hover

    let cardRect = card.getBoundingClientRect();

    // Update card dimensions on window resize
    window.addEventListener('resize', () => {
        cardRect = card.getBoundingClientRect();
    });

    // Update card dimensions on mouse enter
    card.addEventListener('mouseenter', () => {
        cardRect = card.getBoundingClientRect();
    });

    // Add 3D tilt effect based on mouse position
    card.addEventListener('mousemove', (e) => {
        const cardWidth = cardRect.width;
        const cardHeight = cardRect.height;
        
        // Calculate mouse position relative to card center
        // Range: -1 to 1 for both x and y
        const x = (e.clientX - cardRect.left) / cardWidth;
        const y = (e.clientY - cardRect.top) / cardHeight;
        
        // Center the coordinates (0.5, 0.5) becomes (0, 0)
        const xFromCenter = x - 0.5;
        const yFromCenter = y - 0.5;
        
        // Calculate rotation angles
        const rotateY = xFromCenter * MAX_TILT; // Horizontal movement affects Y-axis rotation
        const rotateX = -yFromCenter * MAX_TILT; // Vertical movement affects X-axis rotation (inverted)
        
        // Apply the transform
        card.style.transform = `perspective(${PERSPECTIVE}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${HOVER_SCALE}, ${HOVER_SCALE}, ${HOVER_SCALE})`;
    });

    // Reset the card when mouse leaves
    card.addEventListener('mouseleave', () => {
        card.style.transform = `perspective(${PERSPECTIVE}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    });

    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');

            // Only handle hash links
            if (href && href.startsWith('#') && href !== '#') {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    // Hide all sections
                    sections.forEach(section => section.style.display = 'none');

                    // Show the clicked section
                    targetElement.style.display = '';

                    // Scroll into view
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });

                    // Update active state
                    navLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                }
            } else if (href === '#') {
                e.preventDefault();
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });

                // Update active state
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            }
        });
    });

    // Update active link on scroll
    // Only observe sections that have corresponding navigation links
    const sections = document.querySelectorAll('#bio, #projects, #career, #cv');
    const observerOptions = {
        root: null,
        // Trigger when section crosses the middle of viewport (50% from top)
        rootMargin: '-50% 0px',
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, observerOptions);

    // Event listener for the projects button
    const projectsBtn = document.querySelector('.nav-link[href="#projects"]');
    if (projectsBtn) {
        projectsBtn.addEventListener('click', () => {
            const bioSection = document.getElementById('bio');
            const projectsSection = document.getElementById('projects');
            if (bioSection) bioSection.style.display = 'none';
            if (projectsSection) projectsSection.style.display = 'block';
        });
    }

    // Language color map for dot indicators
    const langColors = {
        JavaScript: '#f1e05a', Python: '#3572A5', TypeScript: '#3178c6',
        HTML: '#e34c26', CSS: '#563d7c', Java: '#b07219', 'C++': '#f34b7d',
        C: '#555555', 'C#': '#178600', Go: '#00ADD8', Ruby: '#701516',
        Rust: '#dea584', Shell: '#89e051', PHP: '#4F5D95', Swift: '#F05138',
        Kotlin: '#A97BFF', Dart: '#00B4AB', Vue: '#41b883', SCSS: '#c6538c'
    };

    // Fetch and populate projects dynamically
    const projectTemplate = document.getElementById('project-template');
    const projectsGrid = document.querySelector('.projects-grid');
    if (!projectTemplate || !projectsGrid) return;

    let reposData = [];
    let selectedTags = new Set();

    function formatSize(kb) {
        if (kb >= 1024) return (kb / 1024).toFixed(1) + ' MB';
        return kb + ' KB';
    }

    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function renderRepos(repos) {
        projectsGrid.innerHTML = '';
        repos.forEach(repo => {
            const projectCard = projectTemplate.content.cloneNode(true);
            projectCard.querySelector('.project-name').textContent = repo.name;
            projectCard.querySelector('.project-description').textContent = repo.description || 'No description provided.';
            projectCard.querySelector('.project-link').href = repo.html_url;

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

            // Size & date
            projectCard.querySelector('.size-value').textContent = formatSize(repo.size);
            projectCard.querySelector('.date-value').textContent = formatDate(repo.created_at);

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

            projectsGrid.appendChild(projectCard);
        });
    }

    function getFilteredRepos() {
        if (selectedTags.size === 0) return [...reposData];
        return reposData.filter(repo =>
            repo.topics && [...selectedTags].every(tag => repo.topics.includes(tag))
        );
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
        if (!tagsList) return;
        const allTopics = new Set();
        reposData.forEach(repo => {
            if (repo.topics) repo.topics.forEach(t => allTopics.add(t));
        });
        tagsList.innerHTML = '';
        [...allTopics].sort().forEach(topic => {
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
    }

    // Sort button listeners
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            sortRepos(btn.dataset.sort);
        });
    });

    fetch('https://api.github.com/users/prebish/repos')
        .then(response => response.json())
        .then(repos => {
            reposData = repos;
            renderTagFilters();
            sortRepos('date');
        })
        .catch(error => console.error('Error fetching repositories:', error));

    sections.forEach(section => observer.observe(section));
});