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

function activateMenuButton(element) {

    // Get all menu items
    let menuItems = document.querySelectorAll('.menu li');
    
    // Remove the active class from all menu items
    menuItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Add the active class to the clicked menu item
    element.parentElement.classList.add('active');
}

function displayHome(element) {
    activateMenuButton(element);
    document.getElementById("title").textContent = "Home";
}

function displayProjects(event, element) {
    event.preventDefault();
    activateMenuButton(element);
    document.getElementById("title").textContent = "Project Center";
}

window.addEventListener('scroll', onScroll);
document.addEventListener('DOMContentLoaded', onScroll);
