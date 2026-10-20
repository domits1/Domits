import { TASKS_API_URL, getHeaders } from '../../services/taskService';

// Notifications belong to the signed-in person, so none of these calls pass a host id.

export const fetchNotifications = async () => {
    const response = await fetch(`${TASKS_API_URL}?action=notifications`, { method: 'GET', headers: getHeaders() });
    if (!response.ok) throw new Error(`Failed to load notifications: ${response.status}`);
    return await response.json();
};

export const markNotificationRead = async (notificationId) => {
    const params = new URLSearchParams({ action: 'notification-read', id: notificationId });
    const response = await fetch(`${TASKS_API_URL}?${params}`, { method: 'PATCH', headers: getHeaders() });
    if (!response.ok) throw new Error(`Failed to mark the notification as read: ${response.status}`);
    return await response.json();
};

export const markAllNotificationsRead = async () => {
    const response = await fetch(`${TASKS_API_URL}?action=notifications-read-all`, { method: 'PATCH', headers: getHeaders() });
    if (!response.ok) throw new Error(`Failed to mark the notifications as read: ${response.status}`);
    return await response.json();
};
