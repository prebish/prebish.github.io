document.addEventListener('DOMContentLoaded', () => {
    const card = document.getElementById('business-card');
    if (!card) return;

    // Log the mouse x-position (clientX) while hovering over the card
    card.addEventListener('mousemove', (e) => {
        console.log(e.clientX);
    });
});