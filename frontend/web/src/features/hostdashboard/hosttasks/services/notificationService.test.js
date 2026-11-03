import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from './notificationService';

jest.mock('../../services/taskService', () => ({
    TASKS_API_URL: 'https://tasks.example.com/default',
    getHeaders: () => ({ Authorization: 'token-1' }),
}));

const okResponse = (body) => ({ ok: true, status: 200, json: async () => body });

describe('notificationService', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
    });

    describe('fetchNotifications', () => {
        it('loads the signed-in person\'s notifications and the unread count', async () => {
            global.fetch.mockResolvedValue(okResponse({ notifications: [{ id: 'n-1' }], unreadCount: 1 }));

            await expect(fetchNotifications()).resolves.toEqual({ notifications: [{ id: 'n-1' }], unreadCount: 1 });

            expect(global.fetch).toHaveBeenCalledWith(
                'https://tasks.example.com/default?action=notifications',
                { method: 'GET', headers: { Authorization: 'token-1' } }
            );
        });

        it('throws when the request fails, so the caller can show an error', async () => {
            global.fetch.mockResolvedValue({ ok: false, status: 500 });

            await expect(fetchNotifications()).rejects.toThrow('Failed to load notifications: 500');
        });

        it.each([
            ['a task list, as an API without this endpoint answers', [{ id: 'task-1' }]],
            ['an object without notifications', { message: 'ok' }],
            ['nothing at all', null],
        ])('throws when the request succeeds but the answer is %s, so the bell shows an error and not a crash', async (_label, body) => {
            global.fetch.mockResolvedValue(okResponse(body));

            await expect(fetchNotifications()).rejects.toThrow('Failed to load notifications: unexpected answer');
        });
    });

    describe('markNotificationRead', () => {
        it('marks one notification as read', async () => {
            global.fetch.mockResolvedValue(okResponse({ updated: true }));

            await expect(markNotificationRead('assigned:task-1:user-1:2000')).resolves.toEqual({ updated: true });

            expect(global.fetch).toHaveBeenCalledWith(
                'https://tasks.example.com/default?action=notification-read&id=assigned%3Atask-1%3Auser-1%3A2000',
                { method: 'PATCH', headers: { Authorization: 'token-1' } }
            );
        });

        it('throws when the request fails', async () => {
            global.fetch.mockResolvedValue({ ok: false, status: 400 });

            await expect(markNotificationRead('n-1')).rejects.toThrow('Failed to mark the notification as read: 400');
        });
    });

    describe('markAllNotificationsRead', () => {
        it('marks every notification as read', async () => {
            global.fetch.mockResolvedValue(okResponse({ updated: 3 }));

            await expect(markAllNotificationsRead()).resolves.toEqual({ updated: 3 });

            expect(global.fetch).toHaveBeenCalledWith(
                'https://tasks.example.com/default?action=notifications-read-all',
                { method: 'PATCH', headers: { Authorization: 'token-1' } }
            );
        });

        it('throws when the request fails', async () => {
            global.fetch.mockResolvedValue({ ok: false, status: 500 });

            await expect(markAllNotificationsRead()).rejects.toThrow('Failed to mark the notifications as read: 500');
        });
    });
});
