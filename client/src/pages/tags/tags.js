import { notify } from '../../utils/notification.js';

// DOM Elements
const tagForm = document.getElementById('tagForm');
const tagsList = document.getElementById('tagslist');
const tagNameInput = document.getElementById('tagName');
const tagDescriptionInput = document.getElementById('tagDescription');

const API_URL = 'http://localhost:8080';

// Check if user is admin
async function checkIsAdmin() {
    try {
        // First check if user is logged in
        const response = await fetch(`${API_URL}/me`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            console.log('Not logged in or session expired');
            return false;
        }
        
        const userData = await response.json();
        if (!userData.user || !userData.user.id) {
            console.log('Invalid user data received');
            return false;
        }

        // Then check user's role
        const roleResponse = await fetch(`${API_URL}/users/${userData.user.id}/role`, {
            credentials: 'include'
        });

        if (!roleResponse.ok) {
            const error = await roleResponse.json();
            console.log('Role check failed:', error.error || 'Unknown error');
            return false;
        }
        
        const roleData = await roleResponse.json();
        console.log('User role data:', roleData);
        return roleData.role_name === 'Administrator';
    } catch (error) {
        console.error('Error in admin check:', error);
        return false;
    }
}

// Load existing tags
async function loadTags() {
    try {
        const isAdmin = await checkIsAdmin();
        console.log('Is admin:', isAdmin);
        
        tagsList.innerHTML = '';

        const response = await fetch(`${API_URL}/tags?includePending=true`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch tags');
        }
        
        const tags = await response.json();
        console.log('Fetched tags:', tags);

        if (tags.length === 0) {
            tagsList.innerHTML = `
                <div class="no-tags">
                    <span>No tags found</span>
                    <span>Create a new tag to get started</span>
                </div>`;
            return;
        }

        // Sort tags: approved first, then pending
        const sortedTags = tags.sort((a, b) => {
            if (a.status === b.status) {
                return new Date(b.created_at) - new Date(a.created_at);
            }
            return a.status === 'approved' ? -1 : 1;
        });

        // Use Promise.all to wait for all tag elements to be created
        const tagElements = await Promise.all(
            sortedTags.map(tag => createTagElement(tag, tag.status === 'pending'))
        );
        
        tagElements.forEach(element => {
            if (element) tagsList.appendChild(element);
        });
    } catch (error) {
        console.error('Error loading tags:', error);
        notify.error(error.message || 'Failed to load tags');
    }
}

// Create a tag element
async function createTagElement(tag, isPending) {
    const isAdmin = await checkIsAdmin();
    const tagElement = document.createElement('div');
    tagElement.className = `tag-item ${isPending ? 'pending' : ''}`;
    
    const createdDate = new Date(tag.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    let html = `
        <div class="tag-header">
            <div class="tag-title-container">
                <h4 class="tag-title">${tag.name}</h4>
                ${isPending ? '<span class="tag-status">Pending Approval</span>' : 
                            '<span class="tag-status approved">Approved</span>'}
            </div>
            ${isAdmin ? `
                <div class="tag-actions">
                    ${isPending ? `
                        <button onclick="rejectTag(${tag.id})" class="tag-btn reject-btn">Reject</button>
                        <button onclick="approveTag(${tag.id})" class="tag-btn approve-btn">Approve</button>
                    ` : `
                        <button onclick="deleteTag(${tag.id})" class="tag-btn delete-btn">Delete</button>
                    `}
                </div>
            ` : ''}
        </div>
        <p class="tag-description">${tag.description || 'No description provided.'}</p>
        <div class="tag-meta">
            <div class="tag-info">
                <span class="tag-date">Created ${createdDate}</span>
                <span class="tag-creator">by ${tag.created_by || 'Unknown'}</span>
            </div>
            ${!isPending && tag.approved_by ? `
                <div class="tag-approved-by">
                    <span>Approved by ${tag.approved_by}</span>
                </div>
            ` : ''}
        </div>
    `;

    tagElement.innerHTML = html;
    return tagElement;
}

// Handle form submission
tagForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const tagName = tagNameInput.value.trim();
    const description = tagDescriptionInput.value.trim();

    if (!tagName) {
        notify.warning('Please enter a tag name');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/tags`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                tag_name: tagName,
                description: description
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create tag');
        }

        tagNameInput.value = '';
        tagDescriptionInput.value = '';
        notify.success('Tag submitted for approval');
        loadTags();

    } catch (error) {
        console.error('Error creating tag:', error);
        notify.error(error.message);
    }
});

// Make functions globally available
window.approveTag = async function(tagId) {
    try {
        const response = await fetch(`${API_URL}/tags/${tagId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ status: 'approved' })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to approve tag');
        }
        
        notify.success('Tag approved successfully');
        loadTags();
    } catch (error) {
        console.error('Error approving tag:', error);
        notify.error(error.message);
    }
};

window.rejectTag = async function(tagId) {
    try {
        const response = await fetch(`${API_URL}/tags/${tagId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ status: 'rejected' })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to reject tag');
        }

        notify.info('Tag rejected');
        loadTags();
    } catch (error) {
        console.error('Error rejecting tag:', error);
        notify.error(error.message);
    }
};

window.deleteTag = async function(tagId) {
    if (!confirm('Are you sure you want to delete this tag? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/tags/${tagId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete tag');
        }

        notify.success('Tag deleted successfully');
        loadTags();
    } catch (error) {
        console.error('Error deleting tag:', error);
        notify.error(error.message);
    }
};

// Initial load of tags
document.addEventListener('DOMContentLoaded', loadTags); 