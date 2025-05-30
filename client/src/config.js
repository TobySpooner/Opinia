const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const API_URL = isDevelopment 
  ? 'http://localhost:8080'  // Development API URL
  : 'https://opinia-1z72.onrender.com';  // Production API URL

export const API_CONFIG = {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
}; 