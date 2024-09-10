async function getDocument(path) {
    const response = await fetch(path);
        
    // Check if the request was successful
    if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    // Get the text of the response
    const text = await response.text();

    // Parse the HTML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    return doc;
    // const projectCenterContent = doc.getElementById('project-center-content').innerHTML;

    // Insert the content into the main element in index.html
    // document.getElementById('content').innerHTML = projectCenterContent;
}

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
// -----------------------------------

async function portfolioPage(element) {
    activateMenuButton(element); // underline nav list item
    
    const newDocument = await getDocument("./components/portfolio.html");
    const newPageContent = newDocument.getElementById("container").innerHTML;

    document.getElementById("container").innerHTML = newPageContent;
}

window.addEventListener('scroll', onScroll);
document.addEventListener('DOMContentLoaded', onScroll);
