function onScroll() {
    const cards = document.querySelectorAll('.card');
    const windowHeight = window.innerHeight;
    let centerCard = null;
    let minDistance = windowHeight;

    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - windowHeight / 2);

        if (distance < minDistance) {
            minDistance = distance;
            centerCard = card;
        }
    });

    cards.forEach(card => {
        if (card === centerCard) {
            card.classList.add('card-centered');
        } else {
            card.classList.remove('card-centered');
        }
    });
}

window.addEventListener('scroll', onScroll);
document.addEventListener('DOMContentLoaded', onScroll);
