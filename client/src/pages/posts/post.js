import { notify } from "../../utils/notification.js";
import { API_URL, API_CONFIG } from "../../config.js";

// Get post ID from URL and make it accessible to all functions
const urlParams = new URLSearchParams(window.location.search);
const postId = parseInt(urlParams.get("id"), 10);

// Validate post ID
if (!postId || isNaN(postId)) {
  window.location.href = "/src/pages/posts/posts.html";
}

// DOM Elements
const postContent = document.getElementById("postContent");
const commentForm = document.getElementById("commentForm");
const commentInput = document.getElementById("commentInput");
const commentsList = document.getElementById("commentsList");
const charCount = document.querySelector(".char-count");

// Format date to relative time
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 30) return "just now";
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks}w ago`;
  }

  if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30);
    return `${months}mo ago`;
  }

  const years = Math.floor(diffInDays / 365);
  return `${years}y ago`;
}

// Load post and comments
async function loadPost() {
  try {
    console.log("Fetching post:", postId);
    const response = await fetch(`${API_URL}/posts/${postId}`, {
      ...API_CONFIG
    });

    console.log("Response status:", response.status);

    if (response.status === 404) {
      console.log("Post not found");
      postContent.innerHTML = `
                <div class="error-container">
                    <h2>Post Not Found</h2>
                    <p>The post you're looking for doesn't exist or has been removed.</p>
                    <a href="/src/pages/posts/posts.html" class="btn">Return to Posts</a>
                </div>
            `;
      return;
    }

    if (!response.ok) {
      console.log("Response not ok:", response.statusText);
      throw new Error("Failed to fetch post");
    }

    const post = await response.json();
    console.log("Received post:", post);
    document.title = `Opinia - ${post.post_title}`;

    postContent.innerHTML = `
            <div class="post-container">
                <div class="post-header">
                    <div class="author-info">
                        ${
                          post.profile_pic
                            ? `
                            <img src="${post.profile_pic}" alt="${post.username}" class="author-avatar">
                        `
                            : `
                            <div class="author-avatar">${
                              post.username
                                ? post.username[0].toUpperCase()
                                : "A"
                            }</div>
                        `
                        }
                        <div class="author-details">
                            <div class="author-name">${
                              post.username || "Anonymous"
                            }</div>
                            <div class="post-metadata">
                                <span class="post-timestamp">${formatRelativeTime(
                                  post.created_at
                                )}</span>
                                ${
                                  post.edited
                                    ? '<span class="post-edited">(edited)</span>'
                                    : ""
                                }
                            </div>
                        </div>
                    </div>
                    <h1 class="post-title">${post.post_title}</h1>
                    ${
                      post.tags && post.tags.length > 0
                        ? `
                        <div class="tags-list">
                            ${post.tags
                              .map(
                                (tag) => `
                                <span class="tag">
                                    <i class="fas fa-tag"></i>
                                    ${tag}
                                </span>
                            `
                              )
                              .join("")}
                        </div>
                    `
                        : ""
                    }
                </div>
                
                <div class="post-content">
                    <div class="post-content-text">${post.post_content}</div>
                </div>

                <div class="post-interactions">
                    <div class="interaction-buttons">
                        <button class="interaction-btn like-btn ${
                          post.liked ? "liked" : ""
                        }" data-post-id="${post.post_id}">
                            <i class="fas fa-heart"></i>
                            <span class="like-count">${
                              post.post_likes || 0
                            }</span>
                            <span class="btn-label">Like</span>
                        </button>
                        <button class="interaction-btn comment-btn">
                            <i class="far fa-comment"></i>
                            <span class="comment-count">${
                              post.comment_count || 0
                            }</span>
                            <span class="btn-label">Comment</span>
                        </button>
                        <button class="interaction-btn share-btn">
                            <i class="fas fa-share"></i>
                            <span class="btn-label">Share</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

    // Add like button handler
    const likeBtn = postContent.querySelector(".like-btn");
    if (likeBtn) {
      likeBtn.addEventListener("click", async () => {
        try {
          const response = await fetch(
            `${API_URL}/posts/${post.post_id}/like`,
            {
              method: "POST",
              ...API_CONFIG
            }
          );

          if (!response.ok) throw new Error("Failed to like post");

          const data = await response.json();
          likeBtn.classList.toggle("liked");
          const likeCount = likeBtn.querySelector(".like-count");
          if (likeCount) {
            likeCount.textContent = data.likes;
          }
        } catch (error) {
          console.error("Error liking post:", error);
          notify.error("Failed to like post");
        }
      });
    }

    // Add comment button handler
    const commentBtn = postContent.querySelector(".comment-btn");
    if (commentBtn) {
      commentBtn.addEventListener("click", () => {
        if (commentInput) {
          commentInput.focus();
        }
      });
    }

    // Add share button handler
    const shareBtn = postContent.querySelector(".share-btn");
    if (shareBtn) {
      shareBtn.addEventListener("click", () => {
        const url = window.location.href;
        navigator.clipboard
          .writeText(url)
          .then(() => notify.success("Link copied to clipboard!"))
          .catch(() => notify.error("Failed to copy link"));
      });
    }

    // Load comments after post is loaded
    loadComments();
  } catch (error) {
    console.error("Error loading post:", error);
    notify.error("Failed to load post");
    setTimeout(() => {
      window.location.href = "/src/pages/posts/posts.html";
    }, 2000);
  }
}

// Load comments
async function loadComments() {
  const commentsList = document.getElementById("commentsList");
  if (!commentsList) return;

  try {
    commentsList.innerHTML = `
            <div class="loading-comments">
                <div class="spinner"></div>
                <p>Loading comments...</p>
            </div>
        `;

    const response = await fetch(`${API_URL}/posts/${postId}/comments`, {
      ...API_CONFIG
    });

    if (!response.ok) throw new Error("Failed to load comments");

    const comments = await response.json();

    if (comments.length === 0) {
      commentsList.innerHTML = `
                <div class="no-comments">
                    <p>No comments yet. Be the first to share your thoughts!</p>
                </div>
            `;
      return;
    }

    commentsList.innerHTML = comments
      .map(
        (comment) => `
            <div class="comment">
                <div class="comment-header">
                    <div class="comment-author">
                        ${
                          comment.profile_pic
                            ? `
                            <img src="${comment.profile_pic}" alt="${comment.username}" class="comment-avatar">
                        `
                            : `
                            <div class="comment-avatar">${
                              comment.username
                                ? comment.username[0].toUpperCase()
                                : "A"
                            }</div>
                        `
                        }
                        <div>
                            <div class="comment-username">${
                              comment.username || "Anonymous"
                            }</div>
                            <div class="comment-timestamp">${formatRelativeTime(
                              comment.created_at
                            )}</div>
                        </div>
                    </div>
                </div>
                <div class="comment-content">${comment.content}</div>
                <div class="comment-actions">
                    <button class="comment-like-btn ${
                      comment.liked ? "liked" : ""
                    }" data-comment-id="${comment.id}">
                        <i class="fas fa-heart"></i>
                        <span class="comment-like-count">${
                          comment.likes || 0
                        }</span>
                    </button>
                </div>
            </div>
        `
      )
      .join("");

    // Add comment like handlers
    document.querySelectorAll(".comment-like-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const commentId = btn.dataset.commentId;
          const response = await fetch(
            `${API_URL}/comments/${commentId}/like`,
            {
              method: "POST",
              ...API_CONFIG
            }
          );

          if (!response.ok) throw new Error("Failed to like comment");

          const data = await response.json();
          btn.classList.toggle("liked");
          const likeCount = btn.querySelector(".comment-like-count");
          if (likeCount) {
            likeCount.textContent = data.likes;
          }
        } catch (error) {
          console.error("Error liking comment:", error);
          notify.error("Failed to like comment");
        }
      });
    });
  } catch (error) {
    console.error("Error loading comments:", error);
    commentsList.innerHTML = `
            <div class="error-message">
                <p>Failed to load comments. Please try again later.</p>
            </div>
        `;
  }
}

// Handle comment form submission
if (commentForm && commentInput) {
  // Add character count
  commentInput.addEventListener("input", () => {
    const charCount = document.querySelector(".char-count");
    if (charCount) {
      const count = commentInput.value.length;
      const max = commentInput.getAttribute("maxlength");
      charCount.textContent = `${count}/${max}`;
    }
  });

  commentForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = commentForm.querySelector(".submit-btn");
    if (submitBtn) {
      submitBtn.disabled = true;
    }

    try {
      const response = await fetch(`${API_URL}/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        ...API_CONFIG,
        body: JSON.stringify({ content: commentInput.value.trim() }),
      });

      if (!response.ok) throw new Error("Failed to post comment");

      notify.success("Comment posted successfully");
      commentForm.reset();

      // Update character count
      const charCount = document.querySelector(".char-count");
      if (charCount) {
        charCount.textContent = `0/${commentInput.getAttribute("maxlength")}`;
      }

      // Reload comments to show the new comment
      loadComments();
    } catch (error) {
      console.error("Error posting comment:", error);
      notify.error("Failed to post comment");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
      }
    }
  });
}

// Check authentication and load post on page load
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch(`${API_URL}/me`, {
      ...API_CONFIG
    });

    if (!response.ok) {
      window.location.href = "/src/pages/auth/login.html";
      return;
    }

    loadPost();
  } catch (error) {
    console.error("Error checking authentication:", error);
    window.location.href = "/src/pages/auth/login.html";
  }
});

// Add comment
async function addComment(content) {
  try {
    const response = await fetch(`${API_URL}/posts/${postId}/comments`, {
      method: "POST",
      ...API_CONFIG,
      body: JSON.stringify({ content }),
    });

    if (!response.ok) throw new Error("Failed to add comment");

    notify.success("Comment added successfully");
    return true;
  } catch (error) {
    console.error("Error adding comment:", error);
    notify.error("Failed to add comment");
    return false;
  }
}

// Delete comment
async function deleteComment(commentId) {
  try {
    const response = await fetch(
      `${API_URL}/posts/${postId}/comments/${commentId}`,
      {
        method: "DELETE",
        ...API_CONFIG
      }
    );

    if (!response.ok) throw new Error("Failed to delete comment");

    notify.success("Comment deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting comment:", error);
    notify.error("Failed to delete comment");
    return false;
  }
}

// Edit comment
async function editComment(commentId, content) {
  try {
    const response = await fetch(
      `${API_URL}/posts/${postId}/comments/${commentId}`,
      {
        method: "PUT",
        ...API_CONFIG,
        body: JSON.stringify({ content }),
      }
    );

    if (!response.ok) throw new Error("Failed to edit comment");

    notify.success("Comment edited successfully");
    return true;
  } catch (error) {
    console.error("Error editing comment:", error);
    notify.error("Failed to edit comment");
    return false;
  }
}
