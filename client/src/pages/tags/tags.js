// DOM Elements
const tagForm = document.getElementById('tagForm');
const tagsList = document.getElementById('tagslist');
const tagNameInput = document.getElementById('tagName');
const tagDescriptionInput = document.getElementById('tagDescription');

const API_URL = 'http://localhost:8080';

// Load existing tags
async function loadTags() {
    try {
        const response = await fetch(`${API_URL}/tags`);
        if (!response.ok) throw new Error('Failed to fetch tags');
        
        const tags = await response.json();

        // Clear existing tags
        tagsList.innerHTML = '';

        // Add tags to the list
        tags.forEach(tag => {
            const tagElement = document.createElement('div');
            tagElement.className = 'tag-item';
            tagElement.innerHTML = `
                <h4>${tag.tag_name}</h4>
                <p>${tag.description || ''}</p>
            `;
            tagsList.appendChild(tagElement);
        });
    } catch (error) {
        console.error('Error loading tags:', error.message);
    }
}

tagForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const tagName = tagNameInput.value.trim();
    const description = tagDescriptionInput.value.trim();

    if (!tagName) {
        alert('Please enter a tag name');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/tags`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
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

        loadTags();

    } catch (error) {
        console.error('Error creating tag:', error.message);
        alert(error.message);
    }
});

document.addEventListener('DOMContentLoaded', loadTags); 