class ThemeManager {
    constructor() {
        this.themeKey = 'opinia-theme';
        this.darkThemeClass = 'dark-theme';
        this.init();
    }

    init() {
        // Check for saved theme preference
        const savedTheme = localStorage.getItem(this.themeKey);
        
        if (savedTheme) {
            this.setTheme(savedTheme);
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.setTheme(prefersDark ? 'dark' : 'light');
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem(this.themeKey)) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });

        // Set up theme toggle button
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
    }

    setTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add(this.darkThemeClass);
        } else {
            document.documentElement.classList.remove(this.darkThemeClass);
        }
        localStorage.setItem(this.themeKey, theme);
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    }

    toggleTheme() {
        const currentTheme = localStorage.getItem(this.themeKey) || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    getCurrentTheme() {
        return localStorage.getItem(this.themeKey) || 'light';
    }
}

// Initialize theme manager
const themeManager = new ThemeManager(); 