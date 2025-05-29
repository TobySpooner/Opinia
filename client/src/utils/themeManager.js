class ThemeManager {
    constructor() {
        this.isDarkMode = this.getInitialTheme();
        this.init();
    }

    getInitialTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            return savedTheme === 'dark';
        }
        // Default to dark mode instead of system preference
        return true;
    }

    init() {
        this.updateThemeClass();
        this.setupThemeToggle();
        this.setupSystemThemeListener();
    }

    updateThemeClass() {
        document.documentElement.classList.toggle('dark-mode', this.isDarkMode);
        document.documentElement.classList.toggle('light-mode', !this.isDarkMode);
        localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');

        // Update theme toggle button if it exists
        const themeToggle = document.querySelector('.theme-toggle i');
        if (themeToggle) {
            themeToggle.className = `fas fa-${this.isDarkMode ? 'sun' : 'moon'}`;
        }
    }

    setupThemeToggle() {
        document.addEventListener('DOMContentLoaded', () => {
            const themeToggle = document.querySelector('.theme-toggle');
            if (themeToggle) {
                themeToggle.addEventListener('click', () => {
                    this.toggleTheme();
                });
            }
        });
    }

    setupSystemThemeListener() {
        window.matchMedia('(prefers-color-scheme: dark)')
            .addEventListener('change', (e) => {
                if (!localStorage.getItem('theme')) {
                    this.isDarkMode = e.matches;
                    this.updateThemeClass();
                }
            });
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        this.updateThemeClass();
    }
}

// Create and export a singleton instance
export const themeManager = new ThemeManager(); 