import { notify } from '../../utils/notification.js';

const API_URL = 'http://localhost:8080';

// DOM Elements
const accountContainer = document.querySelector('.account-container');
const usernameElement = document.querySelector('.username');
const bioElement = document.querySelector('.bio');
const roleBadgeElement = document.querySelector('.role-badge');
const karmaCountElement = document.querySelector('.karma-count');
const profilePictureElement = document.querySelector('.profile-picture span');
const postsContainer = document.getElementById('postsContainer');
const commentsContainer = document.getElementById('commentsContainer');

// Account action buttons
const editProfileBtn = document.getElementById('editProfileBtn');
const changePasswordBtn = document.getElementById('changePasswordBtn');
const privacySettingsBtn = document.getElementById('privacySettingsBtn');
const deleteAccountBtn = document.getElementById('deleteAccountBtn');

// Get user ID from URL or default to logged-in user
const urlParams = new URLSearchParams(window.location.search);
const targetUserId = urlParams.get('id');

// Format date to relative time
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Get initials from username
function getInitials(username) {
    return username
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

// Handle account management actions
function setupAccountActions() {
    editProfileBtn.addEventListener('click', async () => {
        const newBio = prompt('Enter your new bio:', bioElement.textContent);
        if (newBio !== null) {
            try {
                const response = await fetch(`${API_URL}/users/${window.userId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ bio: newBio })
                });

                if (!response.ok) {
                    throw new Error('Failed to update profile');
                }

                const updatedUser = await response.json();
                bioElement.textContent = updatedUser.bio;
                notify.success('Profile updated successfully');
            } catch (error) {
                console.error('Error updating profile:', error);
                notify.error('Failed to update profile');
            }
        }
    });

    changePasswordBtn.addEventListener('click', async () => {
        const currentPassword = prompt('Enter your current password:');
        if (!currentPassword) return;

        const newPassword = prompt('Enter your new password:');
        if (!newPassword) return;

        const confirmPassword = prompt('Confirm your new password:');
        if (newPassword !== confirmPassword) {
            notify.error('Passwords do not match');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/users/${window.userId}/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ currentPassword, newPassword })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to change password');
            }

            notify.success('Password changed successfully');
        } catch (error) {
            console.error('Error changing password:', error);
            notify.error(error.message);
        }
    });

    privacySettingsBtn.addEventListener('click', () => {
        notify.info('Privacy settings feature coming soon!');
    });

    deleteAccountBtn.addEventListener('click', async () => {
        const confirmed = confirm(
            'Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data.'
        );
        
        if (confirmed) {
            const doubleConfirmed = confirm(
                'Please confirm again that you want to delete your account permanently.'
            );
            
            if (doubleConfirmed) {
                try {
                    const response = await fetch(`${API_URL}/users/${window.userId}`, {
                        method: 'DELETE',
                        credentials: 'include'
                    });

                    if (!response.ok) {
                        throw new Error('Failed to delete account');
                    }

                    notify.success('Account deleted successfully');
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 2000);
                } catch (error) {
                    console.error('Error deleting account:', error);
                    notify.error('Failed to delete account');
                }
            }
        }
    });
}

// Show user not found state
function showUserNotFound() {
    document.title = 'Opinia - User Not Found';
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
            credentials: 'include'
        });

        let loggedInUserId = null;
        if (meResponse.ok) {
            const { user } = await meResponse.json();
            loggedInUserId = user.id;
        }

        // Determine which user to load
        const userToLoad = targetUserId || loggedInUserId;
        
        if (!userToLoad) {
            throw new Error('Not logged in');
        }

        // Get user details including role
        const [userDetailsResponse, roleResponse] = await Promise.all([
            fetch(`${API_URL}/users/${userToLoad}`, { credentials: 'include' }),
            fetch(`${API_URL}/users/${userToLoad}/role`, { credentials: 'include' })
        ]);

        if (userDetailsResponse.status === 404 || roleResponse.status === 404) {
            showUserNotFound();
            return;
        }

        if (!userDetailsResponse.ok || !roleResponse.ok) {
            throw new Error('Failed to fetch user details');
        }

        const userDetails = await userDetailsResponse.json();
        const { role_name } = await roleResponse.json();

        // Update UI with user data
        document.title = `Opinia - ${userDetails.username}'s Profile`;
        usernameElement.textContent = userDetails.username;
        bioElement.textContent = userDetails.bio || 'No bio yet';
        
        // Set up profile picture with initials
        profilePictureElement.textContent = getInitials(userDetails.username);
        
        // Set up role badge with animation
        roleBadgeElement.textContent = role_name;
        roleBadgeElement.className = `role-badge ${role_name.toLowerCase()}`;

        // Set up karma badge
        karmaCountElement.textContent = userDetails.karma || 0;

        // Show/hide account management for profile owner
        const isOwner = loggedInUserId === parseInt(userToLoad);
        accountContainer.dataset.isOwner = isOwner;

        if (isOwner) {
            setupAccountActions();
        }

        // Load user's content
        await Promise.all([
            loadUserPosts(userToLoad),
            loadUserComments(userToLoad)
        ]);

    } catch (error) {
        console.error('Error loading user data:', error);
        if (error.message === 'Not logged in' && !targetUserId) {
            notify.error('Please log in to view your profile');
            window.location.href = '/login.html';
        } else {
            notify.error('Failed to load user data');
        }
    }
}

// Load user's posts
async function loadUserPosts(userId) {
    try {
        const response = await fetch(`${API_URL}/users/${userId}/posts`, {
            credentials: 'include'
        });

        if (response.status === 404) {
            return; // User not found, but we've already shown the message
        }

        if (!response.ok) {
            throw new Error('Failed to fetch posts');
        }

        const posts = await response.json();
        
        if (posts.length === 0) {
            postsContainer.innerHTML = `
                <div class="no-content">
                    <div class="empty-icon">📝</div>
                    <div class="empty-message">No posts yet</div>
                    <div class="empty-submessage">
                        ${userId === window.userId ? 
                            'Share your thoughts with the community!' : 
                            'This user hasn\'t posted anything yet.'}
                    </div>
                </div>`;
            return;
        }

        postsContainer.innerHTML = posts.map(post => `
            <div class="post-item">
                <h3 class="post-title">${post.title}</h3>
                <p class="post-content">${post.content}</p>
                <div class="post-meta">
                    <span class="meta-item date">${formatRelativeTime(post.created_at)}</span>
                    <span class="meta-item comments">${post.comment_count || 0} comments</span>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading posts:', error);
        notify.error('Failed to load posts');
    }
}

// Load user's comments
async function loadUserComments(userId) {
    try {
        const response = await fetch(`${API_URL}/users/${userId}/comments`, {
            credentials: 'include'
        });

        if (response.status === 404) {
            return; // User not found, but we've already shown the message
        }

        if (!response.ok) {
            throw new Error('Failed to fetch comments');
        }

        const comments = await response.json();
        
        if (comments.length === 0) {
            commentsContainer.innerHTML = `
                <div class="no-content">
                    <div class="empty-icon">💬</div>
                    <div class="empty-message">No comments yet</div>
                    <div class="empty-submessage">
                        ${userId === window.userId ? 
                            'Join the conversation by commenting on posts!' : 
                            'This user hasn\'t commented on anything yet.'}
                    </div>
                </div>`;
            return;
        }

        commentsContainer.innerHTML = comments.map(comment => `
            <div class="comment-item">
                <p class="comment-content">${comment.content}</p>
                <div class="comment-meta">
                    <span class="meta-item date">${formatRelativeTime(comment.created_at)}</span>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading comments:', error);
        notify.error('Failed to load comments');
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', loadUserData); 