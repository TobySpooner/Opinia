import { API_URL, API_CONFIG } from '../config.js';

export function initMenu() {
    const nav = document.getElementById("nav");
    if (!nav) return;

    // Get the current page path
    const currentPath = window.location.pathname;
    const isInPagesDir = currentPath.includes('/pages/');
    const prefix = isInPagesDir ? '../' : './src/pages/';

    // Create menu button
    const menuBtn = document.createElement("button");
    menuBtn.id = "menuBtn";
    menuBtn.innerHTML = `
        <div class="menu-icon">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    nav.appendChild(menuBtn);

    // Create menu container
    const menuContainer = document.createElement("div");
    menuContainer.id = "menuContainer";
    menuContainer.className = "menu-container";
    document.body.appendChild(menuContainer);

    // Check if user is logged in
    fetch(`${API_URL}/me`, API_CONFIG)
        .then((response) => response.json())
        .then((data) => {
            if (data.user) {
                menuContainer.innerHTML = `
                    <ul>
                        <li><a href="${prefix}posts/posts.html">Posts</a></li>
                        <li><a href="${prefix}users/users.html">Users</a></li>
                        <li><a href="${prefix}tags/tags.html">Tags</a></li>
                        <li><a href="${prefix}account/account.html">Account</a></li>
                    </ul>
                `;
            } else {
                menuContainer.innerHTML = `
                    <ul>
                        <li><a href="${prefix}posts/posts.html">Posts</a></li>
                        <li><a href="${prefix}auth/login.html">Login</a></li>
                        <li><a href="${prefix}auth/signup.html">Sign Up</a></li>
                    </ul>
                `;
            }
        })
        .catch((error) => {
            console.error("Error checking auth status:", error);
            menuContainer.innerHTML = `
                <ul>
                    <li><a href="${prefix}posts/posts.html">Posts</a></li>
                    <li><a href="${prefix}auth/login.html">Login</a></li>
                    <li><a href="${prefix}auth/signup.html">Sign Up</a></li>
                </ul>
            `;
        });

    // Toggle menu on button click
    menuBtn.addEventListener("click", () => {
        menuContainer.classList.toggle("active");
        menuBtn.classList.toggle("active");
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
        if (
            !menuContainer.contains(e.target) &&
            !menuBtn.contains(e.target) &&
            menuContainer.classList.contains("active")
        ) {
            menuContainer.classList.remove("active");
            menuBtn.classList.remove("active");
        }
    });
} 