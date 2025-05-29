// Notification types
export const NotificationType = {
    SUCCESS: 'success',
    ERROR: 'error',
    INFO: 'info',
    WARNING: 'warning'
};

// Icons for each type
const ICONS = {
    [NotificationType.SUCCESS]: '✓',
    [NotificationType.ERROR]: '✕',
    [NotificationType.INFO]: 'ℹ',
    [NotificationType.WARNING]: '⚠'
};

/**
 * Shows a notification message
 * @param {string} message - The message to display
 * @param {string} type - The type of notification (success, error, info, warning)
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
export function showNotification(message, type = NotificationType.INFO, duration = 3000) {
    // Create notification container if it doesn't exist
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Create icon
    const icon = document.createElement('span');
    icon.className = 'notification-icon';
    icon.textContent = ICONS[type];
    
    // Create text
    const text = document.createElement('span');
    text.className = 'notification-text';
    text.textContent = message;
    
    // Create progress bar
    const progress = document.createElement('div');
    progress.className = 'notification-progress';
    
    // Assemble notification
    notification.appendChild(icon);
    notification.appendChild(text);
    notification.appendChild(progress);
    
    // Add to container
    container.appendChild(notification);
    
    // Start animation
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });
    
    // Remove after duration
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
            // Remove container if empty
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    }, duration);
}

// Helper functions for common notifications
export const notify = {
    success: (message, duration) => showNotification(message, NotificationType.SUCCESS, duration),
    error: (message, duration) => showNotification(message, NotificationType.ERROR, duration),
    info: (message, duration) => showNotification(message, NotificationType.INFO, duration),
    warning: (message, duration) => showNotification(message, NotificationType.WARNING, duration)
}; 