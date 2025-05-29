import { notify } from '../../utils/notification.js';

const API_URL = 'http://localhost:8080';
const signupForm = document.getElementById('signupForm');

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!username || !email || !password) {
        notify.warning('Please fill in all fields');
        return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        notify.warning('Please enter a valid email address');
        return;
    }

    // Basic password validation
    if (password.length < 6) {
        notify.warning('Password must be at least 6 characters long');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Signup failed');
        }

        notify.success('Account created successfully');
        
        // Redirect after a short delay to show the success message
        setTimeout(() => {
            window.location.href = '../login/login.html';
        }, 1500);

    } catch (error) {
        console.error('Signup error:', error);
        notify.error(error.message || 'Failed to create account');
    }
}); 