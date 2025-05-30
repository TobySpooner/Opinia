import { notify } from "../../utils/notification.js";
import { API_URL, API_CONFIG } from "../../config.js";

// DOM Elements
const usersGrid = document.getElementById("usersGrid");
const filterButtons = document.querySelectorAll(".filter-btn");
const searchInput = document.getElementById("searchInput");

// State
let users = [];
let currentFilter = "all";
let searchQuery = "";

// Get initials from username
function getInitials(username) {
  return username
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Create user card HTML
function createUserCard(user) {
  return `
        <div class="user-card" data-user-id="${user.id}">
            <div class="user-header">
                <div class="user-avatar">
                    <span>${getInitials(user.username)}</span>
                </div>
                <div class="user-info">
                    <h3 class="user-name">${user.username}</h3>
                    <span class="user-role ${user.role_name.toLowerCase()}">${
    user.role_name
  }</span>
                </div>
            </div>
            <div class="user-stats">
                <span>${user.karma || 0} karma</span>
            </div>
            <p class="user-bio">${user.bio || "No bio yet"}</p>
        </div>
    `;
}

// Filter users based on current filter and search query
function filterUsers() {
  const filteredUsers = users.filter((user) => {
    const matchesFilter =
      currentFilter === "all" || user.role_name === currentFilter;
    const matchesSearch =
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.bio?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  renderUsers(filteredUsers);
}

// Render users to the grid
function renderUsers(usersToRender) {
  if (usersToRender.length === 0) {
    usersGrid.innerHTML = `
            <div class="loading-spinner">
                <p>No users found</p>
            </div>
        `;
    return;
  }

  usersGrid.innerHTML = usersToRender
    .map((user) => createUserCard(user))
    .join("");

  // Add click handlers to cards
  document.querySelectorAll(".user-card").forEach((card) => {
    card.addEventListener("click", () => {
      const userId = card.dataset.userId;
      window.location.href = `/src/pages/account/account.html?id=${userId}`;
    });
  });
}

// Load users from API
async function loadUsers() {
  try {
    // First check if we're logged in
    const meResponse = await fetch(`${API_URL}/me`, {
      ...API_CONFIG
    });

    if (!meResponse.ok) {
      window.location.href = "/src/pages/auth/login.html";
      return;
    }

    const [usersResponse, rolesResponse] = await Promise.all([
      fetch(`${API_URL}/users`, { ...API_CONFIG }),
      fetch(`${API_URL}/roles/all`, { ...API_CONFIG }),
    ]);

    if (!usersResponse.ok || !rolesResponse.ok) {
      throw new Error("Failed to fetch users");
    }

    const usersData = await usersResponse.json();
    const rolesData = await rolesResponse.json();

    // Combine user data with their roles
    users = usersData.map((user) => {
      const userRole = rolesData.find((role) => role.user_id === user.id);
      return {
        ...user,
        role_name: userRole?.role_name || "User",
      };
    });

    filterUsers();
  } catch (error) {
    console.error("Error loading users:", error);
    notify.error("Failed to load users");
    usersGrid.innerHTML = `
            <div class="loading-spinner">
                <p>Error loading users</p>
            </div>
        `;
  }
}

// Event Listeners
filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    // Update active state
    filterButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    // Update filter and re-render
    currentFilter = button.dataset.role;
    filterUsers();
  });
});

searchInput.addEventListener("input", (e) => {
  searchQuery = e.target.value;
  filterUsers();
});

// Initialize page
document.addEventListener("DOMContentLoaded", loadUsers);
