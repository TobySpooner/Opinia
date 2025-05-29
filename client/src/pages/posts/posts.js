import { notify } from "../../utils/notification.js";

const API_URL = "http://opinia-1z72.onrender.com";

// DOM Elements
const postsGrid = document.getElementById("postsGrid");
const createPostBtn = document.getElementById("createPostBtn");
const createPostModal = document.getElementById("createPostModal");
const createPostForm = document.getElementById("createPostForm");
const closeModalBtn = document.querySelector(".close-modal");
const titleInput = document.getElementById("postTitle");
const contentInput = document.getElementById("postContent");
const tagsInput = document.getElementById("postTags");
const titleCount = document.querySelector(".title-count");
const contentCount = document.querySelector(".content-count");
const searchInput = document.getElementById("searchInput");
const filterBtns = document.querySelectorAll(".filter-btn");
const tagSearch = document.getElementById("tagSearch");
const tagDropdown = document.querySelector(".tag-dropdown");
const selectedTagsContainer = document.querySelector(".selected-tags");
const postTagsInput = document.getElementById("postTags");

// State
let posts = [];
let currentFilter = "all";
let searchQuery = "";
let availableTags = [];
let selectedTags = [];

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

// Filter and render posts
function filterAndRenderPosts() {
  let filteredPosts = [...posts];

  // Apply search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredPosts = filteredPosts.filter(
      (post) =>
        post.title.toLowerCase().includes(query) ||
        post.content.toLowerCase().includes(query) ||
        post.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }

  // Apply category filter
  switch (currentFilter) {
    case "popular":
      filteredPosts.sort(
        (a, b) => (b.comment_count || 0) - (a.comment_count || 0)
      );
      break;
    case "recent":
      filteredPosts.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      break;
    case "my":
      filteredPosts = filteredPosts.filter((post) => post.is_author);
      break;
    default:
      // 'all' - no additional filtering needed
      break;
  }

  renderPosts(filteredPosts);
}

// Render posts to container
function renderPosts(postsToRender) {
  if (!postsToRender || postsToRender.length === 0) {
    postsGrid.innerHTML = `
            <div class="no-posts">
                <div class="empty-message">No posts found</div>
                <div class="empty-submessage">
                    ${
                      searchQuery
                        ? "Try different search terms or filters"
                        : "Be the first to share your thoughts!"
                    }
                </div>
            </div>`;
    return;
  }

  postsGrid.innerHTML = postsToRender
    .map(
      (post) => `
        <div class="post-card" data-post-id="${post.id}">
            <div class="author-info">
                ${
                  post.profile_pic
                    ? `
                    <img src="${post.profile_pic}" alt="${post.username}" class="author-avatar">
                `
                    : `
                    <div class="author-avatar">${
                      post.username ? post.username[0] : "A"
                    }</div>
                `
                }
                <div>
                    <div class="author-name">${
                      post.username || "Anonymous"
                    }</div>
                    <div class="post-timestamp">${formatRelativeTime(
                      post.created_at
                    )}</div>
                </div>
            </div>
            
            <h2 class="post-title">${post.title || "Untitled Post"}</h2>
            <p class="post-content">${post.content || "No content"}</p>
            
            <div class="post-meta">
                <span class="meta-item likes ${
                  post.liked ? "liked" : ""
                }" data-post-id="${post.id}">
                    <i class="fas fa-heart"></i>
                    ${post.likes || 0} likes
                </span>
                <span class="meta-item comments">
                    <i class="far fa-comment"></i>
                    ${post.comment_count || 0} comments
                </span>
            </div>
            
            ${
              post.tags && post.tags.length > 0
                ? `
                <div class="tags-list">
                    ${post.tags
                      .map(
                        (tag) => `
                        <span class="tag">${tag}</span>
                    `
                      )
                      .join("")}
                </div>
            `
                : ""
            }
        </div>
    `
    )
    .join("");

  // Add click handlers to post cards and like buttons
  document.querySelectorAll(".post-card").forEach((card) => {
    // Like button handler
    const likeBtn = card.querySelector(".meta-item.likes");
    if (likeBtn) {
      likeBtn.addEventListener("click", async (e) => {
        e.stopPropagation(); // Prevent post card click
        const postId = likeBtn.dataset.postId;
        try {
          const response = await fetch(`${API_URL}/posts/${postId}/like`, {
            method: "POST",
            credentials: "include",
          });

          if (!response.ok) throw new Error("Failed to like post");

          const data = await response.json();
          likeBtn.classList.toggle("liked");
          likeBtn.innerHTML = `
                        <i class="fas fa-heart"></i>
                        ${data.likes} likes
                    `;
        } catch (error) {
          console.error("Error liking post:", error);
          notify.error("Failed to like post");
        }
      });
    }

    // Post card click handler
    card.addEventListener("click", (e) => {
      if (!e.target.closest(".meta-item.likes")) {
        const postId = card.dataset.postId;
        window.location.href = `/src/pages/posts/post.html?id=${postId}`;
      }
    });
  });
}

// Load posts from server
async function loadPosts() {
  try {
    postsGrid.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading posts...</p>
            </div>`;

    const response = await fetch(`${API_URL}/posts`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch posts");
    }

    const data = await response.json();
    console.log("Server response:", data); // Debug log

    // Don't check if it's an array since the response might be empty
    posts = Array.isArray(data) ? data : [];

    if (posts.length === 0) {
      postsGrid.innerHTML = `
                <div class="no-posts">
                    <div class="empty-message">No posts yet</div>
                    <div class="empty-submessage">Be the first to share your thoughts!</div>
                </div>`;
      return;
    }

    filterAndRenderPosts();
  } catch (error) {
    console.error("Error loading posts:", error);
    notify.error("Failed to load posts");
    postsGrid.innerHTML = `
            <div class="no-posts">
                <div class="empty-message">Error loading posts</div>
                <div class="empty-submessage">Please try again later</div>
            </div>`;
  }
}

// Create new post
async function createPost(title, content, tagIds) {
  try {
    // Convert tagIds string to array of integers
    console.log("Raw tagIds:", tagIds);
    const tagIdList = tagIds
      .split(",")
      .filter((id) => id)
      .map((id) => parseInt(id));
    console.log("Processed tagIdList:", tagIdList);

    if (tagIdList.length === 0) {
      notify.error("Please add at least one tag");
      return;
    }

    const requestBody = {
      post_title: title,
      post_content: content,
      tag_ids: tagIdList,
    };
    console.log("Request body:", requestBody);

    const response = await fetch(`${API_URL}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create post");
    }

    const newPost = await response.json();
    console.log("Server response:", newPost);
    notify.success("Post created successfully");
    closeModal();

    // Add the new post to the posts array and re-render
    posts.unshift(newPost);
    filterAndRenderPosts();
  } catch (error) {
    console.error("Error creating post:", error);
    notify.error(error.message || "Failed to create post");
  }
}

// Modal functions
function openModal() {
  createPostModal.classList.add("active");
  document.body.style.overflow = "hidden";
  titleInput.focus();
}

function closeModal() {
  createPostModal.classList.remove("active");
  document.body.style.overflow = "";
  createPostForm.reset();
  updateCharCount(titleInput, titleCount);
  updateCharCount(contentInput, contentCount);
}

// Update character count
function updateCharCount(input, countElement) {
  const max = input.getAttribute("maxlength");
  const current = input.value.length;
  countElement.textContent = `${current}/${max}`;
}

// Event Listeners
createPostBtn.addEventListener("click", () => {
  openModal();
  initTagSelector(); // Reinitialize tags when opening modal
});
closeModalBtn.addEventListener("click", closeModal);

createPostModal.addEventListener("click", (e) => {
  if (e.target === createPostModal) {
    closeModal();
  }
});

titleInput.addEventListener("input", () =>
  updateCharCount(titleInput, titleCount)
);
contentInput.addEventListener("input", () =>
  updateCharCount(contentInput, contentCount)
);

// Search and filter handlers
searchInput.addEventListener(
  "input",
  debounce((e) => {
    searchQuery = e.target.value.trim();
    filterAndRenderPosts();
  }, 300)
);

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    filterAndRenderPosts();
  });
});

createPostForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const tags = tagsInput.value.trim();

  console.log("Form submission - title:", title);
  console.log("Form submission - content:", content);
  console.log("Form submission - tags:", tags);

  if (!title || !content) {
    notify.error("Please fill in all required fields");
    return;
  }

  await createPost(title, content, tags);
});

// Debounce helper function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Check authentication and load posts on page load
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch(`${API_URL}/me`, {
      credentials: "include",
    });

    if (!response.ok) {
      window.location.href = "/src/pages/auth/login.html";
      return;
    }

    loadPosts();
  } catch (error) {
    console.error("Error checking authentication:", error);
    window.location.href = "/src/pages/auth/login.html";
  }
});

// Initialize tag selector
async function initTagSelector() {
  try {
    // Clear any existing tags
    selectedTags = [];
    availableTags = [];
    updateSelectedTags();

    // Fetch available tags from the server
    const response = await fetch(`${API_URL}/tags`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch tags");
    }

    const tagsData = await response.json();
    console.log("Fetched tags:", tagsData);

    // Only use approved tags
    availableTags = tagsData
      .filter((tag) => tag.status === "approved" || !tag.status) // Include tags without status for backward compatibility
      .map((tag) => ({
        id: tag.id,
        name: tag.tag_name || tag.name, // Support both formats
        description: tag.description,
      }));

    console.log("Processed tags:", availableTags);

    // Populate dropdown with available tags
    updateTagDropdown();

    // Add event listeners
    tagSearch.addEventListener("focus", () => {
      tagDropdown.classList.add("active");
      filterTags(tagSearch.value);
    });

    tagSearch.addEventListener("input", (e) => {
      filterTags(e.target.value);
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".tag-selector")) {
        tagDropdown.classList.remove("active");
      }
    });

    // Handle tag selection
    tagDropdown.addEventListener("click", (e) => {
      const tagOption = e.target.closest(".tag-option");
      if (tagOption) {
        const tagId = parseInt(tagOption.dataset.tagId);
        const tag = availableTags.find((t) => t.id === tagId);
        if (tag) {
          addTag(tag);
          tagSearch.value = "";
          filterTags("");
        }
      }
    });
  } catch (error) {
    console.error("Error fetching tags:", error);
    notify.error("Failed to load tags");
  }
}

// Update tag dropdown with filtered tags
function updateTagDropdown(filteredTags = availableTags) {
  const selectedTagIds = selectedTags.map((t) => t.id);

  if (!filteredTags || filteredTags.length === 0) {
    tagDropdown.innerHTML =
      '<div class="tag-option" style="color: rgba(255,255,255,0.5)">No matching tags</div>';
    return;
  }

  tagDropdown.innerHTML =
    filteredTags
      .filter((tag) => !selectedTagIds.includes(tag.id))
      .map(
        (tag) => `
            <div class="tag-option" data-tag-id="${tag.id}" title="${
          tag.description || ""
        }">
                ${tag.name}
            </div>
        `
      )
      .join("") ||
    '<div class="tag-option" style="color: rgba(255,255,255,0.5)">No matching tags</div>';
}

// Filter tags based on search input
function filterTags(query) {
  const normalizedQuery = query.toLowerCase();
  const filteredTags = availableTags.filter((tag) =>
    tag.name.toLowerCase().includes(normalizedQuery)
  );
  updateTagDropdown(filteredTags);
}

// Add a tag to selection
function addTag(tag) {
  if (!selectedTags.find((t) => t.id === tag.id) && selectedTags.length < 5) {
    selectedTags.push(tag);
    updateSelectedTags();
  }
}

// Remove a tag from selection
function removeTag(tagId) {
  selectedTags = selectedTags.filter((t) => t.id !== tagId);
  updateSelectedTags();
  filterTags(tagSearch.value);
}

// Update selected tags display and hidden input
function updateSelectedTags() {
  console.log("Updating selected tags:", selectedTags);
  selectedTagsContainer.innerHTML = selectedTags
    .map(
      (tag) => `
        <span class="selected-tag">
            ${tag.name}
            <span class="remove-tag" data-tag-id="${tag.id}">&times;</span>
        </span>
    `
    )
    .join("");

  // Update the hidden input with the tag IDs
  postTagsInput.value = selectedTags.map((t) => t.id).join(",");
  console.log("Updated hidden input value:", postTagsInput.value);

  // Add event listeners for remove buttons
  selectedTagsContainer.querySelectorAll(".remove-tag").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeTag(parseInt(btn.dataset.tagId));
    });
  });
}
