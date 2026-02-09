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
            if (projectsSection) projectsSection.style.display = '';
        });
    }

    // Fetch and populate projects dynamically
    const projectTemplate = document.getElementById('project-template');
    const projectsSection = document.getElementById('projects');

    fetch('https://api.github.com/users/prebish/repos')
        .then(response => response.json())
        .then(repos => {
            repos.forEach(repo => {
                const projectCard = projectTemplate.content.cloneNode(true);
                projectCard.querySelector('.project-name').textContent = repo.name;
                projectCard.querySelector('.project-description').textContent = repo.description || 'No description provided.';
                projectCard.querySelector('.project-link').href = repo.html_url;
                projectsSection.appendChild(projectCard);
            });
        })
        .catch(error => console.error('Error fetching repositories:', error));

    sections.forEach(section => observer.observe(section));
});