import { notify } from "../../utils/notification.js";

const API_URL = "http://opinia-1z72.onrender.com";

// DOM Elements
const accountContainer = document.querySelector(".account-container");
const usernameElement = document.querySelector(".username");
const bioElement = document.querySelector(".bio");
const roleBadgeElement = document.querySelector(".role-badge");
const karmaCountElement = document.querySelector(".karma-count");
const profilePictureElement = document.querySelector(".profile-picture span");
const postsContainer = document.getElementById("postsContainer");
const commentsContainer = document.getElementById("commentsContainer");

// Account action buttons
const editProfileBtn = document.getElementById("editProfileBtn");
const changePasswordBtn = document.getElementById("changePasswordBtn");
const privacySettingsBtn = document.getElementById("privacySettingsBtn");
const deleteAccountBtn = document.getElementById("deleteAccountBtn");

// Get user ID from URL or default to logged-in user
const urlParams = new URLSearchParams(window.location.search);
const targetUserId = urlParams.get("id");

// Store the logged-in user's ID
let loggedInUserId = null;

// Modal Elements
const editProfileModal = document.getElementById("editProfileModal");
const changePasswordModal = document.getElementById("changePasswordModal");
const editProfileForm = document.getElementById("editProfileForm");
const changePasswordForm = document.getElementById("changePasswordForm");
const bioInput = document.getElementById("bioInput");
const charCount = document.querySelector(".char-count");
const closeButtons = document.querySelectorAll(".close-modal");
const cancelButtons = document.querySelectorAll(".cancel-btn");

// Format date to relative time
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Get initials from username
function getInitials(username) {
  return username
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Modal Functions
function openModal(modal) {
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeModal(modal) {
  modal.classList.remove("active");
  document.body.style.overflow = "";
}

// Close modal when clicking outside
function handleOutsideClick(e, modal) {
  if (e.target === modal) {
    closeModal(modal);
  }
}

// Update character count for bio
function updateCharCount() {
  const current = bioInput.value.length;
  charCount.textContent = `${current}/200`;
}

// Handle account management actions
function setupAccountActions(userId) {
  editProfileBtn.addEventListener("click", () => {
    bioInput.value = bioElement.textContent;
    updateCharCount();
    openModal(editProfileModal);
  });

  changePasswordBtn.addEventListener("click", () => {
    changePasswordForm.reset();
    openModal(changePasswordModal);
  });

  // Edit Profile Form Submit
  editProfileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newBio = bioInput.value.trim();

    try {
      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ bio: newBio }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const updatedUser = await response.json();
      bioElement.textContent = updatedUser.bio;
      notify.success("Profile updated successfully");
      closeModal(editProfileModal);
    } catch (error) {
      console.error("Error updating profile:", error);
      notify.error("Failed to update profile");
    }
  });

  // Change Password Form Submit
  changePasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (newPassword !== confirmPassword) {
      notify.error("Passwords do not match");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/users/${userId}/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ currentPassword, newPassword }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to change password");
      }

      notify.success("Password changed successfully");
      closeModal(changePasswordModal);
      changePasswordForm.reset();
    } catch (error) {
      console.error("Error changing password:", error);
      notify.error(error.message);
    }
  });

  // Bio character count
  bioInput.addEventListener("input", updateCharCount);

  // Close modal handlers
  closeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      closeModal(button.closest(".modal"));
    });
  });

  cancelButtons.forEach((button) => {
    button.addEventListener("click", () => {
      closeModal(button.closest(".modal"));
    });
  });

  // Close on outside click
  editProfileModal.addEventListener("click", (e) =>
    handleOutsideClick(e, editProfileModal)
  );
  changePasswordModal.addEventListener("click", (e) =>
    handleOutsideClick(e, changePasswordModal)
  );

  privacySettingsBtn.addEventListener("click", () => {
    notify.info("Privacy settings feature coming soon!");
  });

  deleteAccountBtn.addEventListener("click", async () => {
    const confirmed = confirm(
      "Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data."
    );

    if (confirmed) {
      const doubleConfirmed = confirm(
        "Please confirm again that you want to delete your account permanently."
      );

      if (doubleConfirmed) {
        try {
          const response = await fetch(`${API_URL}/users/${userId}`, {
            method: "DELETE",
            credentials: "include",
          });

          if (!response.ok) {
            throw new Error("Failed to delete account");
          }

          notify.success("Account deleted successfully");
          setTimeout(() => {
            window.location.href = "/index.html";
          }, 2000);
        } catch (error) {
          console.error("Error deleting account:", error);
          notify.error("Failed to delete account");
        }
      }
    }
  });
}

// Show user not found state
function showUserNotFound() {
  document.title = "Opinia - User Not Found";
  accountContainer.innerHTML = `
        <div class="no-content" style="margin: 2rem;">
            <div class="empty-icon">🔍</div>
            <div class="empty-message">User Not Found</div>
            <div class="empty-submessage">
                The user you're looking for doesn't exist or has been deleted.
            </div>
        </div>
    `;
}

// Load user data
async function loadUserData() {
  try {
    // First check if we're logged in
    const meResponse = await fetch(`${API_URL}/me`, {
      credentials: "include",
    });

    if (!meResponse.ok) {
      window.location.href = "/src/pages/auth/login.html";
      return;
    }

    const { user } = await meResponse.json();
    loggedInUserId = user.id; // Store the logged-in user's ID

    // Determine which user to load
    const userId = targetUserId || loggedInUserId;

    if (!userId) {
      window.location.href = "/src/pages/auth/login.html";
      return;
    }

    // Load user details
    const userResponse = await fetch(`${API_URL}/users/${userId}`, {
      credentials: "include",
    });

    if (!userResponse.ok) {
      throw new Error("Failed to fetch user details");
    }

    const userData = await userResponse.json();

    // Load user role
    const roleResponse = await fetch(`${API_URL}/users/${userId}/role`, {
      credentials: "include",
    });

    if (!roleResponse.ok) {
      throw new Error("Failed to fetch user role");
    }

    const roleData = await roleResponse.json();

    // Update UI with user data
    document.title = `Opinia - ${userData.username}'s Profile`;
    usernameElement.textContent = userData.username;
    bioElement.textContent = userData.bio || "No bio yet";
    karmaCountElement.textContent = userData.karma || 0;
    profilePictureElement.textContent = getInitials(userData.username);
    roleBadgeElement.textContent = roleData.role_name;
    roleBadgeElement.className = `role-badge ${roleData.role_name.toLowerCase()}`;

    // Show/hide account management buttons if viewing own profile
    const accountActions = document.querySelector(".account-actions");
    if (loggedInUserId === parseInt(userId)) {
      accountActions.style.display = "flex";
      setupAccountActions(userId);
    } else {
      accountActions.style.display = "none";
    }

    // Load posts and comments
    await Promise.all([loadUserPosts(userId), loadUserComments(userId)]);
  } catch (error) {
    console.error("Error loading user data:", error);
    showUserNotFound();
  }
}

// Load user's posts
async function loadUserPosts(userId) {
  try {
    const response = await fetch(`${API_URL}/users/${userId}/posts`, {
      credentials: "include",
    });

    if (response.status === 404) {
      return; // User not found, but we've already shown the message
    }

    if (!response.ok) {
      throw new Error("Failed to fetch posts");
    }

    const posts = await response.json();

    if (posts.length === 0) {
      postsContainer.innerHTML = `
                <div class="no-content">
                    <div class="empty-icon">📝</div>
                    <div class="empty-message">No posts yet</div>
                    <div class="empty-submessage">
                        ${
                          userId === window.userId
                            ? "Share your thoughts with the community!"
                            : "This user hasn't posted anything yet."
                        }
                    </div>
                </div>`;
      return;
    }

    postsContainer.innerHTML = posts
      .map(
        (post) => `
            <div class="post-item">
                <h3 class="post-title">${post.title}</h3>
                <p class="post-content">${post.content}</p>
                <div class="post-meta">
                    <span class="meta-item date">${formatRelativeTime(
                      post.created_at
                    )}</span>
                    <span class="meta-item comments">${
                      post.comment_count || 0
                    } comments</span>
                </div>
            </div>
        `
      )
      .join("");
  } catch (error) {
    console.error("Error loading posts:", error);
    notify.error("Failed to load posts");
  }
}

// Load user's comments
async function loadUserComments(userId) {
  try {
    const response = await fetch(`${API_URL}/users/${userId}/comments`, {
      credentials: "include",
    });

    if (response.status === 404) {
      return; // User not found, but we've already shown the message
    }

    if (!response.ok) {
      throw new Error("Failed to fetch comments");
    }

    const comments = await response.json();

    if (comments.length === 0) {
      commentsContainer.innerHTML = `
                <div class="no-content">
                    <div class="empty-icon">💬</div>
                    <div class="empty-message">No comments yet</div>
                    <div class="empty-submessage">
                        ${
                          userId === window.userId
                            ? "Join the conversation by commenting on posts!"
                            : "This user hasn't commented on anything yet."
                        }
                    </div>
                </div>`;
      return;
    }

    commentsContainer.innerHTML = comments
      .map(
        (comment) => `
            <div class="comment-item">
                <p class="comment-content">${comment.content}</p>
                <div class="comment-meta">
                    <span class="meta-item date">${formatRelativeTime(
                      comment.created_at
                    )}</span>
                </div>
            </div>
        `
      )
      .join("");
  } catch (error) {
    console.error("Error loading comments:", error);
    notify.error("Failed to load comments");
  }
}

// Initialize page
document.addEventListener("DOMContentLoaded", loadUserData);
