export function initMenu() {
    // Create and append menu button
    const menuButton = document.createElement('button');
    menuButton.className = 'menu-button';
    menuButton.innerHTML = `
        <span></span>
        <span></span>
        <span></span>
    `;
    document.querySelector('#nav').appendChild(menuButton);

    // Create menu overlay with dynamic content
    const menuOverlay = document.createElement('div');
    menuOverlay.className = 'menu-overlay';

    // Function to check auth status and update menu items
    async function updateMenuItems() {
        try {
            const response = await fetch('http://localhost:8080/me', {
                credentials: 'include'
            });

            let menuItems;
            if (response.ok) {
                menuItems = `
                    <li><a href="/index.html">Home</a></li>
                    <li><a href="/src/pages/users/users.html">Users</a></li>
                    <li><a href="/src/pages/tags/tags.html">Tags</a></li>
                    <li><a href="/src/pages/account/account.html">Account</a></li>
                `;
            } else {
                menuItems = `
                    <li><a href="/index.html">Home</a></li>
                    <li><a href="/src/pages/auth/login.html">Login</a></li>
                    <li><a href="/src/pages/auth/signup.html">Sign Up</a></li>
                `;
            }

            menuOverlay.innerHTML = `
                <div class="menu-content">
                    <ul class="menu-items">
                        ${menuItems}
                    </ul>
                </div>
            `;

            // Set active link based on current page
            const currentPath = window.location.pathname;
            const menuLinks = menuOverlay.querySelectorAll('a');
            menuLinks.forEach(link => {
                if (link.getAttribute('href').includes(currentPath)) {
                    link.style.color = '#BB18C3';
                }
            });

            // Add click handlers to links
            menuLinks.forEach(link => {
                link.addEventListener('click', () => {
                    toggleMenu();
                });
            });
        } catch (error) {
            console.error('Error checking auth status:', error);
        }
    }

    // Initial menu setup
    document.body.appendChild(menuOverlay);
    updateMenuItems();

    // Toggle menu
    function toggleMenu() {
        menuButton.classList.toggle('active');
        menuOverlay.classList.toggle('active');
        document.body.style.overflow = menuOverlay.classList.contains('active') ? 'hidden' : '';
        
        // Update menu items when opening
        if (menuOverlay.classList.contains('active')) {
            updateMenuItems();
        }
    }

    // Event listeners
    menuButton.addEventListener('click', toggleMenu);
    
    // Close menu when clicking outside
    menuOverlay.addEventListener('click', (e) => {
        if (e.target === menuOverlay) {
            toggleMenu();
        }
    });

    // Close menu when pressing escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menuOverlay.classList.contains('active')) {
            toggleMenu();
        }
    });
} 