import React, { useCallback, useEffect, useState } from 'react';
import { LuBell } from 'react-icons/lu';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notificationService';

const POLL_INTERVAL_MS = 60000;

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const load = useCallback(async () => {
        try {
            const data = await fetchNotifications();
            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount);
            setErrorMessage('');
        } catch {
            setErrorMessage("Couldn't load your notifications.");
        }
    }, []);

    useEffect(() => {
        load();
        const timer = setInterval(load, POLL_INTERVAL_MS);
        return () => clearInterval(timer);
    }, [load]);

    const handleOpenNotification = async (notification) => {
        if (notification.read_at) return;
        try {
            await markNotificationRead(notification.id);
            setNotifications(prev => prev.map(item => (item.id === notification.id ? { ...item, read_at: Date.now() } : item)));
            setUnreadCount(prev => Math.max(0, prev - 1));
            setErrorMessage('');
        } catch {
            setErrorMessage("Couldn't mark it as read.");
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsRead();
            setNotifications(prev => prev.map(item => (item.read_at ? item : { ...item, read_at: Date.now() })));
            setUnreadCount(0);
            setErrorMessage('');
        } catch {
            setErrorMessage("Couldn't mark them as read.");
        }
    };

    const bellLabel = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications';
    const hasNothingToShow = notifications.length === 0 && !errorMessage;

    return (
        <div className="notification-bell">
            <button
                type="button"
                className="notification-bell-button"
                aria-label={bellLabel}
                aria-expanded={isOpen}
                onClick={() => setIsOpen(open => !open)}
            >
                <LuBell aria-hidden="true" />
                {unreadCount > 0 && (
                    <span className="notification-bell-badge" aria-hidden="true">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <section className="notification-panel" aria-label="Your notifications">
                    <div className="notification-panel-header">
                        <h3>Notifications</h3>
                        <button
                            type="button"
                            className="notification-mark-all"
                            onClick={handleMarkAllRead}
                            disabled={unreadCount === 0}
                        >
                            Mark all as read
                        </button>
                    </div>

                    {errorMessage && (
                        <div className="notification-error" role="alert">
                            <span>{errorMessage}</span>
                            <button type="button" onClick={load}>Try again</button>
                        </div>
                    )}

                    {hasNothingToShow && <p className="notification-empty">No notifications yet.</p>}

                    <ul className="notification-list">
                        {notifications.map(notification => (
                            <li key={notification.id}>
                                <button
                                    type="button"
                                    className={`notification-item ${notification.read_at ? '' : 'unread'}`}
                                    onClick={() => handleOpenNotification(notification)}
                                >
                                    {!notification.read_at && <span className="notification-hidden-text">Unread. </span>}
                                    <span className="notification-title">{notification.title}</span>
                                    <span className="notification-message">{notification.message}</span>
                                    <span className="notification-time">{new Date(notification.created_at).toLocaleString()}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
};

export default NotificationBell;
