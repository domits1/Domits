import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import NotificationBell from './NotificationBell';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notificationService';

jest.mock('../services/notificationService', () => ({
    fetchNotifications: jest.fn(),
    markNotificationRead: jest.fn(),
    markAllNotificationsRead: jest.fn(),
}));

const unread = (id, title) => ({ id, title, message: `${title} message`, created_at: 1000, read_at: null });
const read = (id, title) => ({ id, title, message: `${title} message`, created_at: 1000, read_at: 2000 });

const openBell = async () => {
    fireEvent.click(await screen.findByRole('button', { name: /notifications/i }));
};

describe('NotificationBell', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        fetchNotifications.mockResolvedValue({ notifications: [], unreadCount: 0 });
        markNotificationRead.mockResolvedValue({ updated: true });
        markAllNotificationsRead.mockResolvedValue({ updated: 2 });
    });

    it('shows how many notifications are unread on the bell', async () => {
        fetchNotifications.mockResolvedValue({ notifications: [unread('n-1', 'Task assigned')], unreadCount: 3 });

        render(<NotificationBell />);

        expect(await screen.findByRole('button', { name: 'Notifications, 3 unread' })).toBeInTheDocument();
    });

    it('shows no count when everything has been read', async () => {
        render(<NotificationBell />);

        expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    });

    it('lists the notifications when the bell is opened', async () => {
        fetchNotifications.mockResolvedValue({
            notifications: [unread('n-1', 'Task assigned'), read('n-2', 'Task completed')],
            unreadCount: 1,
        });
        render(<NotificationBell />);

        await openBell();

        expect(screen.getByText('Task assigned')).toBeInTheDocument();
        expect(screen.getByText('Task completed')).toBeInTheDocument();
    });

    it('says there is nothing yet when the list is empty', async () => {
        render(<NotificationBell />);

        await openBell();

        expect(screen.getByText('No notifications yet.')).toBeInTheDocument();
    });

    it('marks a notification as read when it is clicked, and lowers the count', async () => {
        fetchNotifications.mockResolvedValue({ notifications: [unread('n-1', 'Task assigned')], unreadCount: 1 });
        render(<NotificationBell />);
        await openBell();

        fireEvent.click(screen.getByRole('button', { name: /Task assigned/ }));

        await waitFor(() => expect(markNotificationRead).toHaveBeenCalledWith('n-1'));
        expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    });

    it('does not call the server again for a notification that is already read', async () => {
        fetchNotifications.mockResolvedValue({ notifications: [read('n-2', 'Task completed')], unreadCount: 0 });
        render(<NotificationBell />);
        await openBell();

        fireEvent.click(screen.getByRole('button', { name: /Task completed/ }));

        expect(markNotificationRead).not.toHaveBeenCalled();
    });

    it('marks everything as read with one click', async () => {
        fetchNotifications.mockResolvedValue({
            notifications: [unread('n-1', 'Task assigned'), unread('n-2', 'Task overdue')],
            unreadCount: 2,
        });
        render(<NotificationBell />);
        await openBell();

        fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));

        await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalledTimes(1));
        expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    });

    it('disables "Mark all as read" when nothing is unread', async () => {
        fetchNotifications.mockResolvedValue({ notifications: [read('n-2', 'Task completed')], unreadCount: 0 });
        render(<NotificationBell />);
        await openBell();

        expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled();
    });

    it('tells the user when the notifications cannot be loaded, and lets them try again', async () => {
        fetchNotifications.mockRejectedValueOnce(new Error('Failed to load notifications: 500'));
        render(<NotificationBell />);
        await openBell();

        expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load your notifications");

        fetchNotifications.mockResolvedValueOnce({ notifications: [unread('n-1', 'Task assigned')], unreadCount: 1 });
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

        expect(await screen.findByText('Task assigned')).toBeInTheDocument();
    });

    it('tells the user when marking as read fails, and keeps the notification unread', async () => {
        fetchNotifications.mockResolvedValue({ notifications: [unread('n-1', 'Task assigned')], unreadCount: 1 });
        markNotificationRead.mockRejectedValue(new Error('Failed to mark the notification as read: 500'));
        render(<NotificationBell />);
        await openBell();

        fireEvent.click(screen.getByRole('button', { name: /Task assigned/ }));

        expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't mark it as read");
        expect(screen.getByRole('button', { name: 'Notifications, 1 unread' })).toBeInTheDocument();
    });

    it('checks for new notifications every minute and stops when it goes away', async () => {
        jest.useFakeTimers();
        const { unmount } = render(<NotificationBell />);
        await act(async () => {});
        expect(fetchNotifications).toHaveBeenCalledTimes(1);

        await act(async () => {
            jest.advanceTimersByTime(60000);
        });
        expect(fetchNotifications).toHaveBeenCalledTimes(2);

        unmount();
        await act(async () => {
            jest.advanceTimersByTime(120000);
        });
        expect(fetchNotifications).toHaveBeenCalledTimes(2);
        jest.useRealTimers();
    });
});
