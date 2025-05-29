class NavbarManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupMobileMenu();
        this.setupCurrentPageIndicator();
        this.setupAuthButtons();
        this.setupAccessibilityControls();
    }

    setupMobileMenu() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        const burger = navbar.querySelector('.navbar-burger');
        const menu = navbar.querySelector('.navbar-menu');

        if (!burger || !menu) return;

        burger.addEventListener('click', () => {
            const isExpanded = burger.getAttribute('aria-expanded') === 'true';
            burger.setAttribute('aria-expanded', !isExpanded);
            menu.classList.toggle('is-active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navbar.contains(e.target) && menu.classList.contains('is-active')) {
                menu.classList.remove('is-active');
                burger.setAttribute('aria-expanded', 'false');
            }
        });

        // Close menu when pressing Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menu.classList.contains('is-active')) {
                menu.classList.remove('is-active');
                burger.setAttribute('aria-expanded', 'false');
            }
        });
    }

    setupCurrentPageIndicator() {
        const currentPath = window.location.pathname;
        const navItems = document.querySelectorAll('.navbar-item');

        navItems.forEach(item => {
            if (item.getAttribute('href') === currentPath) {
                item.setAttribute('aria-current', 'page');
            } else {
                item.removeAttribute('aria-current');
            }
        });
    }

    setupAuthButtons() {
        const authContainer = document.getElementById('auth-buttons');
        if (!authContainer) return;

        const token = localStorage.getItem('token');
        
        if (token) {
            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'navbar-item';
            logoutBtn.textContent = 'Logout';
            logoutBtn.setAttribute('aria-label', 'Log out of your account');
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('token');
                window.location.href = '/login.html';
            });
            authContainer.appendChild(logoutBtn);
        } else {
            const loginLink = document.createElement('a');
            loginLink.href = '/login.html';
            loginLink.className = 'navbar-item';
            loginLink.textContent = 'Login';
            loginLink.setAttribute('aria-label', 'Log in to your account');

            const signupLink = document.createElement('a');
            signupLink.href = '/signup.html';
            signupLink.className = 'navbar-item';
            signupLink.textContent = 'Sign Up';
            signupLink.setAttribute('aria-label', 'Create a new account');

            authContainer.appendChild(loginLink);
            authContainer.appendChild(signupLink);
        }
    }

    setupAccessibilityControls() {
        // Font size controls
        const fontSizeIncrease = document.getElementById('font-size-increase');
        const fontSizeDecrease = document.getElementById('font-size-decrease');
        
        if (fontSizeIncrease && fontSizeDecrease) {
            const fontSizeStep = 0.1;
            const maxFontSize = 1.5;
            const minFontSize = 0.8;

            fontSizeIncrease.addEventListener('click', () => {
                const currentSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
                const newSize = Math.min(maxFontSize * 16, currentSize + fontSizeStep * 16);
                document.documentElement.style.fontSize = `${newSize / 16}rem`;
                localStorage.setItem('opinia-font-size', newSize / 16);
            });

            fontSizeDecrease.addEventListener('click', () => {
                const currentSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
                const newSize = Math.max(minFontSize * 16, currentSize - fontSizeStep * 16);
                document.documentElement.style.fontSize = `${newSize / 16}rem`;
                localStorage.setItem('opinia-font-size', newSize / 16);
            });

            // Restore saved font size
            const savedFontSize = localStorage.getItem('opinia-font-size');
            if (savedFontSize) {
                document.documentElement.style.fontSize = `${savedFontSize}rem`;
            }
        }

        // High contrast toggle
        const contrastToggle = document.getElementById('contrast-toggle');
        if (contrastToggle) {
            const highContrastClass = 'high-contrast';
            
            contrastToggle.addEventListener('click', () => {
                document.documentElement.classList.toggle(highContrastClass);
                const isHighContrast = document.documentElement.classList.contains(highContrastClass);
                localStorage.setItem('opinia-contrast', isHighContrast ? 'high' : 'normal');
            });

            // Restore saved contrast preference
            const savedContrast = localStorage.getItem('opinia-contrast');
            if (savedContrast === 'high') {
                document.documentElement.classList.add(highContrastClass);
            }
        }
    }
}

// Initialize navbar manager
const navbarManager = new NavbarManager(); 