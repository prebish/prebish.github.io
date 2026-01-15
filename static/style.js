document.addEventListener('DOMContentLoaded', () => {
    const card = document.getElementById('business-card');
    if (!card) return;

    // Add 3D tilt effect based on mouse position
    card.addEventListener('mousemove', (e) => {
        // Get card dimensions and position
        const rect = card.getBoundingClientRect();
        const cardWidth = rect.width;
        const cardHeight = rect.height;
        
        // Calculate mouse position relative to card center
        // Range: -1 to 1 for both x and y
        const x = (e.clientX - rect.left) / cardWidth;
        const y = (e.clientY - rect.top) / cardHeight;
        
        // Center the coordinates (0.5, 0.5) becomes (0, 0)
        const xFromCenter = x - 0.5;
        const yFromCenter = y - 0.5;
        
        // Calculate rotation angles (max 15 degrees)
        const maxTilt = 15;
        const rotateY = xFromCenter * maxTilt; // Horizontal movement affects Y-axis rotation
        const rotateX = -yFromCenter * maxTilt; // Vertical movement affects X-axis rotation (inverted)
        
        // Apply the transform
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    // Reset the card when mouse leaves
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
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
    const sections = document.querySelectorAll('#bio');
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

    sections.forEach(section => observer.observe(section));
});